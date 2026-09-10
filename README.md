<p align="center">
  <img src="Fe/Logo-Truong-Dai-hoc-Khoa-hoc-va-Cong-nghe-Ha-Noi-VN-France-University.png" alt="USTH Logo" width="220"/>
</p>

<h1 align="center">CyberU - Multimodal AI Scam Forensic & Threat Intelligence Platform</h1>

<p align="center">
  <b>Web Application Development Project Report</b><br/>
  University of Science and Technology of Hanoi (USTH)
</p>

<p align="center">
  <a href="#english"><img src="https://img.shields.io/badge/Language-English-blue?style=for-the-badge" alt="English"/></a>
  &nbsp;
  <a href="#tiếng-việt"><img src="https://img.shields.io/badge/Ngôn%20ngữ-Tiếng%20Việt-red?style=for-the-badge" alt="Tiếng Việt"/></a>
</p>

---

<a name="english"></a>
## 🌐 English Version (Default)

### 👥 Team Members

| No. | Full Name | Student ID | Email |
| :---: | :--- | :---: | :--- |
| **1** | Lương Thị Phượng | `23BA14235` | phuonglt.23ba14235@usth.edu.vn |
| **2** | Nguyễn Mạnh Thái | `23BA14257` | thainm.23ba14257@usth.edu.vn |
| **3** | Vũ Hoàng Anh | `23BA14014` | anhvh.23ba14014@usth.edu.vn |
| **4** | Nguyễn Phúc Đức | `23BA14055` | ducnp.23ba14055@usth.edu.vn |
| **5** | Vũ Nhật Cường | `23BA14041` | cuongvn.23ba14041@usth.edu.vn |
| **6** | Nguyễn Đức Mạnh | `23BA14188` | manhnd.23ba14188@usth.edu.vn |

---

### 🛠️ Tech Stack & Security APIs

#### 💻 Frontend (User Interface)
- **Core Technologies**: HTML5, Vanilla CSS3 (Custom Dark Glassmorphism Design System), Native JavaScript (ES6+ Async/Await & Fetch API).
- **Iconography**: Clean inline SVG Vector Icons (Lucide Specification).
- **Client Storage**: `LocalStorage` for user-defined custom API keys, theme/language preferences, and scan history.

#### ⚙️ Backend (Server & API Services)
- **Language & Framework**: Python 3.10+, FastAPI (Asynchronous Web Framework), Uvicorn (ASGI Web Server), HTTPX Async Client.
- **Multimodal AI Engine**: Google GenAI SDK (`google-genai`) supporting models (`gemini-3.1-pro-preview`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).

#### 🛡️ Threat Intelligence & Security APIs
1. **VirusTotal API v3** (*Priority 1*):
   - Performs real-time URL and Domain threat scans against 70+ global antivirus & security vendor engines.
   - Fallback domain reputation lookup (`/api/v3/domains/{domain}`) for unindexed URLs.
2. **Google Safe Browsing API v4** (*Priority 2*):
   - Cross-references URLs against Google's real-time list of dangerous web resources (Malware, Social Engineering / Phishing, Unwanted Software).
3. **Google Gemini AI & Heuristic Fallback Engine** (*Priority 3*):
   - Automated DOM form inspection, high-risk TLD evaluation, and AI-powered context reasoning when upstream security APIs hit rate limits.

#### 🔄 3-Tier Fallback URL Scanning Pipeline
```
[User Input URL]
       │
       ▼ (Normalize URL to lowercase & validate scheme)
┌─────────────────────────┐
│  VirusTotal API v3      │ ──► Success ──► Return VT Security Report
└──────────┬──────────────┘
           │ (Quota Exceeded / Missing Key / Error)
           ▼
┌─────────────────────────┐
│ Google Safe Browsing v4 │ ──► Success ──► Return Safe Browsing Report
└──────────┬──────────────┘
           │ (Quota Exceeded / Missing Key / Error)
           ▼
┌─────────────────────────┐
│ Gemini AI / Heuristic   │ ──► Success ──► Return AI Forensics Report
└─────────────────────────┘
```

---

### 📡 API Endpoints Reference

Backend server runs by default at `http://localhost:8000`.

| Method | Endpoint | Description |
| :---: | :--- | :--- |
| `GET` | `/api/health` | Check backend server status and API keys configuration (`GEMINI_API_KEY`, `VIRUSTOTAL_API_KEY`, `SAFE_BROWSING_API_KEY`). |
| `GET` | `/api/i18n` | Fetch multilingual dictionary (Vietnamese `vi` / English `en`). |
| `POST` | `/api/gemini/validate-key` | Validate custom user-provided Google Gemini API key. |
| `POST` | `/api/gemini/analyze` | Perform multimodal scam analysis (Text, Images, Audio, Video, URLs). Includes automatic model rotation & failover. |
| `GET`/`POST` | `/api/scan-url` | Scan phishing/malware URLs using 3-Tier Fallback Pipeline (VT ➔ Safe Browsing ➔ Gemini AI). |
| `GET` | `/api/inspect-url` | Live web crawl and technical DOM inspection of suspicious links. |
| `GET` | `/api/knowledge/encyclopedia` | Retrieve scam methods encyclopedia entries. |
| `GET` | `/api/knowledge/scenarios` | Retrieve interactive training scenarios. |
| `GET` | `/api/knowledge/threats` | Consolidated threat intelligence dataset. |
| `GET` | `/api/cases` | Access major cyber scam case dossiers. |
| `GET` | `/api/academy` | Access training module scenarios. |
| `GET` | `/api/game/questions` | Fetch quiz questions for the Anti-Scam Spotter Game. |

