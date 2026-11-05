// School Attendance & Face Verification Controller
let currentLang = 'fa';
let modelsLoaded = false;
let enrolledStudents = [];
let todayAttendance = [];
let currentTab = 'gate';

// 3-step guided enrollment
let enrollStep = 1;
const capturedDescriptors = [];
let bestFaceCrop = null;

// Camera states
let gateStream = null;
let gateInterval = null;
let enrollStream = null;
let enrollInterval = null;
let isCctvMode = false;
let isCctvConnected = false;
let currentEnrollDetection = null;

// State variables
const LOG_COOLDOWN_MS = 6000;
const recentVerifications = new Map();

// UI Elements
const gateVideo = document.getElementById('gateVideo');
const cctvImage = document.getElementById('cctvImage');
const gateCanvas = document.getElementById('gateCanvas');
const gateCtx = gateCanvas.getContext('2d');
const sourceSelect = document.getElementById('sourceSelect');
const gateCamSelect = document.getElementById('gateCamSelect');
const rtspUrlInput = document.getElementById('rtspUrlInput');
const toggleGateCamBtn = document.getElementById('toggleGateCamBtn');
const gateResultCard = document.getElementById('gateResultCard');
const gateResultIcon = document.getElementById('gateResultIcon');
const gateResultTitle = document.getElementById('gateResultTitle');
const gateResultSub = document.getElementById('gateResultSub');

const todayDateBadge = document.getElementById('todayDateBadge');
const gatePresentCount = document.getElementById('gatePresentCount');
const gateAbsentCount = document.getElementById('gateAbsentCount');
const gateTotalCount = document.getElementById('gateTotalCount');
const quickLogsList = document.getElementById('quickLogsList');

// Enrollment Elements
const enrollVideo = document.getElementById('enrollVideo');
const enrollCanvas = document.getElementById('enrollCanvas');
const enrollCtx = enrollCanvas.getContext('2d');
const toggleEnrollCamBtn = document.getElementById('toggleEnrollCamBtn');
const guideStepPrompt = document.getElementById('guideStepPrompt');
const dot1 = document.getElementById('dot1');
const dot2 = document.getElementById('dot2');
const dot3 = document.getElementById('dot3');
const memberNameInput = document.getElementById('memberNameInput');
const studentCodeInput = document.getElementById('studentCodeInput');
const studentGradeInput = document.getElementById('studentGradeInput');
const nextStepBtn = document.getElementById('nextStepBtn');
const submitMemberBtn = document.getElementById('submitMemberBtn');
const enrollMiniTableBody = document.getElementById('enrollMiniTableBody');
const membersTotalBadge = document.getElementById('membersTotalBadge');

// Attendance Sheet Elements
const attPresentNum = document.getElementById('attPresentNum');
const attAbsentNum = document.getElementById('attAbsentNum');
const attTotalNum = document.getElementById('attTotalNum');
const filterAbsentCount = document.getElementById('filterAbsentCount');
const filterPresentCount = document.getElementById('filterPresentCount');
const attendanceSearchInput = document.getElementById('attendanceSearchInput');
const refreshAttendanceBtn = document.getElementById('refreshAttendanceBtn');
const attendanceTableBody = document.getElementById('attendanceTableBody');
let currentAttendanceFilter = 'ALL'; // 'ALL', 'ABSENT', 'PRESENT'

// Admin Records Elements
const memberSearchInput = document.getElementById('memberSearchInput');
const adminCountDisplay = document.getElementById('adminCountDisplay');
const adminTableBody = document.getElementById('adminTableBody');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const saveEditBtn = document.getElementById('saveEditBtn');
const editMemberId = document.getElementById('editMemberId');
const editMemberName = document.getElementById('editMemberName');
const editStudentCode = document.getElementById('editStudentCode');
const editStudentGrade = document.getElementById('editStudentGrade');

// Nav & Helpers
const systemDot = document.getElementById('systemDot');
const systemStatus = document.getElementById('systemStatus');
const tabGateBtn = document.getElementById('tabGateBtn');
const tabEnrollBtn = document.getElementById('tabEnrollBtn');
const tabAttendanceBtn = document.getElementById('tabAttendanceBtn');
const tabAdminBtn = document.getElementById('tabAdminBtn');
const tabSettingsBtn = document.getElementById('tabSettingsBtn');

const tabGate = document.getElementById('tabGate');
const tabEnroll = document.getElementById('tabEnroll');
const tabAttendance = document.getElementById('tabAttendance');
const tabAdmin = document.getElementById('tabAdmin');
const tabSettings = document.getElementById('tabSettings');

// Settings Elements
const webcamSettingsBox = document.getElementById('webcamSettingsBox');
const cctvSettingsBox = document.getElementById('cctvSettingsBox');
const gateCamStatusIndicator = document.getElementById('gateCamStatusIndicator');
const thresholdSlider = document.getElementById('thresholdSlider');
const thresholdValDisplay = document.getElementById('thresholdValDisplay');
const langToggleBtn = document.getElementById('langToggleBtn');

