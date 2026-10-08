# 📋 KẾ HOẠCH XÂY DỰNG & THIẾT KẾ HỆ THỐNG — Expense Tracker API

> **Phiên bản:** 1.0 · **Ngày:** 2026-10-08
> **Giai đoạn:** Phase 1 — MVP In-Memory

---

## 1. Phân tích yêu cầu & phạm vi

### 1.1 Chức năng cốt lõi (In Scope — Phase 1)

| # | Chức năng | Mô tả |
|---|-----------|-------|
| F1 | **Đăng ký / Đăng nhập** | Auth cơ bản bằng JWT. Mỗi user có dữ liệu riêng biệt. |
| F2 | **Quản lý danh mục** | Hệ thống cung cấp danh mục mặc định (Ăn uống, Di chuyển, Lương, ...). User có thể tạo thêm danh mục tùy chỉnh. Sửa/Xóa chỉ áp dụng cho danh mục tùy chỉnh. |
| F3 | **Ghi nhận giao dịch** | Tạo giao dịch thu (`income`) hoặc chi (`expense`) với số tiền, danh mục, ghi chú, ngày. |
| F4 | **Liệt kê giao dịch** | Lấy danh sách giao dịch, hỗ trợ lọc theo loại, danh mục, khoảng thời gian. |
| F5 | **Sửa / Xóa giao dịch** | Cập nhật hoặc xóa giao dịch đã tạo. |
| F6 | **Tính số dư** | Tổng thu − Tổng chi = Số dư hiện tại. |
| F7 | **Thống kê** | Tổng thu/chi theo danh mục; lọc theo khoảng thời gian (ngày, tháng). |

### 1.2 Ngoài phạm vi (Out of Scope — Phase 1)

- ❌ Cơ sở dữ liệu thực (PostgreSQL, MongoDB...) — chỉ dùng In-Memory.
- ❌ Multi-currency (chỉ VND mặc định).
- ❌ Upload file đính kèm (hóa đơn, ảnh).
- ❌ Phân quyền nâng cao (role-based: admin, viewer).
- ❌ Phân trang (pagination) nâng cao với cursor.
- ❌ Rate limiting, caching, logging nâng cao.
- ❌ Deployment (Docker, CI/CD).
- ❌ Giao diện frontend.

### 1.3 Giả định

| # | Giả định |
|---|----------|
| A1 | Đơn vị tiền tệ mặc định là VND, số tiền lưu dạng số nguyên (đồng). |
| A2 | Ngày giao dịch do client gửi lên (ISO 8601: `YYYY-MM-DD`), nếu không gửi thì mặc định = ngày hiện tại. |
| A3 | Danh mục mặc định được seed khi server khởi động, thuộc về tất cả user, không thể sửa/xóa. |
| A4 | JWT secret được cấu hình qua biến môi trường. Không cài thêm thư viện ngoài danh sách cho phép — JWT sẽ được triển khai bằng module `crypto` có sẵn của Node.js. |
| A5 | Password được hash bằng module `crypto` (scrypt/pbkdf2) có sẵn trong Node.js — không cần thư viện bên ngoài. |
| A6 | Dữ liệu In-Memory mất khi server restart — chấp nhận ở Phase 1. |

---

## 2. Thiết kế dữ liệu

### 2.1 Mô hình thực thể

#### Entity: **User**

| Trường | Kiểu | Ràng buộc | Mô tả |
|--------|------|-----------|-------|
| `id` | `string` | PK, UUID v4 | Định danh duy nhất |
| `name` | `string` | Required, 1-100 ký tự | Tên hiển thị |
| `email` | `string` | Required, unique, email hợp lệ | Email đăng nhập |
| `passwordHash` | `string` | Required | Hash của password |
| `createdAt` | `string` | Auto, ISO 8601 | Ngày tạo tài khoản |

#### Entity: **Category**

| Trường | Kiểu | Ràng buộc | Mô tả |
|--------|------|-----------|-------|
| `id` | `string` | PK, UUID v4 | Định danh duy nhất |
| `name` | `string` | Required, 1-50 ký tự, unique per user | Tên danh mục |
| `type` | `string` | Required, enum: `income` \| `expense` | Loại giao dịch áp dụng |
| `isDefault` | `boolean` | Default: `false` | `true` = danh mục hệ thống, không sửa/xóa |
| `userId` | `string \| null` | FK → User.id, `null` nếu isDefault | Chủ sở hữu |
| `createdAt` | `string` | Auto, ISO 8601 | Ngày tạo |

#### Entity: **Transaction**

| Trường | Kiểu | Ràng buộc | Mô tả |
|--------|------|-----------|-------|
| `id` | `string` | PK, UUID v4 | Định danh duy nhất |
| `type` | `string` | Required, enum: `income` \| `expense` | Thu hoặc Chi |
| `amount` | `number` | Required, số nguyên > 0 | Số tiền (VND) |
| `categoryId` | `string` | Required, FK → Category.id | Danh mục |
| `note` | `string` | Optional, max 500 ký tự | Ghi chú |
| `date` | `string` | Required, ISO 8601 `YYYY-MM-DD` | Ngày giao dịch |
| `userId` | `string` | Required, FK → User.id | Người tạo |
| `createdAt` | `string` | Auto, ISO 8601 | Thời điểm tạo bản ghi |
| `updatedAt` | `string` | Auto, ISO 8601 | Thời điểm cập nhật gần nhất |

### 2.2 Quy tắc Validation chi tiết