---

### 🔑 Environment Variables Configuration

Create a `.env` file inside the `Be/` directory:

```env
# Google Gemini AI Key
GEMINI_API_KEY=your_gemini_api_key_here

# VirusTotal API v3 Key (Primary URL Scanner)
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here

# Google Safe Browsing API v4 Key (Secondary URL Scanner)
SAFE_BROWSING_API_KEY=your_safe_browsing_api_key_here
```

---

### 🚦 HTTP Response Status Codes

- `200 OK`: Request processed successfully. Result returned in JSON.
- `400 Bad Request`: Invalid payload format, missing required parameters, or invalid custom API key.
- `404 Not Found`: Requested endpoint or resource does not exist.
- `429 Too Many Requests`: API quota/rate limit exceeded. Backend automatically triggers failover to fallback models/providers.
- `500 Internal Server Error`: Unexpected server error. Detailed error message provided in JSON payload.

---

### 🚀 Getting Started

#### 1. Launch Backend Server (Python FastAPI)
```bash
cd Be
pip install -r requirements.txt
python main.py
```
*Backend server will start at:* `http://localhost:8000`

#### 2. Launch Frontend
* Open `Fe/index.html` directly in any web browser or launch using VS Code `Live Server`.

---
---

<a name="tiếng-việt"></a>
## 🇻🇳 Tiếng Việt Version

### 👥 Danh Sách Thành Viên Nhóm

| STT | Họ và tên | Mã sinh viên | Email |
| :---: | :--- | :---: | :--- |
| **1** | Lương Thị Phượng | `23BA14235` | phuonglt.23ba14235@usth.edu.vn |
| **2** | Nguyễn Mạnh Thái | `23BA14257` | thainm.23ba14257@usth.edu.vn |
| **3** | Vũ Hoàng Anh | `23BA14014` | anhvh.23ba14014@usth.edu.vn |
| **4** | Nguyễn Phúc Đức | `23BA14055` | ducnp.23ba14055@usth.edu.vn |
| **5** | Vũ Nhật Cường | `23BA14041` | cuongvn.23ba14041@usth.edu.vn |
| **6** | Nguyễn Đức Mạnh | `23BA14188` | manhnd.23ba14188@usth.edu.vn |

---

### 🛠️ Ngôn Ngữ & Công Nghệ Sử Dụng

#### 💻 Frontend (Giao Diện Người Dùng)
- **Ngôn ngữ**: HTML5, Vanilla CSS3 (Custom Dark Glassmorphism Design System), JavaScript (ES6+ Native Async/Await & Fetch API).
- **Biểu tượng**: SVG Vector chuẩn HTML/CSS (Lucide Icons Specification), không phụ thuộc thư viện bên ngoài.
- **Lưu trữ phía Client**: `LocalStorage` lưu trữ cài đặt API Key cá nhân, ngôn ngữ hiển thị và lịch sử phân tích.

#### ⚙️ Backend (Máy Chủ Xử Lý)
- **Ngôn ngữ & Framework**: Python 3.10+, FastAPI (Asynchronous Web Framework), Uvicorn (ASGI Web Server), HTTPX Async Client.
- **Trí tuệ nhân tạo (AI)**: Google GenAI SDK (`google-genai`) với các dòng mô hình tiên tiến nhất (`gemini-3.1-pro-preview`, `gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`).

#### 🛡️ Dịch Vụ API Bảo Mật & Phân Tích Đe Dọa
1. **VirusTotal API v3** (*Ưu tiên 1*):
   - Đòn bẩy phân tích URL và tên miền trực tiếp đối chiếu với hơn 70 công cụ bảo mật hàng đầu thế giới.
   - Tự động fallback kiểm tra uy tín tên miền (`/api/v3/domains/{domain}`) nếu URL chưa từng được lưu index.
2. **Google Safe Browsing API v4** (*Ưu tiên 2*):
   - Đối chiếu đường link với cơ sở dữ liệu đe dọa thời gian thực của Google (Mã độc Malware, Lừa đảo Phishing / Social Engineering, Phần mềm độc hại).
3. **Google Gemini AI & Bộ Quét Heuristic** (*Ưu tiên 3*):
   - Phân tích cấu trúc HTML DOM, phát hiện form thu thập thông tin/OTP, đánh giá TLD rủi ro cao và lập luận ngữ cảnh bằng AI khi các API cấp trên bị giới hạn băng thông (Rate Limit).