// Admin Authentication Elements
const adminAuthBtn = document.getElementById('adminAuthBtn');
const adminAuthIcon = document.getElementById('adminAuthIcon');
const adminAuthLabel = document.getElementById('adminAuthLabel');
const loginModal = document.getElementById('loginModal');
const closeLoginModalBtn = document.getElementById('closeLoginModalBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const submitLoginBtn = document.getElementById('submitLoginBtn');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const loginErrorMsg = document.getElementById('loginErrorMsg');

let adminToken = localStorage.getItem('school_admin_token') || null;

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (adminToken) headers['x-admin-token'] = adminToken;
  return headers;
}

function updateAdminUI() {
  const isAdmin = adminToken !== null;
  document.querySelectorAll('.admin-only').forEach(el => {
    if (isAdmin) el.classList.remove('hidden');
    else el.classList.add('hidden');
  });

  if (isAdmin) {
    adminAuthLabel.innerText = currentLang === 'fa' ? 'خروج مدیر' : 'Logout Admin';
    adminAuthIcon.innerText = '🔓';
    adminAuthBtn.classList.add('logged-in');
  } else {
    adminAuthLabel.innerText = currentLang === 'fa' ? 'ورود مدیر' : 'Admin Login';
    adminAuthIcon.innerText = '🔒';
    adminAuthBtn.classList.remove('logged-in');
    // If on restricted tab, send back to gate
    if (currentTab !== 'gate') switchTab('gate');
  }
}

adminAuthBtn.addEventListener('click', () => {
  if (adminToken) {
    // Logout
    if (confirm(currentLang === 'fa' ? 'آیا از حساب مدیریت خارج می‌شوید؟' : 'Logout from admin mode?')) {
      fetch('/api/admin/logout', { method: 'POST', headers: getAuthHeaders() });
      adminToken = null;
      localStorage.removeItem('school_admin_token');
      updateAdminUI();
    }
  } else {
    // Open login modal
    adminPasswordInput.value = '';
    loginErrorMsg.classList.add('hidden');
    loginModal.classList.remove('hidden');
    adminPasswordInput.focus();
  }
});

// Change Password Elements
const changePassBtn = document.getElementById('changePassBtn');
const changePassModal = document.getElementById('changePassModal');
const closeChangePassModalBtn = document.getElementById('closeChangePassModalBtn');
const cancelChangePassBtn = document.getElementById('cancelChangePassBtn');
const saveChangePassBtn = document.getElementById('saveChangePassBtn');
const oldPasswordInput = document.getElementById('oldPasswordInput');
const newPasswordInput = document.getElementById('newPasswordInput');
const changePassErrorMsg = document.getElementById('changePassErrorMsg');

if (changePassBtn) {
  changePassBtn.addEventListener('click', () => {
    oldPasswordInput.value = '';
    newPasswordInput.value = '';
    changePassErrorMsg.classList.add('hidden');
    changePassModal.classList.remove('hidden');
    oldPasswordInput.focus();
  });
}

function closeChangePassModal() {
  changePassModal.classList.add('hidden');
}
closeChangePassModalBtn.addEventListener('click', closeChangePassModal);
cancelChangePassBtn.addEventListener('click', closeChangePassModal);

saveChangePassBtn.addEventListener('click', async () => {
  const oldPassword = oldPasswordInput.value;
  const newPassword = newPasswordInput.value;

  if (!oldPassword || !newPassword) {
    changePassErrorMsg.innerText = 'لطفا هر دو فیلد رمز را وارد کنید';
    changePassErrorMsg.classList.remove('hidden');
    return;
  }

  try {
    saveChangePassBtn.disabled = true;
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const d = await res.json();
    if (d.success) {
      alert('رمز عبور مدیریت با موفقیت تغییر یافت.');
      closeChangePassModal();
    } else {
      changePassErrorMsg.innerText = d.error || 'خطا در تغییر رمز';
      changePassErrorMsg.classList.remove('hidden');
    }
  } catch (e) {
    alert(e.message);
  } finally {
    saveChangePassBtn.disabled = false;
  }
});

function closeLoginModal() {
  loginModal.classList.add('hidden');
}
closeLoginModalBtn.addEventListener('click', closeLoginModal);
cancelLoginBtn.addEventListener('click', closeLoginModal);

submitLoginBtn.addEventListener('click', async () => {
  const password = adminPasswordInput.value;
  try {
    submitLoginBtn.disabled = true;
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const d = await res.json();
    if (d.success) {
      adminToken = d.token;
      localStorage.setItem('school_admin_token', adminToken);
      closeLoginModal();
      updateAdminUI();
    } else {
      loginErrorMsg.classList.remove('hidden');
    }
  } catch (e) {
    alert(e.message);
  } finally {
    submitLoginBtn.disabled = false;
  }
});

adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitLoginBtn.click();
});

function setSysStatus(msg, color) {
  systemStatus.innerText = msg;
  systemDot.className = `status-dot ${color}`;
}

