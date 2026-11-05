const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database', 'students.json');
const PHOTOS_DIR = path.join(__dirname, 'database', 'student_photos');
const ATTENDANCE_FILE = path.join(__dirname, 'database', 'attendance.json');
const CONFIG_FILE = path.join(__dirname, 'database', 'config.json');

[path.join(__dirname, 'database'), PHOTOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ATTENDANCE_FILE)) {
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ adminPassword: process.env.ADMIN_PASSWORD || 'admin123' }, null, 2));
}

function getAdminPassword() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config.adminPassword || 'admin123';
  } catch (e) {
    return 'admin123';
  }
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return file === ATTENDANCE_FILE ? {} : [];
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

let ffmpegProcess = null;
let currentCctvUrl = null;
const streamClients = new Set();

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/student_photos', express.static(PHOTOS_DIR));

// ADMIN CREDENTIALS & SESSIONS
const activeAdminTokens = new Set();

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const currentPass = getAdminPassword();
  if (password === currentPass) {
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    activeAdminTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'رمز عبور اشتباه است' });
  }
});

// Change Admin Password
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'رمز جدید باید حداقل ۴ کاراکتر باشد' });
    }

    const currentPass = getAdminPassword();
    if (oldPassword !== currentPass) {
      return res.status(400).json({ success: false, error: 'رمز عبور فعلی نادرست است' });
    }

    const config = { adminPassword: newPassword.trim() };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) activeAdminTokens.delete(token);
  res.json({ success: true });
});

// Admin Authentication Middleware for sensitive APIs
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token && activeAdminTokens.has(token)) {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Admin access required' });
  }
}

