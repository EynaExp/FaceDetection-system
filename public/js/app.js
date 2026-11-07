// School Attendance & Face Verification Controller
let currentLang = localStorage.getItem('school_app_lang') || 'fa';
let modelsLoaded = false;
let enrolledStudents = [];
let todayAttendance = [];
let currentTab = 'gate';

const i18n = {
  fa: {
    brandOrg: "سامانه ابری هوشمند مدارس",
    brandTitle: "کنترل تردد و حضور و غیاب",
    tabGate: "گیت ورودی",
    tabEnroll: "ثبت چهره جدید",
    tabAttendance: "دفتر حضور و غیاب",
    tabAdmin: "پرونده دانش‌آموزان",
    tabSettings: "تنظیمات",
    changePass: "تغییر رمز",
    adminLogin: "ورود مدیر",
    adminLogout: "خروج مدیر",
    loading: "در حال آماده‌سازی...",
    ready: "سامانه مدرسه آماده است",
    errLoading: "خطا در بارگذاری مدل‌ها",
    gatePromptDefault: "روبروی دوربین قرار بگیرید",
    gateSubDefault: "سیستم در حال رصد و ثبت ورود خودکار است",
    verifiedTitle: "دانش‌آموز تایید شد: ",
    verifiedAlready: "وضعیت: قبلاً در لیست حاضرین امروز ثبت شده است",
    verifiedPresent: "ساعت ورود: ",
    unverifiedTitle: "چهره تایید نشد (ناشناس)",
    unverifiedSub: "عدم تطابق چهره با دانش‌آموزان ثبت‌شده در سامانه مدرسه",
    toggleCamStart: "روشن کردن دوربین گیت",
    toggleCamStop: "خاموش کردن دوربین گیت",
    cctvConnect: "اتصال دوربین مداربسته (CCTV)",
    cctvDisconnect: "قطع اتصال دوربین مداربسته",
    camActive: "فعال (وب‌کم)",
    camStopped: "متوقف",
    camConnecting: "در حال اتصال...",
    camCctvActive: "متصل (CCTV)",
    step1: "مرحله ۱ از ۳: روبروی دوربین نگاه کنید",
    step2: "مرحله ۲ از ۳: سر را کمی به سمت راست بچرخانید",
    step3: "مرحله ۳ از ۳: سر را کمی به سمت چپ بچرخانید",
    stepDone: "اسکن کامل شد! مشخصات دانش‌آموز را تکمیل و ثبت نمایید",
    scannerStart: "روشن کردن اسکنر چهره",
    scannerStop: "خاموش کردن اسکنر",
    namePlaceholder: "نام و نام خانوادگی دانش‌آموز *",
    codePlaceholder: "شماره دانش‌آموزی / کدملی",
    gradePlaceholder: "کلاس / پایه (مثال: دهم تجربی)",
    btnCaptureAngle: "ثبت این زاویه",
    btnSubmitFinal: "ثبت نام در سامانه مدرسه",
    recentlyEnrolled: "دانش‌آموزان اخیراً ثبت‌شده",
    attSheetTitle: "دفتر حضور و غیاب روزانه مدرسه",
    presentLbl: "حاضر: ",
    absentLbl: "غایب: ",
    totalLbl: "کل: ",
    manualInputPh: "ثبت حضور با شناسه یا کد دانش‌آموز...",
    btnManualPresent: "+ ثبت حاضر",
    filterAll: "همه دانش‌آموزان",
    filterAbsent: "غایبین امروز",
    filterPresent: "حاضرین",
    attSearchPh: "جستجوی نام، کد یا کلاس...",
    btnRefreshAtt: "بروزرسانی وضعیت",
    thPhoto: "تصویر",
    thName: "نام دانش‌آموز",
    thCode: "کد دانش‌آموزی",
    thGrade: "کلاس / پایه",
    thStatus: "وضعیت امروز",
    thTime: "ساعت ثبت ورود",
    thAction: "تغییر وضعیت",
    statusPresentBadge: "حاضر (تایید چهره)",
    statusAbsentBadge: "غایب",
    btnMarkAbsent: "ثبت غیبت",
    btnMarkPresent: "ثبت دستی حضور",
    settingsTitle: "تنظیمات دوربین گیت و سیستم",
    settingsSourceLbl: "منبع تصویر گیت ورودی:",
    optWebcam: "وب‌کم محلی (USB / Built-in)",
    optCctv: "دوربین مداربسته تحت شبکه (CCTV / RTSP)",
    settingsDeviceLbl: "انتخاب دستگاه وب‌کم:",
    settingsRtspLbl: "آدرس استریم دوربین مداربسته (RTSP Stream URL):",
    settingsCamStatusLbl: "وضعیت اتصال دوربین گیت:",
    settingsThresholdLbl: "آستانه دقت تشخیص چهره (Match Threshold):",
    settingsThresholdHint: "مقادیر کمتر = سخت‌گیرانه‌تر و دقیق‌تر | مقادیر بیشتر = حساس‌تر در زوایای مختلف صورت",
    adminSearchPh: "جستجوی دانش‌آموز (نام، کدملی، شناسه)...",
    adminTotalCountLbl: "کل پرونده‌ها: ",
    thRegDate: "تاریخ ثبت‌نام",
    thAdminActions: "عملیات ادمین",
    btnEdit: "ویرایش",
    btnDelete: "حذف",
    emptyNoData: "داده‌ای یافت نشد.",
    emptyNoStudents: "دانش‌آموزی ثبت نشده است.",
    emptyNoLogs: "هنوز کسی ثبت ورود نکرده است.",
    modalEditTitle: "ویرایش پرونده دانش‌آموز",
    modalEditName: "نام و نام خانوادگی:",
    modalEditCode: "کد دانش‌آموزی / کدملی:",
    modalEditGrade: "کلاس / پایه تحصیلی:",
    btnCancel: "انصراف",
    btnSaveEdit: "ذخیره تغییرات",
    modalLoginTitle: "ورود مدیریت مدرسه",
    modalLoginHint: "جهت دسترسی به ثبت دانش‌آموزان، دفتر غایبین و ویرایش پرونده‌ها رمز عبور مدیریت را وارد کنید.",
    modalLoginPassLbl: "رمز عبور مدیریت:",
    modalLoginBtn: "ورود به پنل",
    modalChangePassTitle: "تغییر رمز عبور مدیریت",
    modalOldPassLbl: "رمز عبور فعلی:",
    modalNewPassLbl: "رمز عبور جدید:",
    btnSaveNewPass: "ثبت رمز جدید"
  },
  en: {
    brandOrg: "Cloud Smart School System",
    brandTitle: "Access Control & Attendance",
    tabGate: "Entrance Gate",
    tabEnroll: "Register Face",
    tabAttendance: "Daily Attendance",
    tabAdmin: "Student Directory",
    tabSettings: "Settings",
    changePass: "Change Password",
    adminLogin: "Admin Login",
    adminLogout: "Admin Logout",
    loading: "Loading models...",
    ready: "School Attendance System Ready",
    errLoading: "Error loading models",
    gatePromptDefault: "Please stand in front of camera",
    gateSubDefault: "System is monitoring and recording entries automatically",
    verifiedTitle: "Student Verified: ",
    verifiedAlready: "Status: Already logged as present today",
    verifiedPresent: "Entry time: ",
    unverifiedTitle: "Face Not Verified (Unrecognized)",
    unverifiedSub: "No matching registered student found in school database",
    toggleCamStart: "Turn On Gate Camera",
    toggleCamStop: "Turn Off Gate Camera",
    cctvConnect: "Connect CCTV Camera",
    cctvDisconnect: "Disconnect CCTV",
    camActive: "Active (Webcam)",
    camStopped: "Stopped",
    camConnecting: "Connecting...",
    camCctvActive: "Connected (CCTV)",
    step1: "Step 1 of 3: Look straight at camera",
    step2: "Step 2 of 3: Turn head slightly to the right",
    step3: "Step 3 of 3: Turn head slightly to the left",
    stepDone: "Scan complete! Fill student details and submit",
    scannerStart: "Start Face Scanner",
    scannerStop: "Stop Face Scanner",
    namePlaceholder: "Student Full Name *",
    codePlaceholder: "Student ID / Code",
    gradePlaceholder: "Class / Grade (e.g. 10th Math)",
    btnCaptureAngle: "Capture Angle",
    btnSubmitFinal: "Register in School System",
    recentlyEnrolled: "Recently Enrolled Students",
    attSheetTitle: "School Daily Attendance Ledger",
    presentLbl: "Present: ",
    absentLbl: "Absent: ",
    totalLbl: "Total: ",
    manualInputPh: "Manual entry by Student ID / Code...",
    btnManualPresent: "+ Mark Present",
    filterAll: "All Students",
    filterAbsent: "Absent Today",
    filterPresent: "Present",
    attSearchPh: "Search name, code, or class...",
    btnRefreshAtt: "Refresh Status",
    thPhoto: "Photo",
    thName: "Student Name",
    thCode: "Student ID",
    thGrade: "Class / Grade",
    thStatus: "Today's Status",
    thTime: "Entry Time",
    thAction: "Toggle Status",
    statusPresentBadge: "Present (Face Verified)",
    statusAbsentBadge: "Absent",
    btnMarkAbsent: "Mark Absent",
    btnMarkPresent: "Mark Present",
    settingsTitle: "Gate Camera & System Settings",
    settingsSourceLbl: "Gate Video Source:",
    optWebcam: "Local Webcam (USB / Built-in)",
    optCctv: "Network IP Camera (CCTV / RTSP)",
    settingsDeviceLbl: "Select Webcam Device:",
    settingsRtspLbl: "CCTV Stream Address (RTSP Stream URL):",
    settingsCamStatusLbl: "Gate Camera Connection Status:",
    settingsThresholdLbl: "Face Recognition Match Threshold:",
    settingsThresholdHint: "Lower value = Stricter & Higher Accuracy | Higher value = More Sensitive to angles",
    adminSearchPh: "Search student (name, ID, code)...",
    adminTotalCountLbl: "Total Directory: ",
    thRegDate: "Registration Date",
    thAdminActions: "Admin Actions",
    btnEdit: "Edit",
    btnDelete: "Delete",
    emptyNoData: "No data found.",
    emptyNoStudents: "No students registered yet.",
    emptyNoLogs: "No entries logged yet.",
    modalEditTitle: "Edit Student Profile",
    modalEditName: "Full Name:",
    modalEditCode: "Student ID / Code:",
    modalEditGrade: "Class / Grade:",
    btnCancel: "Cancel",
    btnSaveEdit: "Save Changes",
    modalLoginTitle: "School Admin Login",
    modalLoginHint: "Enter administrator password to access registration, directory, and attendance ledger.",
    modalLoginPassLbl: "Admin Password:",
    modalLoginBtn: "Login to Dashboard",
    modalChangePassTitle: "Change Admin Password",
    modalOldPassLbl: "Current Password:",
    modalNewPassLbl: "New Password:",
    btnSaveNewPass: "Save New Password"
  }
};