| Trường | Quy tắc |
|--------|---------|
| `email` | Regex chuẩn email, lowercase trước khi lưu, unique trong hệ thống |
| `password` | Tối thiểu 6 ký tự (raw, trước khi hash) |
| `name` (User) | Chuỗi không rỗng, trim whitespace, 1-100 ký tự |
| `name` (Category) | Chuỗi không rỗng, trim whitespace, 1-50 ký tự, unique trong phạm vi (userId + type) |
| `type` | Chỉ chấp nhận `"income"` hoặc `"expense"` |
| `amount` | Số nguyên dương (`Number.isInteger(amount) && amount > 0`). Không chấp nhận float, chuỗi, hoặc ≤ 0 |
| `categoryId` | Phải tồn tại trong hệ thống, và `category.type` phải khớp `transaction.type` |
| `date` | Format `YYYY-MM-DD`, phải là ngày hợp lệ (không chấp nhận `2026-02-30`). Nếu không gửi → default = today |
| `note` | Optional, nếu có thì max 500 ký tự, trim whitespace |

### 2.3 Sinh ID & Quản lý In-Memory

- **Sinh ID:** Sử dụng `crypto.randomUUID()` (có sẵn trong Node.js ≥ 19, hoặc `import { randomUUID } from 'node:crypto'`).
- **Cấu trúc In-Memory:** Mỗi repository duy trì một `Map<string, Entity>` nội bộ, key = `id`. Map cho phép O(1) lookup theo ID.
- **Reset:** Mỗi repository expose phương thức `clear()` để test có thể reset dữ liệu giữa các test case.
- **Seed:** Danh mục mặc định được seed qua hàm `seedDefaultCategories()` gọi khi khởi tạo `CategoryRepository`.

#### Danh mục mặc định (seed data)

| Tên | Type |
|-----|------|
| Lương | `income` |
| Thưởng | `income` |
| Đầu tư | `income` |
| Thu nhập khác | `income` |
| Ăn uống | `expense` |
| Di chuyển | `expense` |
| Mua sắm | `expense` |
| Hóa đơn & Tiện ích | `expense` |
| Giải trí | `expense` |
| Sức khỏe | `expense` |
| Giáo dục | `expense` |
| Chi tiêu khác | `expense` |

---

## 3. Thiết kế API

### 3.1 Bảng Endpoint

> **Base URL:** `http://localhost:3000/api/v1`

#### Auth

| Method | Path | Request Body | Response (2xx) | Lỗi |
|--------|------|-------------|-----------------|-----|
| `POST` | `/auth/register` | `{ name, email, password }` | `201` — `{ user: { id, name, email, createdAt } }` | `400` validation, `409` email trùng |
| `POST` | `/auth/login` | `{ email, password }` | `200` — `{ token, user: { id, name, email } }` | `400` validation, `401` sai credentials |

#### Categories (yêu cầu `Authorization: Bearer <token>`)

| Method | Path | Params/Query | Request Body | Response (2xx) | Lỗi |
|--------|------|-------------|-------------|-----------------|-----|
| `GET` | `/categories` | `?type=income\|expense` (optional) | — | `200` — `{ categories: [...] }` | `401` |
| `POST` | `/categories` | — | `{ name, type }` | `201` — `{ category: {...} }` | `400`, `401`, `409` trùng tên |
| `PUT` | `/categories/:id` | `id` (path) | `{ name }` | `200` — `{ category: {...} }` | `400`, `401`, `403` (default), `404` |
| `DELETE` | `/categories/:id` | `id` (path) | — | `204` No Content | `401`, `403` (default), `404` |

#### Transactions (yêu cầu `Authorization: Bearer <token>`)

| Method | Path | Params/Query | Request Body | Response (2xx) | Lỗi |
|--------|------|-------------|-------------|-----------------|-----|
| `GET` | `/transactions` | `?type`, `?categoryId`, `?startDate`, `?endDate` | — | `200` — `{ transactions: [...] }` | `401`, `400` (filter sai) |
| `GET` | `/transactions/:id` | `id` (path) | — | `200` — `{ transaction: {...} }` | `401`, `404` |
| `POST` | `/transactions` | — | `{ type, amount, categoryId, date?, note? }` | `201` — `{ transaction: {...} }` | `400`, `401` |
| `PUT` | `/transactions/:id` | `id` (path) | `{ type?, amount?, categoryId?, date?, note? }` | `200` — `{ transaction: {...} }` | `400`, `401`, `404` |
| `DELETE` | `/transactions/:id` | `id` (path) | — | `204` No Content | `401`, `404` |

#### Summary & Statistics (yêu cầu `Authorization: Bearer <token>`)

| Method | Path | Params/Query | Response (2xx) | Lỗi |
|--------|------|-------------|-----------------|-----|
| `GET` | `/summary/balance` | `?startDate`, `?endDate` (optional) | `200` — `{ totalIncome, totalExpense, balance }` | `401` |
| `GET` | `/summary/by-category` | `?type`, `?startDate`, `?endDate` | `200` — `{ summary: [{ categoryId, categoryName, type, total }] }` | `401`, `400` |

### 3.2 Ví dụ JSON Request / Response

#### Tạo giao dịch — Thành công

```
POST /api/v1/transactions
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json
```
```json
{
  "type": "expense",
  "amount": 150000,
  "categoryId": "cat-uuid-an-uong",
  "date": "2026-10-08",
  "note": "Ăn trưa với đồng nghiệp"
}
```
**Response `201 Created`:**
```json
{
  "transaction": {
    "id": "txn-uuid-001",
    "type": "expense",
    "amount": 150000,
    "categoryId": "cat-uuid-an-uong",
    "note": "Ăn trưa với đồng nghiệp",
    "date": "2026-10-08",
    "userId": "user-uuid-001",
    "createdAt": "2026-10-08T09:00:00.000Z",
    "updatedAt": "2026-10-08T09:00:00.000Z"
  }
}
```