#### 🔄 Cơ Chế Fallback 3 Lớp Quét URL Lừa Đảo
```
[URL Nhập Từ Người Dùng]
       │
       ▼ (Chuẩn hóa URL thành chữ thường & thêm scheme)
┌─────────────────────────┐
│  VirusTotal API v3      │ ──► Thành công ──► Trả kết quả báo cáo VirusTotal
└──────────┬──────────────┘
           │ (Vượt giới hạn lượt quét / Chưa cấu hình Key / Lỗi)
           ▼
┌─────────────────────────┐
│ Google Safe Browsing v4 │ ──► Thành công ──► Trả kết quả Google Safe Browsing
└──────────┬──────────────┘
           │ (Vượt giới hạn lượt quét / Chưa cấu hình Key / Lỗi)
           ▼
┌─────────────────────────┐
│ Gemini AI / Heuristic   │ ──► Thành công ──► Trả kết quả phân tích AI Gemini
└─────────────────────────┘
```

---

### 📡 Chi Tiết API Endpoints (Backend REST API)

Máy chủ Backend lắng nghe tại địa chỉ mặc định: `http://localhost:8000`

| HTTP Method | API Endpoint | Mô tả chức năng |
| :---: | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra trạng thái máy chủ FastAPI và cấu hình các API Key môi trường (`GEMINI_API_KEY`, `VIRUSTOTAL_API_KEY`, `SAFE_BROWSING_API_KEY`). |
| `GET` | `/api/i18n` | Lấy từ điển đa ngôn ngữ (Tiếng Việt `vi` / Tiếng Anh `en`). |
| `POST` | `/api/gemini/validate-key` | Kiểm tra tính hợp lệ của Google Gemini API Key cá nhân do người dùng cung cấp. |
| `POST` | `/api/gemini/analyze` | Phân tích lừa đảo đa phương thức (SMS, URL, Ảnh chụp màn hình, Ghi âm cuộc gọi, Deepfake Video). Tự động xoay tua mô hình AI khi gặp Rate Limit. |
| `GET`/`POST` | `/api/scan-url` | Quét URL lừa đảo / mã độc sử dụng Cơ chế Fallback 3 lớp (VirusTotal ➔ Safe Browsing ➔ Gemini AI). |
| `GET` | `/api/inspect-url` | Cào dữ liệu & kiểm tra thông tin kỹ thuật DOM của đường link URL nghi vấn. |
| `GET` | `/api/knowledge/encyclopedia` | Tra cứu danh mục các hình thức thủ đoạn lừa đảo phổ biến. |
| `GET` | `/api/knowledge/scenarios` | Lấy danh sách tình huống thực chiến phục vụ Học viện chống lừa đảo. |
| `GET` | `/api/knowledge/threats` | Tổng hợp toàn bộ dữ liệu cơ sở tri thức an toàn thông tin. |
| `GET` | `/api/cases` | Truy xuất dữ liệu các hồ sơ chuyên án lừa đảo tiêu biểu. |
| `GET` | `/api/academy` | Danh sách kịch bản đào tạo tương tác theo bước. |
| `GET` | `/api/game/questions` | Danh sách câu hỏi trắc nghiệm của Game Nhận diện lừa đảo 100%. |

---

### 🔑 Cấu Hình Biến Môi Trường (Environment Variables)

Tạo file `.env` trong thư mục `Be/`:

```env
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here

# VirusTotal API v3 Key (Bộ quét URL ưu tiên 1)
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here

# Google Safe Browsing API v4 Key (Bộ quét URL ưu tiên 2)
SAFE_BROWSING_API_KEY=your_safe_browsing_api_key_here
```

---

### 🚦 Các Mã Trạng Thái HTTP (HTTP Status Codes)

- `200 OK`: Yêu cầu hợp lệ và được máy chủ xử lý thành công. Trả về định dạng JSON.
- `400 Bad Request`: Dữ liệu đầu vào không hợp lệ hoặc API Key không chính xác.
- `404 Not Found`: Đường dẫn endpoint hoặc tài nguyên không tồn tại.
- `429 Too Many Requests`: Hạn ngạch truy cập API bị vượt quá. Backend tự động kích hoạt chuyển đổi sang dịch vụ/mô hình dự phòng.
- `500 Internal Server Error`: Lỗi máy chủ nội bộ. Thông báo chi tiết được trả về trong payload JSON.

---

### 🚀 Hướng Dẫn Chạy Dự Án

#### 1. Khởi chạy Backend (Python FastAPI)
```bash
cd Be
pip install -r requirements.txt
python main.py
```
*Máy chủ Backend sẽ chạy tại:* `http://localhost:8000`

#### 2. Khởi chạy Frontend
* Mở trực tiếp file `Fe/index.html` trên trình duyệt web bất kỳ hoặc sử dụng extension `Live Server`.