function applyTranslations() {
  const t = i18n[currentLang];
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

  // Toggle button indicator text
  if (langToggleBtn) {
    langToggleBtn.innerText = currentLang === 'fa' ? 'EN' : 'FA';
    langToggleBtn.title = currentLang === 'fa' ? 'Switch to English' : 'تغییر به فارسی';
  }

  // Header Brand
  const brandOrg = document.querySelector('.brand-org');
  if (brandOrg) brandOrg.innerText = t.brandOrg;
  const brandTitle = document.querySelector('.brand-title');
  if (brandTitle) brandTitle.innerText = t.brandTitle;

  // Nav Items
  if (tabGateBtn) {
    tabGateBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> ${t.tabGate}`;
  }
  if (tabEnrollBtn) {
    tabEnrollBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> ${t.tabEnroll}`;
  }
  if (tabAttendanceBtn) {
    tabAttendanceBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg> ${t.tabAttendance}`;
  }
  if (tabAdminBtn) {
    tabAdminBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> ${t.tabAdmin}`;
  }
  if (tabSettingsBtn) {
    tabSettingsBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> ${t.tabSettings}`;
  }

  // Top Action Buttons
  if (changePassBtn) {
    changePassBtn.querySelector('span:last-child').innerText = t.changePass;
  }
  updateAdminUI();

  // Gate Defaults
  if (gateResultTitle && gateResultCard && gateResultCard.classList.contains('neutral-state')) {
    gateResultTitle.innerText = t.gatePromptDefault;
    gateResultSub.innerText = t.gateSubDefault;
  }

  // Enrollment Tab
  const enrollCardTitle = document.querySelector('#tabEnroll h3');
  if (enrollCardTitle) enrollCardTitle.innerText = t.brandTitle;
  if (toggleEnrollCamBtn) toggleEnrollCamBtn.innerText = enrollStream ? t.scannerStop : t.scannerStart;
  if (memberNameInput) memberNameInput.placeholder = t.namePlaceholder;
  if (studentCodeInput) studentCodeInput.placeholder = t.codePlaceholder;
  if (studentGradeInput) studentGradeInput.placeholder = t.gradePlaceholder;
  if (nextStepBtn) nextStepBtn.innerText = t.btnCaptureAngle;
  if (submitMemberBtn) submitMemberBtn.innerText = t.btnSubmitFinal;
  updateStepUI();

  // Attendance Tab
  const attTitle = document.querySelector('.attendance-header h3');
  if (attTitle) attTitle.innerText = t.attSheetTitle;
  if (manualStudentInput) manualStudentInput.placeholder = t.manualInputPh;
  if (manualPresentBtn) manualPresentBtn.innerText = t.btnManualPresent;

  const filterBtns = document.querySelectorAll('.filter-tab-btn');
  if (filterBtns[0]) filterBtns[0].innerText = t.filterAll;
  if (filterBtns[1]) filterBtns[1].innerHTML = `${t.filterAbsent} (<span id="filterAbsentCount">${filterAbsentCount ? filterAbsentCount.innerText : '0'}</span>)`;
  if (filterBtns[2]) filterBtns[2].innerHTML = `${t.filterPresent} (<span id="filterPresentCount">${filterPresentCount ? filterPresentCount.innerText : '0'}</span>)`;
  if (attendanceSearchInput) attendanceSearchInput.placeholder = t.attSearchPh;
  if (refreshAttendanceBtn) refreshAttendanceBtn.innerText = t.btnRefreshAtt;

  // Attendance Table Headers
  const attThs = document.querySelectorAll('#tabAttendance .simple-table th');
  if (attThs.length >= 7) {
    attThs[0].innerText = t.thPhoto;
    attThs[1].innerText = t.thName;
    attThs[2].innerText = t.thCode;
    attThs[3].innerText = t.thGrade;
    attThs[4].innerText = t.thStatus;
    attThs[5].innerText = t.thTime;
    attThs[6].innerText = t.thAction;
  }

  // Settings Tab
  const settingsTitle = document.querySelector('#tabSettings h3');
  if (settingsTitle) settingsTitle.innerText = t.settingsTitle;
  const settingsLabels = document.querySelectorAll('#tabSettings .form-group label');
  if (settingsLabels[0]) settingsLabels[0].innerText = t.settingsSourceLbl;
  if (sourceSelect && sourceSelect.options.length >= 2) {
    sourceSelect.options[0].text = t.optWebcam;
    sourceSelect.options[1].text = t.optCctv;
  }
  if (settingsLabels[1]) settingsLabels[1].innerText = t.settingsDeviceLbl;
  if (settingsLabels[2]) settingsLabels[2].innerText = t.settingsRtspLbl;
  if (settingsLabels[3]) settingsLabels[3].innerText = t.settingsCamStatusLbl;
  if (settingsLabels[4]) settingsLabels[4].innerText = t.settingsThresholdLbl;
  const thresholdHint = document.querySelector('#tabSettings p');
  if (thresholdHint) thresholdHint.innerText = t.settingsThresholdHint;

  // Admin Directory Tab
  if (memberSearchInput) memberSearchInput.placeholder = t.adminSearchPh;
  const adminThs = document.querySelectorAll('#tabAdmin .simple-table th');
  if (adminThs.length >= 6) {
    adminThs[0].innerText = t.thPhoto;
    adminThs[1].innerText = t.thName;
    adminThs[2].innerText = t.thCode;
    adminThs[3].innerText = t.thGrade;
    adminThs[4].innerText = t.thRegDate;
    adminThs[5].innerText = t.thAdminActions;
  }

  // Modals
  const editModalHeader = document.querySelector('#editModal .modal-header h3');
  if (editModalHeader) editModalHeader.innerText = t.modalEditTitle;
  const editLabels = document.querySelectorAll('#editModal label');
  if (editLabels[0]) editLabels[0].innerText = t.modalEditName;
  if (editLabels[1]) editLabels[1].innerText = t.modalEditCode;
  if (editLabels[2]) editLabels[2].innerText = t.modalEditGrade;
  if (cancelEditBtn) cancelEditBtn.innerText = t.btnCancel;
  if (saveEditBtn) saveEditBtn.innerText = t.btnSaveEdit;

  const loginTitle = document.querySelector('#loginModal .modal-header h3');
  if (loginTitle) loginTitle.innerText = t.modalLoginTitle;
  const loginHint = document.querySelector('#loginModal .modal-body p');
  if (loginHint) loginHint.innerText = t.modalLoginHint;
  const loginPassLbl = document.querySelector('#loginModal label');
  if (loginPassLbl) loginPassLbl.innerText = t.modalLoginPassLbl;
  if (cancelLoginBtn) cancelLoginBtn.innerText = t.btnCancel;
  if (submitLoginBtn) submitLoginBtn.innerText = t.modalLoginBtn;

  const changePassTitle = document.querySelector('#changePassModal .modal-header h3');
  if (changePassTitle) changePassTitle.innerText = t.modalChangePassTitle;
  const changePassLabels = document.querySelectorAll('#changePassModal label');
  if (changePassLabels[0]) changePassLabels[0].innerText = t.modalOldPassLbl;
  if (changePassLabels[1]) changePassLabels[1].innerText = t.modalNewPassLbl;
  if (cancelChangePassBtn) cancelChangePassBtn.innerText = t.btnCancel;
  if (saveChangePassBtn) saveChangePassBtn.innerText = t.btnSaveNewPass;

  if (typeof renderAttendanceTable === 'function') renderAttendanceTable();
  if (typeof renderAdminTable === 'function') renderAdminTable();
}

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
const editStudentNationalId = document.getElementById('editStudentNationalId');
const editStudentCode = document.getElementById('editStudentCode');
const editStudentGrade = document.getElementById('editStudentGrade');
const editParentPhone = document.getElementById('editParentPhone');
const editParentBaleId = document.getElementById('editParentBaleId');

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

// School Hours, Bale & Backup Settings Elements
const schoolOpenTimeInput = document.getElementById('schoolOpenTimeInput');
const schoolCloseTimeInput = document.getElementById('schoolCloseTimeInput');
const saveHoursBtn = document.getElementById('saveHoursBtn');
const baleTokenInput = document.getElementById('baleTokenInput');
const testBaleConnBtn = document.getElementById('testBaleConnBtn');
const baleTestStatus = document.getElementById('baleTestStatus');
const baleActiveChk = document.getElementById('baleActiveChk');
const autoAbsentAlertChk = document.getElementById('autoAbsentAlertChk');
const autoAbsentTimeInput = document.getElementById('autoAbsentTimeInput');
const saveBaleBtn = document.getElementById('saveBaleBtn');
const baleDisplayUsername = document.getElementById('baleDisplayUsername');
const baleLinkWrap = document.getElementById('baleLinkWrap');
const baleDisplayLink = document.getElementById('baleDisplayLink');
const exportBackupBtn = document.getElementById('exportBackupBtn');
const importZipInput = document.getElementById('importZipInput');
const triggerImportBtn = document.getElementById('triggerImportBtn');

if (langToggleBtn) {
  langToggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'fa' ? 'en' : 'fa';
    localStorage.setItem('school_app_lang', currentLang);
    applyTranslations();
  });
}

// Admin Authentication Elements
const adminAuthBtn = document.getElementById('adminAuthBtn');
const adminAuthSvg = document.getElementById('adminAuthSvg');
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
    if (adminAuthSvg) {
      adminAuthSvg.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>';
    }
    adminAuthBtn.classList.add('logged-in');
  } else {
    adminAuthLabel.innerText = currentLang === 'fa' ? 'ورود مدیر' : 'Admin Login';
    if (adminAuthSvg) {
      adminAuthSvg.innerHTML = '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>';
    }
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

// Scale & Accuracy Optimizer for 700+ Students
// Pre-indexed Float32Array matrix for sub-millisecond matching
let indexedStudentDatabase = [];

function rebuildStudentSearchIndex() {
  indexedStudentDatabase = [];
  if (!enrolledStudents || enrolledStudents.length === 0) return;

  for (const s of enrolledStudents) {
    const vectors = [];
    if (s.descriptors && Array.isArray(s.descriptors) && s.descriptors.length > 0) {
      s.descriptors.forEach(d => {
        if (d && d.length === 128) vectors.push(new Float32Array(d));
      });
    }
    if (s.descriptor && Array.isArray(s.descriptor) && s.descriptor.length === 128) {
      vectors.push(new Float32Array(s.descriptor));
    }

    if (vectors.length > 0) {
      indexedStudentDatabase.push({
        student: s,
        vectors: vectors
      });
    }
  }
}

// SIMD-like fast Euclidean distance calculation for 128-D vectors
function computeDistanceFast(a, b) {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Two-tier top-candidate disambiguation for high population (700+ students)
// Prevents false positives by enforcing both absolute distance AND margin over 2nd best candidate
function matchStudent(queryVector) {
  if (indexedStudentDatabase.length === 0) return null;
  const q = queryVector instanceof Float32Array ? queryVector : new Float32Array(queryVector);

  let bestStudent = null;
  let minDistance = Infinity;
  let secondMinDistance = Infinity;

  const threshold = MATCH_THRESHOLD;

  for (let i = 0; i < indexedStudentDatabase.length; i++) {
    const item = indexedStudentDatabase[i];
    const vecs = item.vectors;
    let studentBestDist = Infinity;

    for (let v = 0; v < vecs.length; v++) {
      const d = computeDistanceFast(vecs[v], q);
      if (d < studentBestDist) {
        studentBestDist = d;
      }
    }

    if (studentBestDist < minDistance) {
      secondMinDistance = minDistance;
      minDistance = studentBestDist;
      bestStudent = item.student;
    } else if (studentBestDist < secondMinDistance) {
      secondMinDistance = studentBestDist;
    }
  }

  // Acceptance criteria for large scale (700+ persons):
  // 1. Distance <= MATCH_THRESHOLD
  // 2. Ambiguity check: If close to another person, require confidence margin to prevent wrong student verification
  if (minDistance <= threshold) {
    const margin = secondMinDistance - minDistance;
    // If the top match is distinctly clearer than nearest false candidate
    if (secondMinDistance === Infinity || margin >= 0.03 || minDistance < 0.42) {
      return { student: bestStudent, distance: minDistance, confidence: Math.max(0, 1 - minDistance) };
    }
  }

  return null;
}

let MATCH_THRESHOLD = parseFloat(localStorage.getItem('match_threshold')) || 0.48; // Calibrated for 700+ students (prevents cross-matching)
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
    .detectAllFaces(media, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.55 }))
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
    if (state === 'verified') {
      gateResultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (state === 'unverified') {
      gateResultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else {
      gateResultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
  }
  if (gateResultTitle) gateResultTitle.innerText = title;
  if (gateResultSub) gateResultSub.innerText = subtitle;

  if (resultResetTimer) clearTimeout(resultResetTimer);
  resultResetTimer = setTimeout(resetGateResultCard, 3500);
}

function resetGateResultCard() {
  if (!gateResultCard) return;
  gateResultCard.className = 'gate-result-card neutral-state';
  if (gateResultIcon) {
    gateResultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
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
let isAttendanceFetching = false;
async function loadTodayAttendance() {
  if (isAttendanceFetching) return;
  isAttendanceFetching = true;
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
      if (gatePresentCount) gatePresentCount.innerText = d.stats.present;
      if (gateAbsentCount) gateAbsentCount.innerText = d.stats.absent;
      if (gateTotalCount) gateTotalCount.innerText = d.stats.total;

      // Update attendance tab badges
      if (attPresentNum) attPresentNum.innerText = d.stats.present;
      if (attAbsentNum) attAbsentNum.innerText = d.stats.absent;
      if (attTotalNum) attTotalNum.innerText = d.stats.total;

      if (filterAbsentCount) filterAbsentCount.innerText = d.stats.absent;
      if (filterPresentCount) filterPresentCount.innerText = d.stats.present;

      renderAttendanceTable();
      renderQuickLogs();
    }
  } catch (e) {
    console.error(e);
  } finally {
    isAttendanceFetching = false;
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
    const timeStr = s.entryTime ? new Date(s.entryTime).toLocaleTimeString(currentLang === 'fa' ? 'fa-IR' : 'en-US') : '-';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${s.photoUrl || ''}" class="thumb-img"></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.studentCode || '-'}</td>
      <td><span class="tag-role">${s.grade}</span></td>
      <td>
        <span class="status-pill-badge ${isPresent ? 'present' : 'absent'}">
          ${isPresent ? i18n[currentLang].statusPresentBadge : i18n[currentLang].statusAbsentBadge}
        </span>
      </td>
      <td><span class="${isPresent ? 'time-val' : ''}">${timeStr}</span></td>
      <td>
        <button class="btn-toggle-att" data-id="${s.id}" data-current="${s.status}">
          ${isPresent ? i18n[currentLang].btnMarkAbsent : i18n[currentLang].btnMarkPresent}
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
    .detectSingleFace(enrollVideo, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.65 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  enrollCtx.clearRect(0, 0, enrollCanvas.width, enrollCanvas.height);

  if (det) {
    const box = det.detection.box;

    // Quality gate for high population: ensure face is sufficiently large (> 110px) and well-centered
    const faceSize = Math.min(box.width, box.height);
    const isQualityGood = faceSize >= 110;

    enrollCtx.fillStyle = isQualityGood ? '#10b981' : '#f59e0b';
    det.landmarks.positions.forEach(p => enrollCtx.fillRect(p.x - 1, p.y - 1, 2.5, 2.5));

    enrollCtx.lineWidth = 2.5;
    enrollCtx.strokeStyle = isQualityGood ? '#10b981' : '#f59e0b';
    enrollCtx.strokeRect(box.x, box.y, box.width, box.height);

    if (isQualityGood) {
      currentEnrollDetection = det;
      if (enrollStep <= 3) nextStepBtn.disabled = false;
    } else {
      currentEnrollDetection = null;
      nextStepBtn.disabled = true;
    }
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

  if (enrollStep === 1) guideStepPrompt.innerText = i18n[currentLang].step1;
  else if (enrollStep === 2) guideStepPrompt.innerText = i18n[currentLang].step2;
  else if (enrollStep === 3) guideStepPrompt.innerText = i18n[currentLang].step3;
  else {
    guideStepPrompt.innerText = i18n[currentLang].stepDone;
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
    rebuildStudentSearchIndex(); // Rebuild high-speed search index for 700+ student scale
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
    adminTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">${i18n[currentLang].emptyNoStudents}</td></tr>`;
    return;
  }

  adminTableBody.innerHTML = '';
  list.forEach(s => {
    const regDate = new Date(s.registeredAt).toLocaleDateString(currentLang === 'fa' ? 'fa-IR' : 'en-US');
    const parent = s.parentInfo;
    const parentDisplay = parent
      ? `<div style="font-size:0.78rem; line-height:1.4;">
           <span style="font-weight:bold; color:var(--text);">${parent.phone}</span><br>
           <span style="color:var(--primary); font-size:0.74rem;">Bale: ${parent.chatId}</span>
         </div>`
      : `<span style="color:var(--text-sub); font-size:0.74rem;">ثبت‌نشده در بله</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${s.photoUrl || ''}" class="thumb-img"></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.nationalId || '-'}</td>
      <td>${s.studentCode || '-'}</td>
      <td><span class="tag-role">${s.grade}</span></td>
      <td>${parentDisplay}</td>
      <td>${regDate}</td>
      <td>
        <button class="btn-action edit-btn" data-id="${s.id}">${i18n[currentLang].btnEdit}</button>
        <button class="btn-action del delete-btn" data-id="${s.id}">${i18n[currentLang].btnDelete}</button>
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
  if (editStudentNationalId) editStudentNationalId.value = student.nationalId || '';
  editStudentCode.value = student.studentCode || '';
  editStudentGrade.value = student.grade || '';

  const parent = student.parentInfo;
  if (editParentPhone) editParentPhone.value = parent && parent.phone !== '-' ? parent.phone : '';
  if (editParentBaleId) editParentBaleId.value = parent && parent.chatId !== '-' ? parent.chatId : '';

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
  const nationalId = editStudentNationalId ? editStudentNationalId.value.trim() : '';
  const studentCode = editStudentCode.value.trim();
  const grade = editStudentGrade.value.trim();
  const parentPhone = editParentPhone ? editParentPhone.value.trim() : undefined;
  const parentBaleId = editParentBaleId ? editParentBaleId.value.trim() : undefined;

  if (!name) {
    alert('نام دانش‌آموز نمی‌تواند خالی باشد');
    return;
  }

  try {
    saveEditBtn.disabled = true;
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, nationalId, studentCode, grade, parentPhone, parentBaleId })
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

// School Hours, Bale & Backup Handlers
async function loadSchoolSettings() {
  try {
    const res = await fetch('/api/config/hours');
    const d = await res.json();
    if (d.success) {
      if (schoolOpenTimeInput) schoolOpenTimeInput.value = d.schoolHours.openTime || "07:00";
      if (schoolCloseTimeInput) schoolCloseTimeInput.value = d.schoolHours.closeTime || "14:30";
      if (baleActiveChk) baleActiveChk.checked = d.baleEnabled === true;
      if (autoAbsentAlertChk) autoAbsentAlertChk.checked = d.autoAbsentAlert !== false;
      if (autoAbsentTimeInput) autoAbsentTimeInput.value = d.autoAbsentTime || "08:30";

      if (baleDisplayUsername) {
        baleDisplayUsername.innerText = d.baleBotUsername ? `@${d.baleBotUsername}` : 'ثبت‌نشده';
      }
      if (baleLinkWrap && baleDisplayLink) {
        if (d.baleBotUsername) {
          baleLinkWrap.classList.remove('hidden');
          baleDisplayLink.href = `https://ble.ir/${d.baleBotUsername}`;
          baleDisplayLink.innerText = `ble.ir/${d.baleBotUsername}`;
        } else {
          baleLinkWrap.classList.add('hidden');
        }
      }

      const days = d.schoolHours.days || [0, 1, 2, 3, 6];
      document.querySelectorAll('.school-day-chk').forEach(chk => {
        chk.checked = days.includes(Number(chk.value));
      });
    }
  } catch (e) {}
}