#### Validation lỗi — Số tiền không hợp lệ

```json
{
  "type": "expense",
  "amount": -5000,
  "categoryId": "cat-uuid-an-uong"
}
```
**Response `400 Bad Request`:**
```json
{
  "error": "Số tiền phải là số nguyên dương"
}
```

#### Tài nguyên không tìm thấy

**Response `404 Not Found`:**
```json
{
  "error": "Giao dịch không tồn tại"
}
```

#### Xem số dư

```
GET /api/v1/summary/balance?startDate=2026-10-01&endDate=2026-10-31
```
**Response `200 OK`:**
```json
{
  "totalIncome": 15000000,
  "totalExpense": 4350000,
  "balance": 10650000
}
```

#### Thống kê theo danh mục

```
GET /api/v1/summary/by-category?type=expense&startDate=2026-10-01&endDate=2026-10-31
```
**Response `200 OK`:**
```json
{
  "summary": [
    { "categoryId": "cat-uuid-an-uong", "categoryName": "Ăn uống", "type": "expense", "total": 2100000 },
    { "categoryId": "cat-uuid-di-chuyen", "categoryName": "Di chuyển", "type": "expense", "total": 750000 },
    { "categoryId": "cat-uuid-giai-tri", "categoryName": "Giải trí", "type": "expense", "total": 1500000 }
  ]
}
```

---

## 4. Thiết kế kiến trúc 3 lớp

### 4.1 Cấu trúc thư mục

```
expense-tracker/
├── package.json                  # type: "module", scripts, dependencies
├── jest.config.js                # Cấu hình Jest cho ESM
├── src/
│   ├── app.js                    # Khởi tạo Express app, gắn middleware & routes (KHÔNG listen)
│   ├── server.js                 # Import app, gọi app.listen() — entry point
│   ├── config/
│   │   └── index.js              # Đọc biến môi trường (PORT, JWT_SECRET, ...)
│   ├── middleware/
│   │   ├── authMiddleware.js     # Xác thực JWT, gắn req.userId
│   │   └── errorHandler.js       # Middleware bắt lỗi tập trung (Error-handling middleware)
│   ├── errors/
│   │   └── AppError.js           # Custom error class (statusCode, message, isOperational)
│   ├── controllers/
│   │   ├── authController.js     # Xử lý request auth
│   │   ├── categoryController.js # Xử lý request category
│   │   ├── transactionController.js  # Xử lý request transaction
│   │   └── summaryController.js  # Xử lý request summary/thống kê
│   ├── services/
│   │   ├── authService.js        # Nghiệp vụ đăng ký, đăng nhập, hash password, tạo JWT
│   │   ├── categoryService.js    # Nghiệp vụ quản lý danh mục
│   │   ├── transactionService.js # Nghiệp vụ giao dịch
│   │   └── summaryService.js     # Nghiệp vụ tính toán, thống kê
│   ├── repositories/
│   │   ├── userRepository.js     # Lưu trữ user In-Memory
│   │   ├── categoryRepository.js # Lưu trữ category In-Memory + seed data
│   │   └── transactionRepository.js # Lưu trữ transaction In-Memory
│   ├── routes/
│   │   ├── index.js              # Router chính, mount sub-routers
│   │   ├── authRoutes.js         # Route definitions cho auth
│   │   ├── categoryRoutes.js     # Route definitions cho category
│   │   ├── transactionRoutes.js  # Route definitions cho transaction
│   │   └── summaryRoutes.js      # Route definitions cho summary
│   └── utils/
│       ├── validators.js         # Hàm validation thuần (email, date, amount...)
│       └── dateUtils.js          # Parse, format, so sánh ngày
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── authService.test.js
│   │   │   ├── categoryService.test.js
│   │   │   ├── transactionService.test.js
│   │   │   └── summaryService.test.js
│   │   └── utils/
│   │       ├── validators.test.js
│   │       └── dateUtils.test.js
│   └── integration/
│       ├── auth.test.js
│       ├── categories.test.js
│       ├── transactions.test.js
│       └── summary.test.js
└── specs/                        # Tài liệu thiết kế (file này)
    └── system-design.md
```

> **Lý do tách `app.js` và `server.js`:** `app.js` export Express app instance để supertest dùng trực tiếp mà không cần khởi động server thật. `server.js` chỉ là entry point gọi `app.listen()`.

### 4.2 Chi tiết từng lớp

#### 4.2.1 Repository Layer

Mỗi repository là một **class instance** (singleton) export. Có cùng interface pattern:

**`UserRepository`**
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `create(userData)` | `{ id, name, email, passwordHash, createdAt }` | `User` | Thêm user mới |
| `findById(id)` | `string` | `User \| null` | Tìm user theo ID |
| `findByEmail(email)` | `string` | `User \| null` | Tìm user theo email |
| `clear()` | — | `void` | Reset dữ liệu (cho test) |

**`CategoryRepository`**
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `create(categoryData)` | `{ id, name, type, isDefault, userId, createdAt }` | `Category` | Thêm danh mục |
| `findById(id)` | `string` | `Category \| null` | Tìm theo ID |
| `findByUserId(userId)` | `string` | `Category[]` | Lấy danh mục default + danh mục user |
| `findByUserIdAndType(userId, type)` | `string, string` | `Category[]` | Lọc thêm theo type |
| `update(id, data)` | `string, Partial<Category>` | `Category \| null` | Cập nhật |
| `delete(id)` | `string` | `boolean` | Xóa, trả `true` nếu thành công |
| `clear()` | — | `void` | Reset + re-seed danh mục mặc định |

