<p align="center">
  <img src="Fe/Logo-Truong-Dai-hoc-Khoa-hoc-va-Cong-nghe-Ha-Noi-VN-France-University.png" alt="USTH Logo" width="220"/>
</p>

<h1 align="center">CyberÚ - Nền Tảng Phân Tích Lừa Đảo Đa Phương Thức AI</h1>

<p align="center">
  <b>Báo cáo dự án nhóm môn Web Application Development</b><br/>
  Trường Đại học Khoa học và Công nghệ Hà Nội (USTH)
</p>

---

## 👥 Danh Sách Thành Viên Nhóm

| STT | Họ và tên | Mã sinh viên | Email |
| :---: | :--- | :---: | :--- |
| **1** | Lương Thị Phượng | `23BA14235` | phuonglt.23ba14235@usth.edu.vn |
| **2** | Nguyễn Mạnh Thái | `23BA14257` | thainm.23ba14257@usth.edu.vn |
| **3** | Vũ Hoàng Anh | `23BA14014` | anhvh.23ba14014@usth.edu.vn |
| **4** | Nguyễn Phúc Đức | `23BA14055` | ducnp.23ba14055@usth.edu.vn |
| **5** | Vũ Nhật Cường | `23BA14041` | cuongvn.23ba14041@usth.edu.vn |
| **6** | Nguyễn Đức Mạnh | `23BA14188` | manhnd.23ba14188@usth.edu.vn |

---

## 🛠️ Ngôn Ngữ & Công Nghệ Sử Dụng

### 💻 Frontend (Giao Diện Người Dùng)
- **Ngôn ngữ**: HTML5, Vanilla CSS3 (Custom Dark Glassmorphism Design System), JavaScript (ES6+ Native Async/Await & Fetch API).
- **Iconography**: Biểu tượng chuẩn HTML/CSS SVG Vector (Lucide Icons Specification), không sử dụng thư viện font bên ngoài.
- **Lưu trữ phía Client**: `LocalStorage` lưu trữ cài đặt API Key cá nhân, ngôn ngữ hiển thị và lịch sử phân tích.

### ⚙️ Backend (Máy Chủ Xử Lý)
- **Ngôn ngữ**: Python 3.10+.
- **Framework**: FastAPI (Asynchronous Web Framework), Uvicorn (ASGI Server).
- **Trí tuệ nhân tạo (AI)**: Google GenAI SDK (`google-genai`) với các dòng mô hình tiên tiến nhất (`gemini-3.1-pro-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-1.5-flash`, `gemini-1.5-pro`).
- **Xử lý dữ liệu**: Pydantic, HTTP Status Exception Handling, CORS Middleware.

---

## 📡 Chi Tiết API Endpoints (Backend REST API)

Máy chủ Backend lắng nghe tại địa chỉ mặc định: `http://localhost:8000`

### 1. Danh Sách Endpoint

| HTTP Method | API Endpoint | Mô tả chức năng |
| :---: | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra trạng thái máy chủ FastAPI và cấu hình Gemini API Key môi trường. |
| `GET` | `/api/i18n` | Lấy từ điển đa ngôn ngữ (Tiếng Việt `vi` / Tiếng Anh `en`). |
| `POST` | `/api/gemini/validate-key` | Kiểm tra tính hợp lệ của Google Gemini API Key cá nhân do người dùng cung cấp. |
| `POST` | `/api/gemini/analyze` | Phân tích lừa đảo đa phương thức (SMS, URL, Ảnh chụp màn hình, Ghi âm cuộc gọi, Deepfake Video và Tổng hợp đa nguồn). Tự động tự sửa lỗi & failover model khi gặp rủi ro Rate Limit. |
| `GET` | `/api/inspect-url` | Cào dữ liệu & kiểm tra thông tin kỹ thuật của đường link URL nghi vấn. |
| `GET` | `/api/knowledge/encyclopedia` | Tra cứu danh mục các hình thức thủ đoạn lừa đảo phổ biến. |
| `GET` | `/api/knowledge/scenarios` | Lấy danh sách tình huống thực chiến phục vụ Học viện chống lừa đảo. |
| `GET` | `/api/knowledge/threats` | Tổng hợp toàn bộ dữ liệu cơ sở tri thức an toàn thông tin. |
| `GET` | `/api/cases` | Truy xuất dữ liệu các hồ sơ chuyên án lừa đảo tiêu biểu. |
| `GET` | `/api/academy` | Danh sách kịch bản đào tạo tương tác theo bước. |
| `GET` | `/api/game/questions` | Danh sách câu hỏi trắc nghiệm của Game Nhận diện lừa đảo 100%. |

---

### 2. Các Mã Trạng Thái HTTP (HTTP Response Status Codes)

Hệ thống tuân thủ nghiêm ngặt chuẩn mã phản hồi HTTP RESTful:

- `200 OK`: Yêu cầu gửi lên hợp lệ và được máy chủ xử lý thành công. Dữ liệu kết quả phản hồi dạng JSON.
- `400 Bad Request`: Dữ liệu đầu vào không hợp lệ (sai định dạng JSON payload, thiếu các tham số bắt buộc) hoặc Khóa API cá nhân không đúng/không có quyền truy cập.
- `404 Not Found`: Đường dẫn endpoint hoặc tài nguyên yêu cầu không tồn tại trên hệ thống.
- `429 Too Many Requests`: Hạn ngạch truy cập (Rate Limit) của mô hình Google Gemini AI vượt quá giới hạn cho phép. Backend tự động bắt mã này để chuyển đổi mượt mà sang mô hình dự phòng.
- `500 Internal Server Error`: Xảy ra lỗi ngoại lệ không mong muốn phía máy chủ (Internal Exception). Phản hồi bao gồm thông báo chi tiết nguyên nhân lỗi.

---

## 🚀 Hướng Dẫn Chạy Dự Án

### 1. Khởi chạy Backend (Python FastAPI)
```bash
cd Be
pip install -r requirements.txt
python main.py
```
*Máy chủ Backend sẽ chạy tại:* `http://localhost:8000`

### 2. Khởi chạy Frontend
* Mở trực tiếp file `Fe/index.html` trên trình duyệt web bất kỳ hoặc sử dụng extension `Live Server`.
