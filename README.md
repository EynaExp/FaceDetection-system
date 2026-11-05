# 🎓 Smart School Face Attendance System

AI-powered facial recognition and daily attendance management system for schools, featuring real-time verification gate, multi-angle face registration, and full Persian / English bilingual UI.

---

## 🚀 Features

- **Automated Entrance Gate**: Live face detection using deep neural networks (SSD MobileNetV1 + ResNet).
- **Multi-Angle Facial Alignment**: Scans front, left, and right profiles to recognize students at any approach angle.
- **Strict Duplicate Prevention**: Guarantees each student is only marked `PRESENT` once per day.
- **Network Camera / CCTV (RTSP) Support**: Built-in FFmpeg streaming bridge for IP surveillance cameras.
- **Daily Attendance Dashboard**: Instant filter for Absent (`غایبین`) and Present (`حاضرین`) students with one-click manual toggles.
- **Admin Security**: Protected management panel with password authorization and in-app password changer.
- **Zero Sensitive Data Leakage**: Biometric templates, student records, and photos are isolated in local database storage.

---

## 🛠️ Quick Deployment

### Method 1: Easy Scripts (Recommended)

1. **Start Server**:
   ```bash
   ./start.sh
   ```
2. **Stop Server**:
   ```bash
   ./stop.sh
   ```
3. Open in browser: `http://localhost:3000`

---

### Method 2: Docker / Docker Compose

1. **Build and Run**:
   ```bash
   docker compose up -d --build
   ```
2. **Stop Container**:
   ```bash
   docker compose down
   ```

---

## 🔐 Configuration

- **Default Admin Password**: `admin123` (Can be modified via the UI or `ADMIN_PASSWORD` environment variable).
- **Port**: Default is `3000` (Can be configured using `PORT=3000`).