**`TransactionRepository`**
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `create(txData)` | `{ id, type, amount, ... }` | `Transaction` | Thêm giao dịch |
| `findById(id)` | `string` | `Transaction \| null` | Tìm theo ID |
| `findByUserId(userId, filters?)` | `string, { type?, categoryId?, startDate?, endDate? }` | `Transaction[]` | Tìm theo user + bộ lọc |
| `update(id, data)` | `string, Partial<Transaction>` | `Transaction \| null` | Cập nhật |
| `delete(id)` | `string` | `boolean` | Xóa |
| `clear()` | — | `void` | Reset dữ liệu |

#### 4.2.2 Service Layer

Mỗi service nhận repository qua **constructor (DI)**:

**`AuthService`** — `constructor(userRepository)`
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `register({ name, email, password })` | object | `{ user }` | Validate input → kiểm tra email trùng → hash password → tạo user |
| `login({ email, password })` | object | `{ token, user }` | Validate → tìm user → so sánh hash → tạo JWT |

**`CategoryService`** — `constructor(categoryRepository)`
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `getCategories(userId, type?)` | `string, string?` | `Category[]` | Lấy danh mục (default + user), lọc theo type |
| `createCategory(userId, { name, type })` | `string, object` | `Category` | Validate → kiểm tra trùng tên → tạo mới |
| `updateCategory(userId, categoryId, { name })` | `string, string, object` | `Category` | Kiểm tra quyền + isDefault → cập nhật |
| `deleteCategory(userId, categoryId)` | `string, string` | `void` | Kiểm tra quyền + isDefault → xóa |

**`TransactionService`** — `constructor(transactionRepository, categoryRepository)`
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `createTransaction(userId, data)` | `string, { type, amount, categoryId, date?, note? }` | `Transaction` | Validate → kiểm tra category tồn tại + khớp type → tạo |
| `getTransactions(userId, filters?)` | `string, object?` | `Transaction[]` | Lấy danh sách có lọc |
| `getTransactionById(userId, txId)` | `string, string` | `Transaction` | Tìm + kiểm tra ownership |
| `updateTransaction(userId, txId, data)` | `string, string, object` | `Transaction` | Validate + ownership → cập nhật |
| `deleteTransaction(userId, txId)` | `string, string` | `void` | Ownership → xóa |

**`SummaryService`** — `constructor(transactionRepository, categoryRepository)`
| Phương thức | Tham số | Trả về | Trách nhiệm |
|-------------|---------|--------|-------------|
| `getBalance(userId, { startDate?, endDate? })` | `string, object` | `{ totalIncome, totalExpense, balance }` | Lấy transactions → tính tổng |
| `getByCategory(userId, { type?, startDate?, endDate? })` | `string, object` | `[{ categoryId, categoryName, type, total }]` | Group by category → sum |

#### 4.2.3 Controller Layer

Mỗi controller là tập hàm handler (không phải class). Nhận `service` qua factory function hoặc module-level import.

Pattern cho mỗi handler:
```
(req, res, next) => {
  1. Trích xuất dữ liệu từ req (params, body, query, userId từ auth middleware)
  2. Gọi service method
  3. Định dạng response (status code + JSON)
  4. Nếu lỗi → next(error) để errorHandler middleware xử lý
}
```

### 4.3 Luồng xử lý request điển hình

> Ví dụ: `POST /api/v1/transactions` — Tạo giao dịch mới

```mermaid
sequenceDiagram
    participant Client
    participant Router as Express Router
    participant Auth as authMiddleware
    participant Ctrl as transactionController
    participant Svc as TransactionService
    participant CatRepo as CategoryRepository
    participant TxRepo as TransactionRepository
    participant ErrMW as errorHandler

    Client->>Router: POST /api/v1/transactions<br/>Header: Authorization: Bearer <token><br/>Body: { type, amount, categoryId, ... }
    Router->>Auth: Xác thực JWT
    
    alt Token không hợp lệ
        Auth->>ErrMW: next(AppError(401, "Token không hợp lệ"))
        ErrMW->>Client: 401 { error: "Token không hợp lệ" }
    end
    
    Auth->>Auth: Gắn req.userId = decoded.userId
    Auth->>Ctrl: next()
    
    Ctrl->>Ctrl: Trích xuất { type, amount, categoryId, date, note } từ req.body
    Ctrl->>Svc: createTransaction(req.userId, data)
    
    Svc->>Svc: Validate: amount > 0, type ∈ {income, expense}, ...
    
    alt Validation thất bại
        Svc->>Ctrl: throw AppError(400, "Số tiền phải là số nguyên dương")
        Ctrl->>ErrMW: next(error)
        ErrMW->>Client: 400 { error: "Số tiền phải là số nguyên dương" }
    end
    
    Svc->>CatRepo: findById(categoryId)
    CatRepo-->>Svc: category hoặc null
    
    alt Category không tồn tại hoặc type không khớp
        Svc->>Ctrl: throw AppError(400, "Danh mục không hợp lệ")
        Ctrl->>ErrMW: next(error)
        ErrMW->>Client: 400 { error: "Danh mục không hợp lệ" }
    end
    
    Svc->>TxRepo: create({ id, type, amount, categoryId, ... })
    TxRepo-->>Svc: newTransaction
    Svc-->>Ctrl: newTransaction
    Ctrl->>Client: 201 { transaction: { ... } }
```

### 4.4 Chiến lược xử lý lỗi

#### Custom Error Class — `AppError`

```
class AppError extends Error
  - statusCode: number (400, 401, 403, 404, 409)
  - message: string
  - isOperational: boolean (default: true)
  
  Mục đích: Phân biệt lỗi nghiệp vụ (operational) với lỗi hệ thống (programming error).
```

#### Error-Handling Middleware — `errorHandler`