if (saveHoursBtn) {
  saveHoursBtn.addEventListener('click', async () => {
    const openTime = schoolOpenTimeInput.value;
    const closeTime = schoolCloseTimeInput.value;
    const days = [];
    document.querySelectorAll('.school-day-chk:checked').forEach(c => days.push(Number(c.value)));

    try {
      saveHoursBtn.disabled = true;
      const res = await fetch('/api/config/hours', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ openTime, closeTime, days })
      });
      const d = await res.json();
      if (d.success) alert('ساعات و روزهای کاری مدرسه با موفقیت ذخیره شد.');
      else alert('خطا در ذخیره ساعات کاری');
    } catch (e) {
      alert(e.message);
    } finally {
      saveHoursBtn.disabled = false;
    }
  });
}

if (saveBaleBtn) {
  saveBaleBtn.addEventListener('click', async () => {
    const baleToken = baleTokenInput ? baleTokenInput.value.trim() : '';
    const baleEnabled = baleActiveChk ? baleActiveChk.checked : false;
    const autoAbsentAlert = autoAbsentAlertChk ? autoAbsentAlertChk.checked : true;
    const autoAbsentTime = autoAbsentTimeInput ? autoAbsentTimeInput.value.trim() : '08:30';

    try {
      saveBaleBtn.disabled = true;
      const res = await fetch('/api/config/hours', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ baleToken, baleEnabled, autoAbsentAlert, autoAbsentTime })
      });

      if (res.status === 403) {
        alert('نشست مدیریت منقضی شده است. لطفاً ابتدا خارج شده و مجدداً با رمز عبور مدیر وارد شوید.');
        adminToken = null;
        localStorage.removeItem('school_admin_token');
        updateAdminUI();
        return;
      }

      const d = await res.json();
      if (d.success) {
        alert('تنظیمات بازوی بله و هشدار غیبت با موفقیت ذخیره شد.');
        loadSchoolSettings();
      } else {
        alert('خطا در ذخیره تنظیمات بله: ' + (d.error || 'داده نامعتبر'));
      }
    } catch (e) {
      alert('خطا در ارتباط با سرور: ' + e.message);
    } finally {
      saveBaleBtn.disabled = false;
    }
  });
}

