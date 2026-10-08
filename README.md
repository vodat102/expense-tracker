# 💰 Personal Expense Tracker API

Hệ thống RESTful API quản lý thu chi cá nhân, được thiết kế theo kiến trúc 3 lớp nghiêm ngặt (Controller - Service - Repository) trên nền tảng **Node.js (ES Modules)** và **Express.js**.

---

## 📌 Mục lục

- [Giới thiệu](#-giới-thiệu)
- [Công nghệ & Quy chuẩn kỹ thuật](#-công-nghệ--quy-chuẩn-kỹ-thuật)
- [Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Danh sách Endpoint API](#-danh-sách-endpoint-api)
- [Hướng dẫn cài đặt & Chạy](#-hướng-dẫn-cài-đặt--chạy)
- [Chiến lược kiểm thử](#-chiến-lược-kiểm-thử)
- [Tác giả](#-tác-giả)

---

## 📖 Giới thiệu

**Personal Expense Tracker API** cung cấp giải pháp ghi nhận, phân loại và thống kê tài chính cá nhân. Giai đoạn 1 (Phase 1) tập trung xây dựng lõi nghiệp vụ ổn định với cơ chế lưu trữ **In-Memory**, tích hợp xác thực JWT và kiểm thử tự động toàn diện.

### ✨ Tính năng cốt lõi (Phase 1)
- 🔐 **Xác thực người dùng:** Đăng ký và đăng nhập bảo mật bằng JWT và password hashing (`node:crypto`).
- 📂 **Quản lý danh mục (Category):** Hệ thống tích hợp sẵn danh mục mặc định (Lương, Ăn uống, Tiện ích,...) và cho phép người dùng tạo danh mục tùy chỉnh.
- 💵 **Ghi nhận giao dịch (Transaction):** Hỗ trợ tạo, cập nhật, xóa và tra cứu các khoản Thu (`income`) / Chi (`expense`).
- 📊 **Tính số dư & Thống kê (Summary):** Tính toán tổng thu, tổng chi, số dư hiện tại và phân tích cơ cấu chi tiêu theo danh mục trong khoảng thời gian xác định.

---

## 🛠 Công nghệ & Quy chuẩn kỹ thuật

- **Runtime:** Node.js (LTS version >= 20.x)
- **Module System:** ES Modules (`"type": "module"` trong `package.json`)
- **Framework:** Express.js
- **Testing:** Jest, Supertest
- **Bảo mật & Tiện ích:** Sử dụng thư viện chuẩn của Node.js (`node:crypto` cho UUID, SHA-256 JWT, password hashing), tuân thủ nguyên tắc không phụ thuộc vào ORM hoặc thư viện ngoài không cần thiết.
- **Quy chuẩn mã nguồn:**
  - Quy tắc đặt tên: `camelCase` cho hàm/biến, `PascalCase` cho class.
  - Phản hồi lỗi chuẩn hóa: `{ "error": "Mô tả lỗi cụ thể" }`.
  - Không sử dụng khối `try/catch` rỗng.

---

## 🏗 Kiến trúc hệ thống

Ứng dụng tuân thủ mô hình **3 lớp nghiêm ngặt (3-Layer Architecture)** kết hợp nguyên lý **Dependency Injection (DI)**:

```
[ HTTP Request ]
       │
       ▼
 ┌─────────────┐
 │ Controller  │  ◄── Nhận request, validate định dạng sơ bộ, gọi Service, trả response HTTP
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │   Service   │  ◄── Chứa toàn bộ Business Logic, tính toán, kiểm tra nghiệp vụ
 └─────────────┘
       │
       ▼
 ┌─────────────┐
 │ Repository  │  ◄── Quản lý dữ liệu (In-Memory Maps, hỗ trợ hoán đổi sang Database sau này)
 └─────────────┘
```

---

## 📁 Cấu trúc thư mục

```text
expense-tracker/
├── .gitignore
├── README.md
├── package.json
├── jest.config.js
├── src/
│   ├── app.js                    # Khởi tạo Express app, cấu hình middleware & routes
│   ├── server.js                 # Entry point khởi chạy server (port 3000)
│   ├── config/                   # Quản lý cấu hình & biến môi trường
│   ├── controllers/              # Lớp Controller điều hướng HTTP
│   ├── services/                 # Lớp Service xử lý nghiệp vụ
│   ├── repositories/             # Lớp Repository truy xuất & lưu trữ dữ liệu
│   ├── middleware/               # Middleware xác thực (JWT) & xử lý lỗi tập trung
│   ├── errors/                   # Định nghĩa AppError chuẩn hóa
│   ├── routes/                   # Khai báo các đường dẫn API
│   └── utils/                    # Các hàm tiện ích (validation, date formatting)
├── tests/
│   ├── unit/                     # Unit test cho Service và Utilities
│   └── integration/              # Integration test cho các Endpoint API (Supertest)
└── specs/
    └── system-design.md          # Tài liệu đặc tả và thiết kế kỹ thuật chi tiết
```

---

## 🚀 Danh sách Endpoint API

> **Base URL:** `http://localhost:3000/api/v1`

### 1. Xác thực (Authentication)
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/auth/register` | Đăng ký tài khoản người dùng mới |
| `POST` | `/auth/login` | Đăng nhập và nhận JWT token |

### 2. Danh mục (Categories)
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/categories` | `Bearer <token>` | Lấy danh sách danh mục (mặc định + cá nhân) |
| `POST` | `/categories` | `Bearer <token>` | Thêm danh mục tùy chỉnh |
| `PUT` | `/categories/:id` | `Bearer <token>` | Cập nhật tên danh mục tùy chỉnh |
| `DELETE` | `/categories/:id` | `Bearer <token>` | Xóa danh mục tùy chỉnh |

### 3. Giao dịch (Transactions)
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/transactions` | `Bearer <token>` | Lấy danh sách giao dịch (lọc theo type, ngày, category) |
| `GET` | `/transactions/:id` | `Bearer <token>` | Chi tiết một giao dịch |
| `POST` | `/transactions` | `Bearer <token>` | Tạo giao dịch mới |
| `PUT` | `/transactions/:id` | `Bearer <token>` | Cập nhật thông tin giao dịch |
| `DELETE` | `/transactions/:id` | `Bearer <token>` | Xóa giao dịch |

### 4. Thống kê & Số dư (Summary)
| Method | Endpoint | Header | Mô tả |
|---|---|---|---|
| `GET` | `/summary/balance` | `Bearer <token>` | Xem tổng thu, tổng chi và số dư còn lại |
| `GET` | `/summary/by-category` | `Bearer <token>` | Thống kê cơ cấu thu/chi theo từng danh mục |

---

## 💻 Hướng dẫn cài đặt & Chạy

### 1. Cài đặt môi trường
Đảm bảo máy đã cài đặt Node.js phiên bản LTS (khuyến nghị phiên bản 20.x trở lên).

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Khởi chạy ứng dụng
```bash
# Chạy ở chế độ phát triển
npm run dev

# Hoặc khởi chạy trực tiếp
npm start
```
API sẽ lắng nghe tại: `http://localhost:3000/api/v1`

---

## 🧪 Chiến lược kiểm thử

Chạy toàn bộ bài test:
```bash
npm test
```

- **Unit Tests:** Kiểm tra từng hàm tính toán số dư, xử lý danh mục và nghiệp vụ giao dịch với đầy đủ các ca thành công (happy path) và các ca ngoại lệ (edge/error cases).
- **Integration Tests:** Sử dụng `supertest` để kiểm tra luồng HTTP request/response từ Controller xuống Repository.

---

## 👤 Tác giả

- GitHub: [@vodat102](https://github.com/vodat102)