```
Signature: (err, req, res, next) => void

Logic:
  - Nếu err là AppError (isOperational = true):
      → res.status(err.statusCode).json({ error: err.message })
  - Nếu err là lỗi không mong đợi:
      → console.error(err)
      → res.status(500).json({ error: "Đã xảy ra lỗi hệ thống" })
```

#### Luồng lỗi xuyên tầng

| Tầng | Trách nhiệm xử lý lỗi |
|------|------------------------|
| **Repository** | Không throw lỗi nghiệp vụ. Trả `null` / `false` khi không tìm thấy. |
| **Service** | Kiểm tra kết quả từ repository. Nếu vi phạm nghiệp vụ → `throw new AppError(statusCode, message)`. |
| **Controller** | Gọi service trong try/catch, bắt lỗi → `next(error)`. Hoặc dùng async wrapper. |
| **errorHandler** | Middleware cuối cùng, chuyển AppError thành JSON response thống nhất. |

#### Async Wrapper (tránh try/catch lặp lại)

```
Hàm catchAsync nhận một async function, trả về (req, res, next) => fn(req, res, next).catch(next)
```

> **Lý do:** Mỗi controller handler sẽ được wrap bởi `catchAsync()`, tự động forward lỗi tới `errorHandler`. Giữ code controller sạch, không có try/catch thủ công.

### 4.5 Dependency Injection (DI)

#### Chiến lược: Constructor Injection + Composition Root

```
Composition Root (src/app.js):
  1. Khởi tạo repositories (singletons)
  2. Khởi tạo services, truyền repositories vào constructor
  3. Khởi tạo controllers/routes, truyền services
  4. Gắn routes vào Express app
```

**Lý do chọn Constructor Injection:**
- Service không import trực tiếp repository module → dễ mock khi unit test.
- Khi chuyển sang DB thật ở Phase 2, chỉ cần thay repository instance tại Composition Root.
- Không cần thêm DI framework bên ngoài.

**Ví dụ pseudo-code cho Composition Root:**
```
// src/app.js
import express from 'express';

// 1. Repositories
const userRepo = new UserRepository();
const categoryRepo = new CategoryRepository();  // auto-seed defaults
const transactionRepo = new TransactionRepository();

// 2. Services
const authService = new AuthService(userRepo);
const categoryService = new CategoryService(categoryRepo);
const transactionService = new TransactionService(transactionRepo, categoryRepo);
const summaryService = new SummaryService(transactionRepo, categoryRepo);

// 3. Routes (factory functions nhận service)
app.use('/api/v1/auth', createAuthRoutes(authService));
app.use('/api/v1/categories', authMiddleware, createCategoryRoutes(categoryService));
app.use('/api/v1/transactions', authMiddleware, createTransactionRoutes(transactionService));
app.use('/api/v1/summary', authMiddleware, createSummaryRoutes(summaryService));

// 4. Error handler (cuối cùng)
app.use(errorHandler);
```

---

## 5. Chiến lược kiểm thử

### 5.1 Cấu hình Jest với ES Modules

```json
// package.json (scripts)
{
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
}
```

```js
// jest.config.js
{
  transform: {},  // Không dùng Babel — native ESM
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [],  // .js đã là ESM qua "type": "module"
  testMatch: ['**/tests/**/*.test.js']
}
```

### 5.2 Reset dữ liệu giữa các test

- **Unit tests:** Mỗi test suite tạo repository instance mới, hoặc gọi `repo.clear()` trong `beforeEach`.
- **Integration tests:** `beforeEach` gọi `clear()` trên tất cả repositories (thông qua export từ `app.js` hoặc helper test).

### 5.3 Danh sách Unit Test — Service Layer

#### `authService.test.js`

| Test case | Loại | Mô tả |
|-----------|------|-------|
| `register` — happy path | ✅ Happy | Đăng ký thành công, trả về user không chứa passwordHash |
| `register` — email trùng | ❌ Error | Throw AppError 409 khi email đã tồn tại |
| `register` — thiếu email | ❌ Error | Throw AppError 400 |
| `register` — password quá ngắn | ❌ Error | Throw AppError 400 khi password < 6 ký tự |
| `login` — happy path | ✅ Happy | Đăng nhập đúng, trả về token + user |
| `login` — email không tồn tại | ❌ Error | Throw AppError 401 |
| `login` — sai password | ❌ Error | Throw AppError 401 |

#### `categoryService.test.js`

| Test case | Loại | Mô tả |
|-----------|------|-------|
| `getCategories` — trả về default + custom | ✅ Happy | Trả đúng danh mục mặc định + danh mục user đã tạo |
| `getCategories` — lọc theo type | ✅ Happy | Chỉ trả danh mục income hoặc expense |
| `createCategory` — happy path | ✅ Happy | Tạo danh mục tùy chỉnh thành công |
| `createCategory` — trùng tên | ❌ Error | Throw AppError 409 khi tên trùng (cùng user + type) |
| `createCategory` — type không hợp lệ | ❌ Error | Throw AppError 400 |
| `updateCategory` — happy path | ✅ Happy | Đổi tên danh mục tùy chỉnh |
| `updateCategory` — danh mục mặc định | ❌ Error | Throw AppError 403 |
| `updateCategory` — danh mục user khác | ❌ Error | Throw AppError 404 |
| `deleteCategory` — happy path | ✅ Happy | Xóa thành công |
| `deleteCategory` — danh mục mặc định | ❌ Error | Throw AppError 403 |

#### `transactionService.test.js`