// 1. STUDENTS MANAGEMENT (Search, List, Enroll, Update, Delete)
app.get('/api/students', (req, res) => {
  try {
    const students = readJSON(DB_FILE);
    const search = (req.query.q || '').trim().toLowerCase();
    const grade = (req.query.grade || '').trim();

    let filtered = students;
    if (search) {
      filtered = filtered.filter(s =>
        (s.name && s.name.toLowerCase().includes(search)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(search)) ||
        (s.id && s.id.toLowerCase().includes(search))
      );
    }
    if (grade) {
      filtered = filtered.filter(s => s.grade === grade);
    }

    res.json({ success: true, count: filtered.length, total: students.length, students: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register / Enroll Student with Biometrics (Admin only)
app.post('/api/students/register', requireAdmin, (req, res) => {
  try {
    const { name, studentCode, grade, photo, descriptor, descriptors } = req.body;

    // Support both multi-angle array of descriptors and single descriptor
    let angleDescriptors = [];
    if (Array.isArray(descriptors) && descriptors.length > 0) {
      angleDescriptors = descriptors.map(d => Array.from(d));
    } else if (Array.isArray(descriptor) && descriptor.length === 128) {
      angleDescriptors = [Array.from(descriptor)];
    } else {
      return res.status(400).json({ success: false, error: 'اطلاعات بردار چهره یافت نشد. لطفاً اسکن را مجدداً انجام دهید' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'نام و نام خانوادگی دانش‌آموز الزامی است' });
    }

    const students = readJSON(DB_FILE);
    const studentId = 'std_' + Date.now();
    let photoFilename = null;

    if (photo && photo.startsWith('data:image/')) {
      const matches = photo.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        photoFilename = `${studentId}.${ext}`;
        fs.writeFileSync(path.join(PHOTOS_DIR, photoFilename), Buffer.from(matches[2], 'base64'));
      }
    }

    const newStudent = {
      id: studentId,
      name: name.trim(),
      studentCode: (studentCode || String(Date.now()).slice(-6)).trim(),
      grade: (grade || 'کلاس عمومی').trim(),
      photoUrl: photoFilename ? `/student_photos/${photoFilename}` : null,
      descriptors: angleDescriptors, // Store all angle biometric vectors (front, left, right)
      descriptor: angleDescriptors[0], // primary reference
      registeredAt: Date.now()
    };

    students.unshift(newStudent);
    writeJSON(DB_FILE, students);

    res.json({ success: true, student: newStudent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update / Modify Student Profile (Admin only)
app.put('/api/students/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, studentCode, grade } = req.body;
    const students = readJSON(DB_FILE);
    const student = students.find(s => s.id === id);

    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    if (name && name.trim()) student.name = name.trim();
    if (studentCode && studentCode.trim()) student.studentCode = studentCode.trim();
    if (grade && grade.trim()) student.grade = grade.trim();
    student.updatedAt = Date.now();

    writeJSON(DB_FILE, students);
    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Student (Admin only)
app.delete('/api/students/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    let students = readJSON(DB_FILE);
    const target = students.find(s => s.id === id);
    if (!target) return res.status(404).json({ success: false, error: 'Student not found' });

    if (target.photoUrl) {
      const p = path.join(PHOTOS_DIR, path.basename(target.photoUrl));
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    students = students.filter(s => s.id !== id);
    writeJSON(DB_FILE, students);
    res.json({ success: true, removedId: id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. DAILY ATTENDANCE (Present / Absent verification)
app.get('/api/attendance/today', (req, res) => {
  try {
    const today = req.query.date || getTodayKey();
    const students = readJSON(DB_FILE);
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    const todayLogs = attendanceMap[today] || [];

    const presentIds = new Set(todayLogs.map(l => l.studentId));

    const list = students.map(s => {
      const log = todayLogs.find(l => l.studentId === s.id);
      return {
        id: s.id,
        name: s.name,
        studentCode: s.studentCode,
        grade: s.grade,
        photoUrl: s.photoUrl,
        status: presentIds.has(s.id) ? 'PRESENT' : 'ABSENT',
        entryTime: log ? log.timestamp : null
      };
    });

    res.json({
      success: true,
      date: today,
      stats: {
        total: students.length,
        present: presentIds.size,
        absent: students.length - presentIds.size
      },
      records: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Student Entry via Camera
app.post('/api/attendance/verify', (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: 'studentId required' });

    const students = readJSON(DB_FILE);
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ success: false, error: 'Student not enrolled' });

    const today = getTodayKey();
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    if (!attendanceMap[today]) attendanceMap[today] = [];

    let existing = attendanceMap[today].find(l => l.studentId === studentId);
    let isFirstToday = false;

    if (!existing) {
      existing = {
        studentId: student.id,
        name: student.name,
        studentCode: student.studentCode,
        grade: student.grade,
        status: 'PRESENT',
        timestamp: Date.now()
      };
      attendanceMap[today].unshift(existing);
      writeJSON(ATTENDANCE_FILE, attendanceMap);
      isFirstToday = true;
    }

    res.json({ success: true, isFirstToday, record: existing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual attendance toggle (present / absent) or submit present by studentId/studentCode
app.post('/api/attendance/manual', requireAdmin, (req, res) => {
  try {
    const { studentId, studentCode, date, status } = req.body;
    const targetDate = date || getTodayKey();
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    if (!attendanceMap[targetDate]) attendanceMap[targetDate] = [];

    const students = readJSON(DB_FILE);
    let student = null;
    if (studentId) {
      student = students.find(s => s.id === studentId || s.studentCode === studentId);
    }
    if (!student && studentCode) {
      student = students.find(s => s.studentCode === String(studentCode).trim() || s.id === String(studentCode).trim());
    }

    if (!student) {
      return res.status(404).json({ success: false, error: 'دانش‌آموزی با این شناسه یا کد یافت نشد' });
    }

    const newStatus = status ? status.toUpperCase() : 'PRESENT';

    if (newStatus === 'PRESENT') {
      const idx = attendanceMap[targetDate].findIndex(l => l.studentId === student.id);
      if (idx === -1) {
        attendanceMap[targetDate].unshift({
          studentId: student.id,
          name: student.name,
          studentCode: student.studentCode,
          grade: student.grade,
          status: 'PRESENT',
          timestamp: Date.now()
        });
      }
    } else {
      // Mark absent
      attendanceMap[targetDate] = attendanceMap[targetDate].filter(l => l.studentId !== student.id);
    }

    writeJSON(ATTENDANCE_FILE, attendanceMap);
    res.json({ success: true, student, status: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CCTV STREAM
function stopCctvProcess() {
  if (ffmpegProcess) {
    try { ffmpegProcess.kill('SIGKILL'); } catch (e) {}
    ffmpegProcess = null;
  }
}

app.post('/api/cctv/connect', (req, res) => {
  try {
    const { rtspUrl } = req.body;
    if (!rtspUrl) return res.status(400).json({ success: false, error: 'rtspUrl required' });

    stopCctvProcess();
    currentCctvUrl = rtspUrl.trim();

    ffmpegProcess = spawn('ffmpeg', [
      '-rtsp_transport', 'tcp',
      '-i', currentCctvUrl,
      '-r', '12',
      '-f', 'image2pipe',
      '-q:v', '3',
      '-vcodec', 'mjpeg',
      'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    ffmpegProcess.stdout.on('data', chunk => {
      for (const client of streamClients) {
        try {
          client.write(`--boundary\r\nContent-Type: image/jpeg\r\nContent-Length: ${chunk.length}\r\n\r\n`);
          client.write(chunk);
          client.write('\r\n');
        } catch (err) {
          streamClients.delete(client);
        }
      }
    });

    ffmpegProcess.on('exit', () => { ffmpegProcess = null; });
    res.json({ success: true, streamUrl: '/api/cctv/stream' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cctv/disconnect', (req, res) => {
  stopCctvProcess();
  res.json({ success: true });
});

app.get('/api/cctv/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=boundary',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'close',
    'Pragma': 'no-cache'
  });
  streamClients.add(res);
  req.on('close', () => streamClients.delete(res));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`School Attendance Face System live at http://localhost:${PORT}`);
});