async function initModels() {
  setSysStatus('بارگذاری هوش مصنوعی...', 'yellow');
  try {
    const MODEL_URL = '/models';
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    modelsLoaded = true;
    setSysStatus('سیستم مدرسه آماده است', 'green');

    const todayStr = new Date().toLocaleDateString('fa-IR');
    if (todayDateBadge) todayDateBadge.innerText = todayStr;

    await loadStudents();
    await loadTodayAttendance();
    await listCameraDevices();

    // Auto-start gate camera on load so webcam is always active
    if (!gateStream && !isCctvConnected) {
      await startGateCamera();
    }
  } catch (err) {
    console.error(err);
    setSysStatus('خطا در بارگذاری مدل‌ها', 'red');
  }
}

async function listCameraDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    gateCamSelect.innerHTML = '';
    videoInputs.forEach((dev, idx) => {
      const opt = document.createElement('option');
      opt.value = dev.deviceId;
      opt.text = dev.label || `دوربین ${idx + 1}`;
      gateCamSelect.appendChild(opt);
    });
  } catch (e) {}
}

function syncCanvas(el, canv) {
  const rect = el.getBoundingClientRect();
  const w = el.videoWidth || el.naturalWidth || 640;
  const h = el.videoHeight || el.naturalHeight || 480;
  canv.width = w;
  canv.height = h;
  canv.style.width = `${rect.width}px`;
  canv.style.height = `${rect.height}px`;
  canv.style.top = `${el.offsetTop}px`;
  canv.style.left = `${el.offsetLeft}px`;
}