| Test case | Loại | Mô tả |
|-----------|------|-------|
| `createTransaction` — happy path | ✅ Happy | Tạo giao dịch hợp lệ |
| `createTransaction` — amount ≤ 0 | ❌ Error | Throw AppError 400 |
| `createTransaction` — amount là float | ❌ Error | Throw AppError 400 |
| `createTransaction` — categoryId không tồn tại | ❌ Error | Throw AppError 400 |
| `createTransaction` — type không khớp category type | ❌ Error | Throw AppError 400 |
| `createTransaction` — ngày không hợp lệ | ❌ Error | Throw AppError 400 |
| `createTransaction` — không gửi date → default today | ✅ Happy | date tự động = today |
| `getTransactions` — lọc theo type | ✅ Happy | Chỉ trả giao dịch đúng type |
| `getTransactions` — lọc theo khoảng thời gian | ✅ Happy | Trả giao dịch trong khoảng startDate~endDate |
| `getTransactionById` — không tìm thấy | ❌ Error | Throw AppError 404 |
| `getTransactionById` — giao dịch của user khác | ❌ Error | Throw AppError 404 (ẩn sự tồn tại) |
| `updateTransaction` — happy path | ✅ Happy | Cập nhật thành công, updatedAt thay đổi |
| `deleteTransaction` — happy path | ✅ Happy | Xóa thành công |

#### `summaryService.test.js`

| Test case | Loại | Mô tả |
|-----------|------|-------|
| `getBalance` — có cả thu và chi | ✅ Happy | `balance = totalIncome - totalExpense` đúng |
| `getBalance` — không có giao dịch | ✅ Edge | Trả `{ totalIncome: 0, totalExpense: 0, balance: 0 }` |
| `getBalance` — lọc theo thời gian | ✅ Happy | Chỉ tính trong khoảng |
| `getByCategory` — nhiều danh mục | ✅ Happy | Group chính xác, tổng đúng |
| `getByCategory` — không có giao dịch | ✅ Edge | Trả mảng rỗng |
| `getByCategory` — lọc theo type + thời gian | ✅ Happy | Kết hợp bộ lọc |

#### `validators.test.js` & `dateUtils.test.js`

| Test case | Loại | Mô tả |
|-----------|------|-------|
| `isValidEmail` — email hợp lệ | ✅ Happy | Trả `true` |
| `isValidEmail` — chuỗi rỗng / thiếu @ | ❌ Error | Trả `false` |
| `isValidDate` — ngày hợp lệ | ✅ Happy | `2026-10-08` → `true` |
| `isValidDate` — ngày không tồn tại | ❌ Error | `2026-02-30` → `false` |
| `isDateInRange` — trong khoảng | ✅ Happy | Trả `true` |
| `isDateInRange` — ngoài khoảng | ❌ Error | Trả `false` |

### 5.4 Danh sách Integration Test — Endpoint

#### `auth.test.js`

| Test case | Method | Path | Mô tả | Expected |
|-----------|--------|------|-------|----------|
| Đăng ký thành công | POST | `/auth/register` | Body hợp lệ | `201`, có user |
| Đăng ký email trùng | POST | `/auth/register` | Email đã tồn tại | `409`, `{ error }` |
| Đăng ký thiếu trường | POST | `/auth/register` | Thiếu email | `400`, `{ error }` |
| Đăng nhập thành công | POST | `/auth/login` | Credentials đúng | `200`, có token |
| Đăng nhập sai password | POST | `/auth/login` | Password sai | `401`, `{ error }` |

#### `categories.test.js`

| Test case | Method | Path | Mô tả | Expected |
|-----------|--------|------|-------|----------|
| Lấy danh mục (có auth) | GET | `/categories` | Token hợp lệ | `200`, có default categories |
| Lấy danh mục (không auth) | GET | `/categories` | Không có token | `401` |
| Lọc theo type | GET | `/categories?type=income` | Lọc | `200`, chỉ income |
| Tạo danh mục | POST | `/categories` | Body hợp lệ | `201` |
| Tạo trùng tên | POST | `/categories` | Tên đã tồn tại | `409` |
| Sửa danh mục custom | PUT | `/categories/:id` | Danh mục user | `200` |
| Sửa danh mục default | PUT | `/categories/:id` | Danh mục mặc định | `403` |
| Xóa danh mục custom | DELETE | `/categories/:id` | Danh mục user | `204` |
| Xóa danh mục default | DELETE | `/categories/:id` | Danh mục mặc định | `403` |

#### `transactions.test.js`

| Test case | Method | Path | Mô tả | Expected |
|-----------|--------|------|-------|----------|
| Tạo giao dịch | POST | `/transactions` | Body hợp lệ | `201` |
| Tạo — amount âm | POST | `/transactions` | `amount: -100` | `400` |
| Liệt kê | GET | `/transactions` | User có giao dịch | `200`, mảng > 0 |
| Lọc theo type | GET | `/transactions?type=expense` | Lọc | `200`, chỉ expense |
| Lọc theo thời gian | GET | `/transactions?startDate=...&endDate=...` | Lọc | `200` |
| Lấy theo ID | GET | `/transactions/:id` | ID tồn tại | `200` |
| Lấy ID không tồn tại | GET | `/transactions/:id` | ID sai | `404` |
| Cập nhật | PUT | `/transactions/:id` | Body hợp lệ | `200` |
| Xóa | DELETE | `/transactions/:id` | ID tồn tại | `204` |
| Truy cập giao dịch user khác | GET | `/transactions/:id` | Token user B, ID user A | `404` |

#### `summary.test.js`