// Test Bale Bot Connection Button (Only needs the Token / Hash)
if (testBaleConnBtn) {
  testBaleConnBtn.addEventListener('click', async () => {
    const token = baleTokenInput ? baleTokenInput.value.trim() : '';
    baleTestStatus.classList.remove('hidden');
    baleTestStatus.className = 'bale-test-result';
    baleTestStatus.innerText = 'در حال ارسال درخواست تست به سرور بله...';

    try {
      testBaleConnBtn.disabled = true;
      const res = await fetch('/api/bale/test-connection', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token })
      });

      if (res.status === 403) {
        baleTestStatus.className = 'bale-test-result error';
        baleTestStatus.innerText = 'خطای دسترسی: لطفاً ابتدا به عنوان مدیر وارد شوید.';
        return;
      }

      const d = await res.json();
      if (d.success && d.bot) {
        baleTestStatus.className = 'bale-test-result success';
        baleTestStatus.innerHTML = `✓ اتصال با موفقیت برقرار شد!
نام بازو: <strong>${d.bot.firstName || ''}</strong> (@${d.bot.username || 'بدون نام کاربری'})
شناسه عددی (ID): <code>${d.bot.id}</code>`;

        if (d.bot.username) {
          if (baleDisplayUsername) baleDisplayUsername.innerText = `@${d.bot.username}`;
          if (baleLinkWrap && baleDisplayLink) {
            baleLinkWrap.classList.remove('hidden');
            baleDisplayLink.href = `https://ble.ir/${d.bot.username}`;
            baleDisplayLink.innerText = `ble.ir/${d.bot.username}`;
          }
        }
      } else {
        baleTestStatus.className = 'bale-test-result error';
        baleTestStatus.innerText = 'خطا در اتصال: ' + (d.error || 'توکن نامعتبر است');
      }
    } catch (err) {
      baleTestStatus.className = 'bale-test-result error';
      baleTestStatus.innerText = 'خطای شبکه در ارتباط با سرور: ' + err.message;
    } finally {
      testBaleConnBtn.disabled = false;
    }
  });
}