function computeDistance(desc1, desc2) {
  if (!desc1 || !desc2) return Infinity;
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = Number(desc1[i]) - Number(desc2[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Multi-angle matching: checks face against all stored angles (front, left, right)
function matchStudent(descriptor) {
  if (!enrolledStudents || enrolledStudents.length === 0) return null;
  let best = null;
  let min = Infinity;

  for (const s of enrolledStudents) {
    const angleList = [];
    if (s.descriptors && Array.isArray(s.descriptors) && s.descriptors.length > 0) {
      s.descriptors.forEach(d => angleList.push(d));
    }
    if (s.descriptor && Array.isArray(s.descriptor)) {
      angleList.push(s.descriptor);
    }

    for (const angleDesc of angleList) {
      if (!angleDesc) continue;
      const d = computeDistance(angleDesc, descriptor);
      if (d < min) {
        min = d;
        if (d <= MATCH_THRESHOLD) best = s;
      }
    }
  }

  return best ? { student: best, distance: min } : null;
}

let MATCH_THRESHOLD = parseFloat(localStorage.getItem('match_threshold')) || 0.54;
const submittedTodayStudents = new Set(); // In-memory tracker for today's submissions to prevent duplicate API posts

if (thresholdSlider) {
  thresholdSlider.value = MATCH_THRESHOLD;
  thresholdValDisplay.innerText = MATCH_THRESHOLD;
  thresholdSlider.addEventListener('input', () => {
    MATCH_THRESHOLD = parseFloat(thresholdSlider.value);
    thresholdValDisplay.innerText = MATCH_THRESHOLD;
    localStorage.setItem('match_threshold', MATCH_THRESHOLD);
  });
}

function updateCameraStatus(status, color) {
  if (gateCamStatusIndicator) {
    gateCamStatusIndicator.innerText = status;
    gateCamStatusIndicator.className = `badge-tag ${color}`;
  }
}

// 1. SETTINGS & SOURCE SELECTION (Webcam / CCTV)
if (sourceSelect) {
  sourceSelect.addEventListener('change', () => {
    stopGateCamera();
    disconnectCctv();
    isCctvMode = sourceSelect.value === 'cctv';

    if (isCctvMode) {
      if (webcamSettingsBox) webcamSettingsBox.classList.add('hidden');
      if (cctvSettingsBox) cctvSettingsBox.classList.remove('hidden');
      gateVideo.classList.add('hidden');
      cctvImage.classList.remove('hidden');
      toggleGateCamBtn.innerText = 'اتصال دوربین مداربسته (CCTV)';
    } else {
      if (webcamSettingsBox) webcamSettingsBox.classList.remove('hidden');
      if (cctvSettingsBox) cctvSettingsBox.classList.add('hidden');
      gateVideo.classList.remove('hidden');
      cctvImage.classList.add('hidden');
      toggleGateCamBtn.innerText = 'روشن کردن دوربین گیت';
    }
  });
}

if (toggleGateCamBtn) {
  toggleGateCamBtn.addEventListener('click', () => {
    if (isCctvMode) {
      if (isCctvConnected) disconnectCctv();
      else connectCctv();
    } else {
      if (gateStream) stopGateCamera();
      else startGateCamera();
    }
  });
}

async function startGateCamera() {
  if (!modelsLoaded) return;
  const deviceId = gateCamSelect.value;
  const constraints = deviceId ? { video: { deviceId: { exact: deviceId } } } : { video: true };

  try {
    gateStream = await navigator.mediaDevices.getUserMedia(constraints);
    gateVideo.srcObject = gateStream;
    await gateVideo.play();
    toggleGateCamBtn.innerText = 'خاموش کردن دوربین گیت';
    updateCameraStatus('فعال (وب‌کم)', 'green');

    const onMeta = () => syncCanvas(gateVideo, gateCanvas);
    gateVideo.onloadedmetadata = onMeta;
    window.addEventListener('resize', onMeta);
    onMeta();

    if (gateInterval) clearInterval(gateInterval);
    gateInterval = setInterval(processGateAttendance, 250);
  } catch (err) {
    alert('خطا در دسترسی به دوربین: ' + err.message);
    updateCameraStatus('خطای اتصال', 'red');
  }
}

function stopGateCamera() {
  if (gateStream) {
    gateStream.getTracks().forEach(t => t.stop());
    gateStream = null;
  }
  if (gateInterval) clearInterval(gateInterval);
  gateInterval = null;
  toggleGateCamBtn.innerText = 'روشن کردن دوربین گیت';
  updateCameraStatus('متوقف', 'blue');
  gateCtx.clearRect(0, 0, gateCanvas.width, gateCanvas.height);
  resetGateResultCard();
}

async function connectCctv() {
  const rtspUrl = rtspUrlInput.value.trim();
  if (!rtspUrl) {
    alert('لطفا آدرس RTSP دوربین را وارد کنید');
    return;
  }
  try {
    toggleGateCamBtn.disabled = true;
    updateCameraStatus('در حال اتصال...', 'yellow');
    const res = await fetch('/api/cctv/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rtspUrl })
    });
    const d = await res.json();
    if (d.success) {
      cctvImage.src = `/api/cctv/stream?t=${Date.now()}`;
      cctvImage.onload = () => syncCanvas(cctvImage, gateCanvas);
      window.addEventListener('resize', () => syncCanvas(cctvImage, gateCanvas));
      isCctvConnected = true;
      toggleGateCamBtn.innerText = 'قطع اتصال دوربین مداربسته';
      updateCameraStatus('متصل (CCTV)', 'green');
      if (gateInterval) clearInterval(gateInterval);
      gateInterval = setInterval(processGateAttendance, 250);
    }
  } catch (e) {
    alert(e.message);
    updateCameraStatus('خطا در CCTV', 'red');
  } finally {
    toggleGateCamBtn.disabled = false;
  }
}

async function disconnectCctv() {
  if (isCctvConnected) {
    try { await fetch('/api/cctv/disconnect', { method: 'POST' }); } catch (e) {}
  }
  isCctvConnected = false;
  cctvImage.src = '';
  if (gateInterval) clearInterval(gateInterval);
  gateInterval = null;
  toggleGateCamBtn.innerText = 'اتصال دوربین مداربسته (CCTV)';
  updateCameraStatus('قطع ارتباط', 'blue');
  gateCtx.clearRect(0, 0, gateCanvas.width, gateCanvas.height);
}

// Face Detection at Gate -> Verify Entry & Mark Present
async function processGateAttendance() {
  const media = isCctvMode ? cctvImage : gateVideo;
  if (isCctvMode) {
    if (!isCctvConnected || !cctvImage.complete || cctvImage.naturalWidth === 0) return;
  } else {
    if (!gateStream || gateVideo.paused || gateVideo.ended) return;
  }

  const detections = await faceapi
    .detectAllFaces(media, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  gateCtx.clearRect(0, 0, gateCanvas.width, gateCanvas.height);
  const now = Date.now();

  detections.forEach(det => {
    const box = det.detection.box;
    const match = matchStudent(det.descriptor);
    const isOk = match !== null;

    // Green Rectangle for Verified Student | Red Rectangle for Not Verified
    gateCtx.lineWidth = 2.5;
    gateCtx.strokeStyle = isOk ? '#10b981' : '#ef4444';
    gateCtx.strokeRect(box.x, box.y, box.width, box.height);

    // Label: Green for verified with name/id, Red for unverified
    const label = isOk
      ? `- Verified: ${match.student.name} (کد: ${match.student.studentCode})`
      : `- تایید نشده (عدم تطابق چهره)`;

    gateCtx.font = 'bold 13px sans-serif';
    const w = gateCtx.measureText(label).width;
    const y = box.y > 24 ? box.y - 6 : box.y + box.height + 20;

    gateCtx.fillStyle = 'rgba(0, 0, 0, 0.82)';
    gateCtx.fillRect(box.x, y - 16, w + 14, 22);

    // Green text if verified, Red text if not verified
    gateCtx.fillStyle = isOk ? '#10b981' : '#ef4444';
    gateCtx.fillText(label, box.x + 7, y - 1);

    if (isOk) {
      const studentId = match.student.id;
      const last = recentVerifications.get(studentId) || 0;
      const alreadyPresent = submittedTodayStudents.has(studentId);

      // Trigger dedicated notification box under webcam
      if (now - last > LOG_COOLDOWN_MS) {
        recentVerifications.set(studentId, now);
        updateGateResult(
          'verified',
          `✓ دانش‌آموز تایید شد: ${match.student.name}`,
          alreadyPresent ? `کد: ${match.student.studentCode} | وضعیت: قبلاً در لیست حاضرین امروز ثبت شده است` : `کد: ${match.student.studentCode} | ساعت ورود: ${new Date().toLocaleTimeString('fa-IR')} (حاضر)`
        );
      }

      // STRICT NO-DUPLICATE SUBMISSION: Only submit once per day for each student
      if (!alreadyPresent) {
        submittedTodayStudents.add(studentId);
        recordAttendance(studentId);
      }
    } else {
      // Unverified face seen - show red warning under webcam
      const lastUnverified = recentVerifications.get('unverified') || 0;
      if (now - lastUnverified > 3500) {
        recentVerifications.set('unverified', now);
        updateGateResult(
          'unverified',
          '✕ چهره تایید نشد (ناشناس)',
          'عدم تطابق چهره با دانش‌آموزان ثبت‌شده در سامانه مدرسه'
        );
      }
    }
  });
}

let resultResetTimer = null;
function updateGateResult(state, title, subtitle) {
  if (!gateResultCard) return;

  gateResultCard.className = `gate-result-card ${state}-state`;
  if (gateResultIcon) {
    gateResultIcon.innerText = state === 'verified' ? '✓' : (state === 'unverified' ? '✕' : '👤');
  }
  if (gateResultTitle) gateResultTitle.innerText = title;
  if (gateResultSub) gateResultSub.innerText = subtitle;

  if (resultResetTimer) clearTimeout(resultResetTimer);
  resultResetTimer = setTimeout(resetGateResultCard, 3500);
}

function resetGateResultCard() {
  if (!gateResultCard) return;
  gateResultCard.className = 'gate-result-card neutral-state';
  if (gateResultIcon) gateResultIcon.innerText = '👤';
  if (gateResultTitle) gateResultTitle.innerText = 'روبروی دوربین قرار بگیرید';
  if (gateResultSub) gateResultSub.innerText = 'سیستم در حال رصد و ثبت ورود خودکار است';
}

async function recordAttendance(studentId) {
  try {
    const res = await fetch('/api/attendance/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    const d = await res.json();
    if (d.success) {
      await loadTodayAttendance();
    }
  } catch (e) {
    console.error(e);
  }
}

// 2. DAILY ATTENDANCE LOAD & STATS
async function loadTodayAttendance() {
  try {
    const res = await fetch('/api/attendance/today');
    const d = await res.json();
    if (d.success) {
      todayAttendance = d.records;

      // Sync local set of present students
      submittedTodayStudents.clear();
      todayAttendance.forEach(s => {
        if (s.status === 'PRESENT') submittedTodayStudents.add(s.id);
      });

      // Update gate quick stats
      gatePresentCount.innerText = d.stats.present;
      gateAbsentCount.innerText = d.stats.absent;
      gateTotalCount.innerText = d.stats.total;

      // Update attendance tab badges
      attPresentNum.innerText = d.stats.present;
      attAbsentNum.innerText = d.stats.absent;
      attTotalNum.innerText = d.stats.total;

      if (filterAbsentCount) filterAbsentCount.innerText = d.stats.absent;
      if (filterPresentCount) filterPresentCount.innerText = d.stats.present;

      renderAttendanceTable();
      renderQuickLogs();
    }
  } catch (e) {
    console.error(e);
  }
}

function renderQuickLogs() {
  const presents = todayAttendance.filter(s => s.status === 'PRESENT');
  if (!presents || presents.length === 0) {
    quickLogsList.innerHTML = `<div class="empty-state">هنوز کسی ثبت ورود نکرده است.</div>`;
    return;
  }
  quickLogsList.innerHTML = '';
  presents.slice(0, 10).forEach(s => {
    const time = s.entryTime ? new Date(s.entryTime).toLocaleTimeString('fa-IR') : '';
    const div = document.createElement('div');
    div.className = 'log-item';
    div.innerHTML = `
      <div>
        <span class="verified">✓ ${s.name}</span>
        <span style="color:var(--text-sub); font-size:0.75rem; margin-inline-start:6px;">(${s.grade})</span>
      </div>
      <span class="time">${time}</span>
    `;
    quickLogsList.appendChild(div);
  });
}

function renderAttendanceTable() {
  const query = (attendanceSearchInput.value || '').trim().toLowerCase();
  let list = todayAttendance;

  // Filter by Status Tab (All / Absent / Present)
  if (currentAttendanceFilter === 'ABSENT') {
    list = list.filter(s => s.status === 'ABSENT');
  } else if (currentAttendanceFilter === 'PRESENT') {
    list = list.filter(s => s.status === 'PRESENT');
  }

  // Filter by Search Query
  if (query) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.studentCode && s.studentCode.includes(query)) ||
      (s.grade && s.grade.toLowerCase().includes(query))
    );
  }

  if (list.length === 0) {
    const emptyMsg = currentAttendanceFilter === 'ABSENT'
      ? 'خوشبختانه هیچ دانش‌آموز غایبی وجود ندارد (همه حاضرند).'
      : 'دانش‌آموزی مطابق فیلتر یافت نشد.';
    attendanceTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">${emptyMsg}</td></tr>`;
    return;
  }

  attendanceTableBody.innerHTML = '';
  list.forEach(s => {
    const isPresent = s.status === 'PRESENT';
    const timeStr = s.entryTime ? new Date(s.entryTime).toLocaleTimeString('fa-IR') : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${s.photoUrl || ''}" class="thumb-img"></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.studentCode || '-'}</td>
      <td><span class="tag-role">${s.grade}</span></td>
      <td>
        <span class="status-pill-badge ${isPresent ? 'present' : 'absent'}">
          ${isPresent ? 'حاضر (تایید چهره)' : 'غایب'}
        </span>
      </td>
      <td><span class="${isPresent ? 'time-val' : ''}">${timeStr}</span></td>
      <td>
        <button class="btn-toggle-att" data-id="${s.id}" data-current="${s.status}">
          ${isPresent ? 'ثبت غیبت' : 'ثبت دستی حضور'}
        </button>
      </td>
    `;

    const toggleBtn = tr.querySelector('.btn-toggle-att');
    toggleBtn.onclick = async () => {
      const nextStatus = isPresent ? 'ABSENT' : 'PRESENT';
      try {
        toggleBtn.disabled = true;
        const res = await fetch('/api/attendance/manual', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ studentId: s.id, status: nextStatus })
        });
        const d = await res.json();
        if (res.status === 403) {
          alert('خطای دسترسی: لطفا ابتدا با دکمه "ورود مدیر" وارد شوید.');
          return;
        }
        if (!d.success) {
          alert('خطا در تغییر وضعیت: ' + (d.error || 'ناشناخته'));
          return;
        }
        await loadTodayAttendance();
      } catch (err) {
        alert('خطای ارتباط با سرور: ' + err.message);
      } finally {
        toggleBtn.disabled = false;
      }
    };

    attendanceTableBody.appendChild(tr);
  });
}

// Manual present submit by student ID or Code
const manualStudentInput = document.getElementById('manualStudentInput');
const manualPresentBtn = document.getElementById('manualPresentBtn');

if (manualPresentBtn && manualStudentInput) {
  const submitManualPresent = async () => {
    const val = manualStudentInput.value.trim();
    if (!val) {
      alert('لطفا شناسه یا کد دانش‌آموزی را وارد کنید');
      manualStudentInput.focus();
      return;
    }

    try {
      manualPresentBtn.disabled = true;
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ studentId: val, status: 'PRESENT' })
      });
      const d = await res.json();

      if (res.status === 403) {
        alert('خطای دسترسی: لطفا ابتدا با دکمه "ورود مدیر" وارد شوید.');
        return;
      }

      if (d.success) {
        manualStudentInput.value = '';
        alert(`دانش‌آموز "${d.student.name}" (کد: ${d.student.studentCode}) با موفقیت حاضر ثبت شد.`);
        await loadTodayAttendance();
      } else {
        alert('خطا: ' + (d.error || 'دانش‌آموز یافت نشد'));
      }
    } catch (err) {
      alert('خطا در ثبت: ' + err.message);
    } finally {
      manualPresentBtn.disabled = false;
    }
  };

  manualPresentBtn.addEventListener('click', submitManualPresent);
  manualStudentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitManualPresent();
  });
}

// Attendance filter button events
document.querySelectorAll('.filter-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAttendanceFilter = btn.getAttribute('data-filter');
    renderAttendanceTable();
  });
});

attendanceSearchInput.addEventListener('input', renderAttendanceTable);
refreshAttendanceBtn.addEventListener('click', loadTodayAttendance);

// 3. STUDENT ENROLLMENT (3 SIMPLE STEPS)
toggleEnrollCamBtn.addEventListener('click', () => {
  if (enrollStream) stopEnrollCam();
  else startEnrollCam();
});

async function startEnrollCam() {
  try {
    enrollStream = await navigator.mediaDevices.getUserMedia({ video: true });
    enrollVideo.srcObject = enrollStream;
    await enrollVideo.play();
    toggleEnrollCamBtn.innerText = 'خاموش کردن اسکنر';

    const onMeta = () => syncCanvas(enrollVideo, enrollCanvas);
    enrollVideo.onloadedmetadata = onMeta;
    window.addEventListener('resize', onMeta);
    onMeta();

    if (enrollInterval) clearInterval(enrollInterval);
    enrollInterval = setInterval(processEnroll, 200);
  } catch (e) {
    alert(e.message);
  }
}

function stopEnrollCam() {
  if (enrollStream) {
    enrollStream.getTracks().forEach(t => t.stop());
    enrollStream = null;
  }
  if (enrollInterval) clearInterval(enrollInterval);
  enrollInterval = null;
  toggleEnrollCamBtn.innerText = 'روشن کردن اسکنر چهره';
  enrollCtx.clearRect(0, 0, enrollCanvas.width, enrollCanvas.height);
  currentEnrollDetection = null;
  nextStepBtn.disabled = true;
}

function extractCrop(vid, box) {
  const pad = box.width * 0.2;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(vid.videoWidth - x, box.width + pad * 2);
  const h = Math.min(vid.videoHeight - y, box.height + pad * 2);

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(vid, x, y, w, h, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.9);
}

async function processEnroll() {
  if (!enrollStream || enrollVideo.paused || enrollVideo.ended) return;

  const det = await faceapi
    .detectSingleFace(enrollVideo, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  enrollCtx.clearRect(0, 0, enrollCanvas.width, enrollCanvas.height);

  if (det) {
    const box = det.detection.box;
    enrollCtx.fillStyle = '#10b981';
    det.landmarks.positions.forEach(p => enrollCtx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5));

    enrollCtx.lineWidth = 2;
    enrollCtx.strokeStyle = '#10b981';
    enrollCtx.strokeRect(box.x, box.y, box.width, box.height);

    currentEnrollDetection = det;
    if (enrollStep <= 3) nextStepBtn.disabled = false;
  } else {
    currentEnrollDetection = null;
    nextStepBtn.disabled = true;
  }
}

nextStepBtn.addEventListener('click', () => {
  if (!currentEnrollDetection) return;

  capturedDescriptors.push(Array.from(currentEnrollDetection.descriptor));
  if (enrollStep === 1) {
    bestFaceCrop = extractCrop(enrollVideo, currentEnrollDetection.detection.box);
  }

  enrollStep++;
  updateStepUI();
});

function updateStepUI() {
  dot1.className = 'step-dot' + (enrollStep >= 1 ? (enrollStep > 1 ? ' done' : ' active') : '');
  dot2.className = 'step-dot' + (enrollStep >= 2 ? (enrollStep > 2 ? ' done' : ' active') : '');
  dot3.className = 'step-dot' + (enrollStep >= 3 ? (enrollStep > 3 ? ' done' : ' active') : '');

  if (enrollStep === 1) guideStepPrompt.innerText = 'مرحله ۱ از ۳: روبروی دوربین نگاه کنید';
  else if (enrollStep === 2) guideStepPrompt.innerText = 'مرحله ۲ از ۳: سر را کمی به سمت راست بچرخانید';
  else if (enrollStep === 3) guideStepPrompt.innerText = 'مرحله ۳ از ۳: سر را کمی به سمت چپ بچرخانید';
  else {
    guideStepPrompt.innerText = 'اسکن کامل شد! مشخصات دانش‌آموز را تکمیل و ثبت نمایید';
    nextStepBtn.classList.add('hidden');
    submitMemberBtn.classList.remove('hidden');
  }
}

submitMemberBtn.addEventListener('click', async () => {
  const name = memberNameInput.value.trim();
  const studentCode = studentCodeInput.value.trim();
  const grade = studentGradeInput.value.trim() || 'کلاس عمومی';

  if (!name) {
    alert('لطفا نام و نام خانوادگی دانش‌آموز را بنویسید');
    memberNameInput.focus();
    return;
  }

  if (!capturedDescriptors || capturedDescriptors.length === 0) {
    alert('خطا: چهره‌ای اسکن نشده است. لطفاً اسکنر را روشن کرده و ۳ مرحله اسکن را انجام دهید.');
    return;
  }

  try {
    submitMemberBtn.disabled = true;
    submitMemberBtn.innerText = 'در حال ذخیره...';

    const res = await fetch('/api/students/register', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name,
        studentCode,
        grade,
        photo: bestFaceCrop,
        descriptors: capturedDescriptors,
        descriptor: capturedDescriptors[0]
      })
    });

    const data = await res.json();

    if (res.status === 403) {
      alert('خطای امنیتی: نشست مدیر منقضی شده است. لطفا یک‌بار خارج شده و مجدداً وارد شوید.');
      adminToken = null;
      localStorage.removeItem('school_admin_token');
      updateAdminUI();
      return;
    }

    if (data.success) {
      alert(`دانش‌آموز "${name}" با موفقیت ثبت شد.`);
      memberNameInput.value = '';
      studentCodeInput.value = '';
      studentGradeInput.value = '';
      enrollStep = 1;
      capturedDescriptors.length = 0;
      bestFaceCrop = null;
      nextStepBtn.classList.remove('hidden');
      submitMemberBtn.classList.add('hidden');
      updateStepUI();
      await loadStudents();
      await loadTodayAttendance();
    } else {
      alert('خطا در ثبت: ' + (data.error || 'داده نامعتبر است'));
    }
  } catch (err) {
    console.error(err);
    alert('خطا در ارتباط با سرور: ' + err.message);
  } finally {
    submitMemberBtn.innerText = 'ثبت نام در سامانه مدرسه';
    submitMemberBtn.disabled = false;
  }
});

// 4. STUDENTS DATABASE & ADMIN MANAGEMENT (Search, Modify, Delete)
async function loadStudents() {
  const res = await fetch('/api/students');
  const d = await res.json();
  if (d.success) {
    enrolledStudents = d.students;
    membersTotalBadge.innerText = enrolledStudents.length;
    adminCountDisplay.innerText = enrolledStudents.length;
    renderMiniTable();
    renderAdminTable();
  }
}

function renderMiniTable() {
  if (enrolledStudents.length === 0) {
    enrollMiniTableBody.innerHTML = `<tr><td colspan="3" class="empty-state">هنوز دانش‌آموزی ثبت نشده است.</td></tr>`;
    return;
  }
  enrollMiniTableBody.innerHTML = '';
  enrolledStudents.slice(0, 8).forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${s.photoUrl || ''}" class="thumb-img"></td>
      <td><strong>${s.name}</strong></td>
      <td style="color:var(--text-sub); font-size:0.75rem;">${s.studentCode || s.id}</td>
    `;
    enrollMiniTableBody.appendChild(tr);
  });
}

function renderAdminTable() {
  const query = (memberSearchInput.value || '').trim().toLowerCase();
  let list = enrolledStudents;

  if (query) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(query) ||
      (s.studentCode && s.studentCode.includes(query)) ||
      (s.id && s.id.includes(query)) ||
      (s.grade && s.grade.toLowerCase().includes(query))
    );
  }

  if (list.length === 0) {
    adminTableBody.innerHTML = `<tr><td colspan="6" class="empty-state">پرونده‌ای یافت نشد.</td></tr>`;
    return;
  }

  adminTableBody.innerHTML = '';
  list.forEach(s => {
    const regDate = new Date(s.registeredAt).toLocaleDateString('fa-IR');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${s.photoUrl || ''}" class="thumb-img"></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.studentCode || '-'}</td>
      <td><span class="tag-role">${s.grade}</span></td>
      <td>${regDate}</td>
      <td>
        <button class="btn-action edit-btn" data-id="${s.id}">✏️ ویرایش</button>
        <button class="btn-action del delete-btn" data-id="${s.id}">🗑️ حذف</button>
      </td>
    `;

    tr.querySelector('.edit-btn').onclick = () => openEditModal(s);
    tr.querySelector('.delete-btn').onclick = () => deleteStudent(s.id);
    adminTableBody.appendChild(tr);
  });
}

memberSearchInput.addEventListener('input', renderAdminTable);

function openEditModal(student) {
  editMemberId.value = student.id;
  editMemberName.value = student.name;
  editStudentCode.value = student.studentCode || '';
  editStudentGrade.value = student.grade || '';
  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
}

closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

saveEditBtn.addEventListener('click', async () => {
  const id = editMemberId.value;
  const name = editMemberName.value.trim();
  const studentCode = editStudentCode.value.trim();
  const grade = editStudentGrade.value.trim();

  if (!name) {
    alert('نام دانش‌آموز نمی‌تواند خالی باشد');
    return;
  }

  try {
    saveEditBtn.disabled = true;
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, studentCode, grade })
    });
    const d = await res.json();
    if (d.success) {
      closeEditModal();
      await loadStudents();
      await loadTodayAttendance();
    }
  } catch (e) {
    alert('خطا در ذخیره تغییرات: ' + e.message);
  } finally {
    saveEditBtn.disabled = false;
  }
});

async function deleteStudent(id) {
  if (!confirm('آیا از حذف پرونده این دانش‌آموز مطمئن هستید؟ تصویر و اطلاعات چهره نیز به طور کامل پاک خواهد شد.')) return;
  await fetch(`/api/students/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  await loadStudents();
  await loadTodayAttendance();
}

// 5. NAVIGATION TABS
function switchTab(tab) {
  currentTab = tab;
  [tabGateBtn, tabEnrollBtn, tabAttendanceBtn, tabAdminBtn, tabSettingsBtn].forEach(b => { if (b) b.classList.remove('active'); });
  [tabGate, tabEnroll, tabAttendance, tabAdmin, tabSettings].forEach(t => { if (t) t.classList.remove('active'); });

  if (tab === 'gate') {
    tabGateBtn.classList.add('active');
    tabGate.classList.add('active');
    stopEnrollCam();
    // Keep gate camera always on when returning to gate
    if (!gateStream && !isCctvConnected) {
      startGateCamera();
    }
  } else if (tab === 'enroll') {
    tabEnrollBtn.classList.add('active');
    tabEnroll.classList.add('active');
    stopGateCamera();
    disconnectCctv();
  } else if (tab === 'attendance') {
    tabAttendanceBtn.classList.add('active');
    tabAttendance.classList.add('active');
    stopGateCamera();
    disconnectCctv();
    stopEnrollCam();
    loadTodayAttendance();
  } else if (tab === 'admin') {
    tabAdminBtn.classList.add('active');
    tabAdmin.classList.add('active');
    stopGateCamera();
    disconnectCctv();
    stopEnrollCam();
    loadStudents();
  } else if (tab === 'settings') {
    if (tabSettingsBtn) tabSettingsBtn.classList.add('active');
    if (tabSettings) tabSettings.classList.add('active');
    stopEnrollCam();
  }
}

tabGateBtn.addEventListener('click', () => switchTab('gate'));
tabEnrollBtn.addEventListener('click', () => switchTab('enroll'));
tabAttendanceBtn.addEventListener('click', () => switchTab('attendance'));
tabAdminBtn.addEventListener('click', () => switchTab('admin'));
if (tabSettingsBtn) tabSettingsBtn.addEventListener('click', () => switchTab('settings'));

window.addEventListener('DOMContentLoaded', () => {
  updateAdminUI();
  initModels();
});