| Test case | Method | Path | Mô tả | Expected |
|-----------|--------|------|-------|----------|
| Số dư tổng | GET | `/summary/balance` | Có giao dịch | `200`, balance đúng |
| Số dư không có giao dịch | GET | `/summary/balance` | User mới | `200`, all = 0 |
| Số dư lọc thời gian | GET | `/summary/balance?startDate=...&endDate=...` | Lọc | `200` |
| Thống kê theo danh mục | GET | `/summary/by-category` | Có giao dịch | `200`, mảng summary |
| Thống kê — lọc type + thời gian | GET | `/summary/by-category?type=expense&...` | Lọc | `200` |

---

## 6. Lộ trình triển khai

### Tổng quan các bước

```mermaid
graph LR
    S1["Step 1<br/>Khởi tạo dự án"] --> S2["Step 2<br/>Errors & Utils"]
    S2 --> S3["Step 3<br/>Repositories"]
    S3 --> S4["Step 4<br/>Auth Service<br/>+ Unit Test"]
    S4 --> S5["Step 5<br/>Auth Controller<br/>+ Route + Middleware"]
    S5 --> S6["Step 6<br/>Auth Integration Test"]
    S6 --> S7["Step 7<br/>Category Service<br/>+ Unit Test"]
    S7 --> S8["Step 8<br/>Category Controller<br/>+ Route"]
    S8 --> S9["Step 9<br/>Category Integration Test"]
    S9 --> S10["Step 10<br/>Transaction Service<br/>+ Unit Test"]
    S10 --> S11["Step 11<br/>Transaction Controller<br/>+ Route"]
    S11 --> S12["Step 12<br/>Transaction Integration Test"]
    S12 --> S13["Step 13<br/>Summary Service<br/>+ Unit Test"]
    S13 --> S14["Step 14<br/>Summary Controller<br/>+ Route"]
    S14 --> S15["Step 15<br/>Summary Integration Test"]
    S15 --> S16["Step 16<br/>Polish & Review"]
```

### Chi tiết từng bước

#### Step 1 — Khởi tạo dự án
| | |
|---|---|
| **Mục tiêu** | Khởi tạo Node.js project với ESM, cài dependencies |
| **File tạo/sửa** | `package.json`, `jest.config.js`, `src/server.js`, `src/app.js`, `src/config/index.js` |
| **DoD** | `npm test` chạy được (dù chưa có test). `node src/server.js` khởi động server trả `404` cho mọi route. `"type": "module"` trong `package.json`. |

#### Step 2 — Errors, Utils, Middleware
| | |
|---|---|
| **Mục tiêu** | Xây nền tảng: custom error class, validation utils, error handler middleware, auth middleware |
| **File tạo** | `src/errors/AppError.js`, `src/utils/validators.js`, `src/utils/dateUtils.js`, `src/middleware/errorHandler.js`, `src/middleware/authMiddleware.js` |
| **DoD** | Unit test cho `validators.js` và `dateUtils.js` pass. `AppError` có thể tạo instance với statusCode + message. |
| **File test** | `tests/unit/utils/validators.test.js`, `tests/unit/utils/dateUtils.test.js` |

#### Step 3 — Repositories
| | |
|---|---|
| **Mục tiêu** | Triển khai 3 repositories với In-Memory storage |
| **File tạo** | `src/repositories/userRepository.js`, `src/repositories/categoryRepository.js`, `src/repositories/transactionRepository.js` |
| **DoD** | Mỗi repository có đầy đủ phương thức theo thiết kế. `CategoryRepository` seed được danh mục mặc định. `clear()` hoạt động. Có thể tạo/tìm/sửa/xóa entity. |

#### Step 4 — Auth Service + Unit Test
| | |
|---|---|
| **Mục tiêu** | Nghiệp vụ đăng ký, đăng nhập, hash password, tạo/verify JWT |
| **File tạo** | `src/services/authService.js`, `tests/unit/services/authService.test.js` |
| **DoD** | 7 unit test cases pass (xem bảng 5.3). Password được hash, JWT tạo và verify thành công. |

#### Step 5 — Auth Controller + Route + Middleware
| | |
|---|---|
| **Mục tiêu** | Endpoint đăng ký/đăng nhập hoạt động end-to-end |
| **File tạo** | `src/controllers/authController.js`, `src/routes/authRoutes.js`, `src/routes/index.js` |
| **File sửa** | `src/app.js` (gắn routes, middleware) |
| **DoD** | `POST /api/v1/auth/register` và `POST /api/v1/auth/login` trả response đúng. Auth middleware xác thực JWT cho các route protected. |

#### Step 6 — Auth Integration Test
| | |
|---|---|
| **Mục tiêu** | Kiểm tra luồng auth qua HTTP |
| **File tạo** | `tests/integration/auth.test.js` |
| **DoD** | 5 integration test cases pass (xem bảng 5.4). |

#### Step 7 — Category Service + Unit Test
| | |
|---|---|
| **Mục tiêu** | Nghiệp vụ CRUD danh mục |
| **File tạo** | `src/services/categoryService.js`, `tests/unit/services/categoryService.test.js` |
| **DoD** | 10 unit test cases pass. |

#### Step 8 — Category Controller + Route
| | |
|---|---|
| **Mục tiêu** | Endpoint CRUD danh mục hoạt động |
| **File tạo** | `src/controllers/categoryController.js`, `src/routes/categoryRoutes.js` |
| **File sửa** | `src/routes/index.js` |
| **DoD** | 4 endpoints (GET, POST, PUT, DELETE) hoạt động với auth. |

#### Step 9 — Category Integration Test
| | |
|---|---|
| **Mục tiêu** | Kiểm tra luồng category qua HTTP |
| **File tạo** | `tests/integration/categories.test.js` |
| **DoD** | 9 integration test cases pass. |

#### Step 10 — Transaction Service + Unit Test
| | |
|---|---|
| **Mục tiêu** | Nghiệp vụ CRUD giao dịch |
| **File tạo** | `src/services/transactionService.js`, `tests/unit/services/transactionService.test.js` |
| **DoD** | 13 unit test cases pass. |

