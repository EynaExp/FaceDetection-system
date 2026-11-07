const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database', 'students.json');
const PHOTOS_DIR = path.join(__dirname, 'database', 'student_photos');
const ATTENDANCE_FILE = path.join(__dirname, 'database', 'attendance.json');
const CONFIG_FILE = path.join(__dirname, 'database', 'config.json');
const PARENTS_FILE = path.join(__dirname, 'database', 'bale_parents.json');

[path.join(__dirname, 'database'), PHOTOS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(ATTENDANCE_FILE)) {
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(PARENTS_FILE)) {
  fs.writeFileSync(PARENTS_FILE, JSON.stringify([], null, 2));
}
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    baleToken: process.env.BALE_TOKEN || '',
    baleBotUsername: process.env.BALE_BOT_USERNAME || '',
    baleEnabled: false,
    autoAbsentAlert: true,
    autoAbsentTime: "08:30",
    schoolHours: {
      openTime: "07:00",
      closeTime: "14:30",
      days: [0, 1, 2, 3, 6] // Saturday(6) through Wednesday(3), Friday=5
    }
  }, null, 2));
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

function getConfig() {
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    if (cfg.baleToken === undefined) cfg.baleToken = '';
    if (cfg.baleBotUsername === undefined) cfg.baleBotUsername = '';
    if (cfg.baleEnabled === undefined) cfg.baleEnabled = false;
    if (cfg.autoAbsentAlert === undefined) cfg.autoAbsentAlert = true;
    if (!cfg.autoAbsentTime) cfg.autoAbsentTime = "08:30";
    return cfg;
  } catch (e) {
    return {
      adminPassword: 'admin123',
      baleToken: '',
      baleBotUsername: '',
      baleEnabled: false,
      autoAbsentAlert: true,
      autoAbsentTime: "08:30",
      schoolHours: { openTime: "07:00", closeTime: "14:30", days: [0, 1, 2, 3, 6] }
    };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
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
  const cfg = getConfig();
  if (password === cfg.adminPassword) {
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    activeAdminTokens.add(token);
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: 'رمز عبور اشتباه است' });
  }
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, error: 'رمز جدید باید حداقل ۴ کاراکتر باشد' });
    }

    const cfg = getConfig();
    if (oldPassword !== cfg.adminPassword) {
      return res.status(400).json({ success: false, error: 'رمز عبور فعلی نادرست است' });
    }

    cfg.adminPassword = newPassword.trim();
    saveConfig(cfg);
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
    const parents = readJSON(PARENTS_FILE);
    const search = (req.query.q || '').trim().toLowerCase();
    const grade = (req.query.grade || '').trim();

    let filtered = students;
    if (search) {
      filtered = filtered.filter(s =>
        (s.name && s.name.toLowerCase().includes(search)) ||
        (s.nationalId && s.nationalId.toLowerCase().includes(search)) ||
        (s.studentCode && s.studentCode.toLowerCase().includes(search)) ||
        (s.id && s.id.toLowerCase().includes(search))
      );
    }
    if (grade) {
      filtered = filtered.filter(s => s.grade === grade);
    }

    // Attach verified parent information (Phone number, Bale Chat ID, Linked Date)
    const enriched = filtered.map(s => {
      const p = parents.find(item => item.studentId === s.id);
      return {
        ...s,
        parentInfo: p ? {
          phone: p.phone || '-',
          chatId: p.chatId || '-',
          linkedAt: p.linkedAt || null
        } : null
      };
    });

    res.json({ success: true, count: enriched.length, total: students.length, students: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Register / Enroll Student with Biometrics (Admin only)
app.post('/api/students/register', requireAdmin, (req, res) => {
  try {
    const { name, nationalId, studentCode, grade, photo, descriptor, descriptors } = req.body;

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
      nationalId: (nationalId || '').trim(), // کد ملی دانش‌آموز
      studentCode: (studentCode || String(Date.now()).slice(-6)).trim(),
      grade: (grade || 'کلاس عمومی').trim(),
      photoUrl: photoFilename ? `/student_photos/${photoFilename}` : null,
      descriptors: angleDescriptors,
      descriptor: angleDescriptors[0],
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
    const { name, nationalId, studentCode, grade, parentPhone, parentBaleId } = req.body;
    const students = readJSON(DB_FILE);
    const student = students.find(s => s.id === id);

    if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

    if (name && name.trim()) student.name = name.trim();
    if (nationalId !== undefined) student.nationalId = nationalId.trim();
    if (studentCode && studentCode.trim()) student.studentCode = studentCode.trim();
    if (grade && grade.trim()) student.grade = grade.trim();
    student.updatedAt = Date.now();
    writeJSON(DB_FILE, students);

    // Update or link parent contact & Bale info in bale_parents.json
    if (parentPhone !== undefined || parentBaleId !== undefined) {
      const parents = readJSON(PARENTS_FILE);
      let parentEntry = parents.find(p => p.studentId === id);

      const phoneVal = parentPhone ? String(parentPhone).trim() : (parentEntry ? parentEntry.phone : '-');
      const baleIdVal = parentBaleId ? String(parentBaleId).trim() : (parentEntry ? parentEntry.chatId : null);

      if (parentEntry) {
        if (parentPhone !== undefined) parentEntry.phone = phoneVal;
        if (parentBaleId !== undefined) parentEntry.chatId = baleIdVal;
        parentEntry.studentName = student.name;
        parentEntry.updatedAt = Date.now();
      } else if (phoneVal !== '-' || baleIdVal) {
        parents.push({
          chatId: baleIdVal,
          studentId: id,
          studentName: student.name,
          phone: phoneVal,
          linkedAt: Date.now()
        });
      }
      writeJSON(PARENTS_FILE, parents);
    }

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
        nationalId: s.nationalId || '',
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
        nationalId: student.nationalId || '',
        studentCode: student.studentCode,
        grade: student.grade,
        status: 'PRESENT',
        timestamp: Date.now()
      };
      attendanceMap[today].unshift(existing);
      writeJSON(ATTENDANCE_FILE, attendanceMap);
      isFirstToday = true;

      // Send Instant Notification to Parent via Bale Bot
      notifyParentViaBale(student, existing.timestamp);
    }

    res.json({ success: true, isFirstToday, record: existing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Manual attendance toggle (present / absent) or submit present by studentId/studentCode/nationalId
app.post('/api/attendance/manual', requireAdmin, (req, res) => {
  try {
    const { studentId, studentCode, date, status } = req.body;
    const targetDate = date || getTodayKey();
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    if (!attendanceMap[targetDate]) attendanceMap[targetDate] = [];

    const students = readJSON(DB_FILE);
    let student = null;
    const query = String(studentId || studentCode || '').trim();

    if (query) {
      student = students.find(s =>
        s.id === query ||
        s.studentCode === query ||
        (s.nationalId && s.nationalId === query)
      );
    }

    if (!student) {
      return res.status(404).json({ success: false, error: 'دانش‌آموزی با این شناسه، کدملی یا کد دانش‌آموزی یافت نشد' });
    }

    const newStatus = status ? status.toUpperCase() : 'PRESENT';

    if (newStatus === 'PRESENT') {
      const idx = attendanceMap[targetDate].findIndex(l => l.studentId === student.id);
      if (idx === -1) {
        const record = {
          studentId: student.id,
          name: student.name,
          nationalId: student.nationalId || '',
          studentCode: student.studentCode,
          grade: student.grade,
          status: 'PRESENT',
          timestamp: Date.now()
        };
        attendanceMap[targetDate].unshift(record);
        notifyParentViaBale(student, record.timestamp);
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

// Export attendance as CSV (Excel compatible with UTF-8 BOM)
app.get('/api/attendance/export-csv', requireAdmin, (req, res) => {
  try {
    const targetDate = req.query.date || getTodayKey();
    const students = readJSON(DB_FILE);
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    const dayLogs = attendanceMap[targetDate] || [];
    const presentIds = new Set(dayLogs.map(l => l.studentId));

    // UTF-8 BOM so Excel opens Persian text properly
    let csv = '\uFEFFنام و نام خانوادگی,کد ملی,کد دانش آموزی,کلاس / پایه,وضعیت,ساعت ثبت ورود,تاریخ\n';

    students.forEach(s => {
      const log = dayLogs.find(l => l.studentId === s.id);
      const isPresent = presentIds.has(s.id);
      const statusText = isPresent ? 'حاضر' : 'غایب';
      const timeStr = log ? new Date(log.timestamp).toLocaleTimeString('fa-IR') : '-';

      csv += `"${s.name}","${s.nationalId || '-'}","${s.studentCode || '-'}","${s.grade}","${statusText}","${timeStr}","${targetDate}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_${targetDate}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Broadcast absentee notifications to parents via Bale (Item 6)
app.post('/api/attendance/notify-absents', requireAdmin, async (req, res) => {
  try {
    const today = req.query.date || getTodayKey();
    const { studentId } = req.body || {}; // optional single student target
    const students = readJSON(DB_FILE);
    const attendanceMap = readJSON(ATTENDANCE_FILE);
    const todayLogs = attendanceMap[today] || [];
    const presentIds = new Set(todayLogs.map(l => l.studentId));

    let targetStudents = [];
    if (studentId) {
      const single = students.find(s => s.id === studentId);
      if (single) targetStudents = [single];
    } else {
      targetStudents = students.filter(s => !presentIds.has(s.id));
    }

    const parents = readJSON(PARENTS_FILE);
    const dateStr = new Date().toLocaleDateString('fa-IR');

    let notifiedCount = 0;

    for (const student of targetStudents) {
      const linkedParents = parents.filter(p => p.studentId === student.id);
      for (const parent of linkedParents) {
        const msg = `⚠️ هشدار غیبت از مدرسه

ولی گرامی،
به اطلاع می‌رساند فرزند شما «${student.name}» (پایه/کلاس: ${student.grade}) امروز ${dateStr} در مدرسه حضور نیافته و وضعیت ایشان «غایب» ثبت شده است.

در صورت موجه بودن غیبت، لطفاً به دفتر مدرسه اطلاع دهید.
با احترام، مدیریت مدرسه`;

        await sendBaleMessage(parent.chatId, msg);
        notifiedCount++;
      }
    }

    res.json({
      success: true,
      targetTotal: targetStudents.length,
      notifiedParents: notifiedCount
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get('/api/config/hours', (req, res) => {
  try {
    const cfg = getConfig();
    res.json({
      success: true,
      schoolHours: cfg.schoolHours || { openTime: "07:00", closeTime: "14:30", days: [0, 1, 2, 3, 6] },
      baleEnabled: cfg.baleEnabled === true,
      baleBotUsername: cfg.baleBotUsername || '',
      autoAbsentAlert: cfg.autoAbsentAlert !== false,
      autoAbsentTime: cfg.autoAbsentTime || "08:30",
      hasBaleToken: Boolean(cfg.baleToken)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test Bale Bot Connection API (fetches bot info directly using the token/hash)
app.post('/api/bale/test-connection', requireAdmin, async (req, res) => {
  try {
    const { token } = req.body;
    const cfg = getConfig();
    const tokenToTest = (token !== undefined && token !== null ? String(token).trim() : '') || cfg.baleToken;

    if (!tokenToTest) {
      return res.status(400).json({ success: false, error: 'توکن یا هش بازو وارد نشده است' });
    }

    const baleApiUrl = `https://tapi.bale.ai/bot${tokenToTest}/getMe`;
    const response = await fetch(baleApiUrl, { method: 'GET' });
    const data = await response.json();

    if (data.ok && data.result) {
      // Auto-save bot username from getMe response if available
      if (data.result.username) {
        cfg.baleBotUsername = data.result.username;
        saveConfig(cfg);
      }
      res.json({
        success: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          firstName: data.result.first_name
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.description || 'توکن یا هش بازو نامعتبر است'
      });
    }
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'خطا در برقراری ارتباط با سرور بله: ' + err.message
    });
  }
});

app.post('/api/config/hours', requireAdmin, (req, res) => {
  try {
    const { openTime, closeTime, days, baleEnabled, baleToken, baleBotUsername, autoAbsentAlert, autoAbsentTime } = req.body;
    const cfg = getConfig();

    if (openTime && closeTime) {
      cfg.schoolHours = {
        openTime: openTime.trim(),
        closeTime: closeTime.trim(),
        days: Array.isArray(days) ? days : [0, 1, 2, 3, 6]
      };
    }
    if (baleEnabled !== undefined) cfg.baleEnabled = Boolean(baleEnabled);
    if (baleToken !== undefined) cfg.baleToken = baleToken.trim();
    if (baleBotUsername !== undefined) cfg.baleBotUsername = baleBotUsername.trim().replace(/^@/, '');
    if (autoAbsentAlert !== undefined) cfg.autoAbsentAlert = Boolean(autoAbsentAlert);
    if (autoAbsentTime && autoAbsentTime.trim()) cfg.autoAbsentTime = autoAbsentTime.trim();

    saveConfig(cfg);
    res.json({ success: true, config: cfg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. BACKUP: EXPORT & IMPORT ENTIRE DATABASE AS 1 ZIP FILE (Item 3)
app.get('/api/backup/export', requireAdmin, (req, res) => {
  try {
    const backupName = `school_backup_${Date.now()}.zip`;
    const tempZipPath = path.join('/tmp', backupName);

    // Create zip of database folder
    execSync(`zip -r -q "${tempZipPath}" database/`, { cwd: __dirname });

    res.download(tempZipPath, backupName, err => {
      try { if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath); } catch (e) {}
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Backup generation failed: ' + err.message });
  }
});

const upload = multer({ dest: '/tmp/school_uploads/' });
app.post('/api/backup/import', requireAdmin, upload.single('backupZip'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'فایل زیپ پشتیبان انتخاب نشده است' });
    }

    const zipFile = req.file.path;
    const tempExtractDir = path.join('/tmp', 'extracted_backup_' + Date.now());
    fs.mkdirSync(tempExtractDir, { recursive: true });

    // Unzip uploaded file
    execSync(`unzip -q -o "${zipFile}" -d "${tempExtractDir}"`);

    // Verify database folder exists inside zip
    const sourceDbDir = fs.existsSync(path.join(tempExtractDir, 'database'))
      ? path.join(tempExtractDir, 'database')
      : tempExtractDir;

    // Restore files
    ['students.json', 'attendance.json', 'bale_parents.json', 'config.json'].forEach(f => {
      const src = path.join(sourceDbDir, f);
      const dst = path.join(__dirname, 'database', f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    });

    const srcPhotos = path.join(sourceDbDir, 'student_photos');
    if (fs.existsSync(srcPhotos)) {
      const photos = fs.readdirSync(srcPhotos);
      photos.forEach(photo => {
        fs.copyFileSync(path.join(srcPhotos, photo), path.join(PHOTOS_DIR, photo));
      });
    }

    // Cleanup temp
    try {
      execSync(`rm -rf "${tempExtractDir}" "${zipFile}"`);
    } catch (e) {}

    res.json({ success: true, message: 'اطلاعات با موفقیت بازیابی شد' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطا در بازگردانی فایل پشتیبان: ' + err.message });
  }
});

// 5. BALE MESSENGER BOT FOR PARENTS (Interactive parent verification & notification)
const parentSessions = new Map(); // chatId -> { step, studentCode, nationalId }

async function sendBaleMessage(chatId, text, replyMarkup = null) {
  const cfg = getConfig();
  if (!cfg.baleToken) return;
  try {
    const body = { chat_id: chatId, text };
    if (replyMarkup) body.reply_markup = replyMarkup;

    await fetch(`https://tapi.bale.ai/bot${cfg.baleToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('Bale send error:', err.message);
  }
}

async function notifyParentViaBale(student, entryTimestamp) {
  const cfg = getConfig();
  if (!cfg.baleEnabled || !cfg.baleToken) return;

  const parents = readJSON(PARENTS_FILE);
  // Find linked verified parents for this student
  const matchedParents = parents.filter(p => p.studentId === student.id);
  if (matchedParents.length === 0) return;

  const timeStr = new Date(entryTimestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(entryTimestamp).toLocaleDateString('fa-IR');

  const message = `🔔 اطلاع‌رسانی ورود به مدرسه

ولی گرامی،
فرزند شما «${student.name}» (پایه/کلاس: ${student.grade})
در تاریخ ${dateStr} و ساعت ${timeStr} از گیت مدرسه عبور کرده و حضور وی با چهره ثبت گردید.

با احترام،
مدیریت مدرسه`;

  for (const parent of matchedParents) {
    sendBaleMessage(parent.chatId, message);
  }
}

// Long-polling worker for Bale Bot
let balePollOffset = 0;
async function pollBaleUpdates() {
  const cfg = getConfig();
  if (!cfg.baleToken) {
    setTimeout(pollBaleUpdates, 5000);
    return;
  }

  try {
    const res = await fetch(`https://tapi.bale.ai/bot${cfg.baleToken}/getUpdates?offset=${balePollOffset}&timeout=5`);
    const data = await res.json();

    if (data.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        balePollOffset = update.update_id + 1;
        if (update.message && update.message.text) {
          await handleBaleIncomingMessage(update.message);
        }
      }
    }
  } catch (err) {
    // Network or temporary timeout
  }

  setTimeout(pollBaleUpdates, 1500);
}

// Guided Parent Questioning / Authentication Flow (National ID Only with Edit/Confirm option)
function normalizeDigits(str) {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .trim();
}

const CONFIRM_KEYBOARD = {
  keyboard: [
    [{ text: 'تایید و ادامه' }, { text: 'اصلاح و ویرایش مجدد' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
};

const FINAL_CONFIRM_KEYBOARD = {
  keyboard: [
    [{ text: 'تایید نهایی و ثبت' }, { text: 'شروع مجدد از ابتدا' }]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
};

const REMOVE_KEYBOARD = { remove_keyboard: true };

async function handleBaleIncomingMessage(msg) {
  const chatId = msg.chat.id;
  const rawText = msg.text.trim();
  const text = normalizeDigits(rawText);
  const session = parentSessions.get(chatId) || { step: 'IDLE' };

  if (rawText === '/start' || rawText === 'شروع' || rawText === 'شروع مجدد از ابتدا') {
    parentSessions.set(chatId, { step: 'ASK_NATIONAL_ID' });
    await sendBaleMessage(chatId, `سلام، به سامانه هوشمند تردد مدرسه خوش آمدید.

جهت احراز هویت اولیا، لطفاً «کد ملی ۱۰ رقمی دانش‌آموز» را ارسال فرمایید:`, REMOVE_KEYBOARD);
    return;
  }

  // 1. Enter National ID or Student Code / System ID
  if (session.step === 'ASK_NATIONAL_ID') {
    const students = readJSON(DB_FILE);
    // Flexible matching: Match against National ID OR Student Code OR System ID
    const matched = students.find(s => {
      const nid = normalizeDigits(s.nationalId || '');
      const code = normalizeDigits(s.studentCode || '');
      const id = String(s.id || '').trim();
      return (nid && nid === text) || (code && code === text) || (id && id === text);
    });

    if (!matched) {
      await sendBaleMessage(chatId, `دانش‌آموزی با مشخصه «${rawText}» در سامانه مدرسه یافت نشد.

لطفاً کد ملی ۱۰ رقمی، شماره دانش‌آموزی یا شناسه پرونده را با دقت ارسال کنید یا /start را بزنید:`);
      return;
    }

    session.tempNationalId = text;
    session.matchedStudent = matched;
    session.step = 'CONFIRM_NATIONAL_ID';
    parentSessions.set(chatId, session);

    await sendBaleMessage(chatId, `مشخصه ارسالی شما: «${text}»
نام دانش‌آموز شناسایی‌شده: «${matched.name}» (پایه/کلاس: ${matched.grade})

آیا این مشخصات صحیح است و تایید می‌کنید؟`, CONFIRM_KEYBOARD);
    return;
  }

  // 1-Confirm National ID
  if (session.step === 'CONFIRM_NATIONAL_ID') {
    if (rawText === 'تایید و ادامه' || rawText === 'تایید' || rawText === 'بله') {
      session.step = 'ASK_PHONE';
      parentSessions.set(chatId, session);
      await sendBaleMessage(chatId, `مشخصات دانش‌آموز تایید شد.

حالا لطفاً «شماره تلفن همراه ولی» را ارسال فرمایید (مثال: 09121234567):`, REMOVE_KEYBOARD);
    } else {
      session.step = 'ASK_NATIONAL_ID';
      parentSessions.set(chatId, session);
      await sendBaleMessage(chatId, `لطفاً مجدداً «کد ملی ۱۰ رقمی دانش‌آموز» را ارسال فرمایید:`, REMOVE_KEYBOARD);
    }
    return;
  }

  // 2. Enter Parent Phone Number
  if (session.step === 'ASK_PHONE') {
    if (text.length < 10) {
      await sendBaleMessage(chatId, `شماره موبایل وارد شده نامعتبر است. لطفاً شماره همراه ۱۱ رقمی خود را ارسال کنید:`);
      return;
    }

    session.tempPhone = text;
    session.step = 'CONFIRM_ALL';
    parentSessions.set(chatId, session);

    await sendBaleMessage(chatId, `پیش‌نمایش اطلاعات ثبت‌شده:
👤 نام فرزند: ${session.matchedStudent.name}
🪪 کد ملی: ${session.tempNationalId}
🏫 کلاس/پایه: ${session.matchedStudent.grade}
📱 شماره تماس ولی: ${text}

آیا مایل به ثبت نهایی و اتصال به سامانه مدرسه هستید؟`, FINAL_CONFIRM_KEYBOARD);
    return;
  }

  // 2-Confirm All & Finalize
  if (session.step === 'CONFIRM_ALL') {
    if (rawText === 'تایید نهایی و ثبت' || rawText === 'تایید' || rawText === 'بله') {
      const student = session.matchedStudent;
      const parents = readJSON(PARENTS_FILE);

      const existingIdx = parents.findIndex(p => p.studentId === student.id && p.chatId === chatId);
      const parentRecord = {
        chatId,
        studentId: student.id,
        studentName: student.name,
        phone: session.tempPhone,
        linkedAt: Date.now()
      };

      if (existingIdx !== -1) {
        parents[existingIdx] = parentRecord;
      } else {
        parents.push(parentRecord);
      }
      writeJSON(PARENTS_FILE, parents);
      parentSessions.delete(chatId);

      await sendBaleMessage(chatId, `احراز هویت با موفقیت انجام شد! ✅

مشخصات شما با موفقیت به پرونده «${student.name}» متصل گردید.
از این پس در لحظه عبور فرزندتان از گیت ورودی مدرسه، پیام ورود ایشان همراه با ساعت دقیق به این گفت‌وگو ارسال خواهد شد.`, REMOVE_KEYBOARD);
    } else {
      parentSessions.set(chatId, { step: 'ASK_NATIONAL_ID' });
      await sendBaleMessage(chatId, `فرآیند ثبت مجدداً آغاز شد. لطفاً «کد ملی ۱۰ رقمی دانش‌آموز» را ارسال فرمایید:`, REMOVE_KEYBOARD);
    }
    return;
  }

  // Default response
  await sendBaleMessage(chatId, `جهت احراز هویت و اتصال به سامانه مدرسه لطفاً دستور /start را ارسال فرمایید.`);
}

// Start Bale Worker in background
pollBaleUpdates();

// 6. CCTV STREAM
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