// Backup Import Handlers
if (triggerImportBtn && importZipInput) {
  triggerImportBtn.addEventListener('click', () => importZipInput.click());
  importZipInput.addEventListener('change', async () => {
    if (!importZipInput.files || importZipInput.files.length === 0) return;
    const file = importZipInput.files[0];
    if (!confirm(`آیا از بازگردانی فایل پشتیبان "${file.name}" اطمینان دارید؟ اطلاعات فعلی با اطلاعات فایل پشتیبان جایگزین خواهند شد.`)) {
      importZipInput.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('backupZip', file);

    try {
      triggerImportBtn.disabled = true;
      triggerImportBtn.innerText = 'در حال بازگردانی...';
      const headers = {};
      if (adminToken) headers['x-admin-token'] = adminToken;

      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers,
        body: formData
      });
      const d = await res.json();
      if (d.success) {
        alert('پایگاه داده و عکس‌ها با موفقیت بازیابی شدند.');
        await loadStudents();
        await loadTodayAttendance();
      } else {
        alert('خطا در بازیابی: ' + (d.error || 'ناشناخته'));
      }
    } catch (e) {
      alert('خطای ارتباط: ' + e.message);
    } finally {
      triggerImportBtn.disabled = false;
      triggerImportBtn.innerText = 'بازگردانی فایل پشتیبان (Import ZIP)';
      importZipInput.value = '';
    }
  });
}

// Settings Subnav Switching Logic
document.querySelectorAll('.subnav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.subnav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-subtab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const targetId = `subtab-${btn.getAttribute('data-subtab')}`;
    const targetPane = document.getElementById(targetId);
    if (targetPane) targetPane.classList.add('active');
  });
});

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
    loadSchoolSettings();
  }
}

tabGateBtn.addEventListener('click', () => switchTab('gate'));
tabEnrollBtn.addEventListener('click', () => switchTab('enroll'));
tabAttendanceBtn.addEventListener('click', () => switchTab('attendance'));
tabAdminBtn.addEventListener('click', () => switchTab('admin'));
if (tabSettingsBtn) tabSettingsBtn.addEventListener('click', () => switchTab('settings'));

window.addEventListener('DOMContentLoaded', () => {
  applyTranslations();
  updateAdminUI();
  initModels();

  // Background Live Auto-Update for Attendance Table & Stats
  setInterval(() => {
    // Only refresh when on attendance or gate tab and user is not actively typing in search
    const isTyping = document.activeElement === attendanceSearchInput || document.activeElement === manualStudentInput;
    if (!isTyping && (currentTab === 'attendance' || currentTab === 'gate')) {
      loadTodayAttendance();
    }
  }, 2500);
});