#### Step 11 — Transaction Controller + Route
| | |
|---|---|
| **Mục tiêu** | Endpoint CRUD giao dịch hoạt động |
| **File tạo** | `src/controllers/transactionController.js`, `src/routes/transactionRoutes.js` |
| **File sửa** | `src/routes/index.js` |
| **DoD** | 5 endpoints hoạt động. Lọc theo type, categoryId, thời gian hoạt động. |

#### Step 12 — Transaction Integration Test
| | |
|---|---|
| **Mục tiêu** | Kiểm tra luồng transaction qua HTTP |
| **File tạo** | `tests/integration/transactions.test.js` |
| **DoD** | 10 integration test cases pass. |

#### Step 13 — Summary Service + Unit Test
| | |
|---|---|
| **Mục tiêu** | Nghiệp vụ tính số dư, thống kê |
| **File tạo** | `src/services/summaryService.js`, `tests/unit/services/summaryService.test.js` |
| **DoD** | 6 unit test cases pass. |

#### Step 14 — Summary Controller + Route
| | |
|---|---|
| **Mục tiêu** | Endpoint summary hoạt động |
| **File tạo** | `src/controllers/summaryController.js`, `src/routes/summaryRoutes.js` |
| **File sửa** | `src/routes/index.js` |
| **DoD** | 2 endpoints hoạt động với bộ lọc. |

#### Step 15 — Summary Integration Test
| | |
|---|---|
| **Mục tiêu** | Kiểm tra luồng summary qua HTTP |
| **File tạo** | `tests/integration/summary.test.js` |
| **DoD** | 5 integration test cases pass. |

#### Step 16 — Polish & Review
| | |
|---|---|
| **Mục tiêu** | Rà soát toàn bộ, đảm bảo tuân thủ quy chuẩn |
| **Checklist** | ☐ Tất cả test pass (`npm test`). ☐ Không có try/catch rỗng. ☐ Naming convention đúng. ☐ Không có `import` repository trực tiếp trong controller. ☐ Mọi response lỗi đều có dạng `{ error: "..." }`. |

### Rủi ro kỹ thuật & Giảm thiểu

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|--------|----------|------------|
| **Jest + ESM** có thể gặp lỗi với `--experimental-vm-modules` | Test không chạy được | Sử dụng Node.js LTS ≥ 20. Cấu hình `transform: {}` trong jest config. Kiểm tra ngay ở Step 1. |
| **JWT tự triển khai bằng `crypto`** có thể phức tạp hơn dự kiến | Tốn thời gian | Sử dụng HMAC-SHA256 đơn giản. Chỉ cần `sign` và `verify`. Không cần refresh token ở Phase 1. |
| **Dữ liệu In-Memory mất khi restart** | User phải tạo lại dữ liệu mỗi lần restart | Chấp nhận ở Phase 1. Thiết kế repository interface sẵn sàng cho DB thật ở Phase 2. |
| **Race condition trong In-Memory** | Dữ liệu inconsistent nếu nhiều request đồng thời | Node.js single-threaded nên không có vấn đề với In-Memory. Ghi chú cho Phase 2 khi dùng DB thật. |
| **Category bị xóa nhưng Transaction vẫn tham chiếu** | Dữ liệu orphaned | Kiểm tra xem category có đang được dùng bởi transaction nào không trước khi cho phép xóa, hoặc trả lỗi 409 Conflict. |

---

## 7. Checklist tuân thủ quy chuẩn

| # | Quy tắc | Cách đảm bảo |
|---|---------|-------------|
| 1.1 | Node.js LTS | Ghi rõ `engines` trong `package.json`: `"node": ">=20.0.0"` |
| 1.2 | ES Modules | `"type": "module"` trong `package.json`. Toàn bộ code dùng `import`/`export`. |
| 1.3 | Chỉ dùng Express, Jest, Supertest | Không cài thêm thư viện ngoài. JWT và hash password dùng `node:crypto` built-in. |
| 2.1 | 3 lớp: Controller → Service → Repository | Cấu trúc thư mục tách biệt. Controller chỉ gọi Service, Service gọi Repository. |
| 2.2 | Controller không chứa business logic | Controller chỉ: trích xuất request → gọi service → format response. |
| 2.3 | Service không thao tác HTTP | Service nhận/trả plain objects, không biết `req`/`res`. |
| 2.4 | Controller không gọi Repository | Đảm bảo bằng DI: controller chỉ nhận service instance, không nhận repository. |
| 3.1 | Không try/catch rỗng | Dùng `catchAsync` wrapper + `errorHandler` middleware. Mọi catch đều xử lý hoặc forward lỗi. |
| 3.2 | Response lỗi JSON thống nhất | `errorHandler` middleware luôn trả `{ "error": "..." }`. `AppError` class chuẩn hóa. |
| 3.3 | camelCase hàm/biến, PascalCase class | `AppError` (class), `createTransaction` (hàm), `totalIncome` (biến). Review ở Step 16. |
| 4.1 | Unit test: happy + edge | Bảng test chi tiết ở phần 5.3: mỗi hàm service ≥ 1 happy + 1 edge. Tổng ≈ 36+ unit test. |
| 4.2 | Integration test với Supertest | Bảng test chi tiết ở phần 5.4: mỗi endpoint ≥ 1 test. Tổng ≈ 29+ integration test. |

---

> [!IMPORTANT]
> Tài liệu này là **bản thiết kế kỹ thuật Phase 1**. Mọi triển khai phải tuân thủ thiết kế này. Khi cần thay đổi, cập nhật tài liệu trước khi code.
