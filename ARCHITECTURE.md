# Kiến trúc vCraft

vCraft gồm giao diện web trong `frontend/` và bộ khung REST API trong `backend/`. Frontend hiện có [bản demo HTML, CSS và JavaScript](frontend/README.md) dùng dữ liệu mẫu. Bộ khung API dùng JavaScript trên Node.js, dự kiến dùng Express cho tầng HTTP và Prisma để truy cập PostgreSQL.

## Cấu trúc thư mục

```text
vCraft/
├── ARCHITECTURE.md
├── backend/
│   ├── src/
│   │   ├── server.js               # Điểm khởi động HTTP server
│   │   ├── app.js                  # Cấu hình ứng dụng Express
│   │   ├── config/                 # Đọc cấu hình từ biến môi trường
│   │   ├── routes/                 # Điểm vào của REST API, dự kiến /api/v1
│   │   ├── middlewares/            # Xác thực, phân quyền, kiểm tra dữ liệu, xử lý lỗi
│   │   ├── controllers/            # Nhận yêu cầu HTTP và trả phản hồi
│   │   ├── services/               # Quy tắc nghiệp vụ và điều phối giao dịch
│   │   ├── repositories/           # Truy vấn dữ liệu qua Prisma
│   │   └── database/               # Khởi tạo Prisma Client dùng chung
│   └── tests/
│       ├── unit/
│       └── integration/
├── frontend/
│   ├── index.html                  # Điểm vào bản demo
│   ├── public/                     # Tệp tĩnh
│   └── src/
│       ├── main.js                 # Điểm khởi động giao diện
│       ├── api/                    # Client gọi API của backend
│       ├── components/             # Thành phần giao diện dùng chung
│       ├── data/                   # Dữ liệu mẫu cho bản demo
│       ├── pages/                  # Màn hình theo chức năng
│       └── styles/                 # CSS dùng chung
├── prisma/
│   └── schema.prisma               # Schema PostgreSQL hiện có
├── database/
│   ├── postgresql/
│   │   └── relational-schema.sql   # DDL và dữ liệu mẫu dùng bởi Docker Compose
│   └── mysql/
│       └── vcraft_mysql.sql        # Script SQL cho MySQL
├── docs/
│   ├── README.md                   # Mục lục tài liệu
│   ├── requirements/              # Yêu cầu nghiệp vụ
│   └── erd/
│       ├── erd-draft.md            # Báo cáo thiết kế cơ sở dữ liệu
│       ├── images/                 # Ảnh sơ đồ ERD
│       ├── visualizers/            # Trang HTML xem sơ đồ
│       ├── scripts/                # Công cụ Python tạo sơ đồ
│       └── source/                 # Dữ liệu nguồn của sơ đồ
├── docker-compose.yml              # PostgreSQL, Redis và pgAdmin cho môi trường local
├── .env.example
├── .gitignore
└── README.md
```

## Luồng xử lý

```text
Frontend → Route → Middleware → Controller → Service → Repository → Prisma → PostgreSQL
```

- Route gắn URL với middleware và controller. Middleware xác thực, kiểm tra quyền truy cập tuyến và kiểm tra đầu vào.
- Controller lấy dữ liệu từ yêu cầu, gọi service và chuyển kết quả thành phản hồi HTTP.
- Service xử lý quyền trên từng tài nguyên, kiểm tra trạng thái và điều phối các thao tác cần nằm trong cùng một giao dịch. Ví dụ, khi tạo đơn B2C, service điều phối việc tạo đơn và các dòng sản phẩm rồi cập nhật giỏ hàng trong cùng giao dịch.
- Repository tập trung truy vấn và ghi dữ liệu. Các repository dùng Prisma Client chung từ `database/prisma.js`.

## Phân hệ nghiệp vụ

Tên phân hệ được dùng xuyên suốt các tầng. Ví dụ, luồng bán lẻ đi qua `retail.routes.js`, `retail.controller.js`, `retail.service.js` và `retail.repository.js`.

| Phân hệ | Phạm vi |
| --- | --- |
| `auth`, `users` | Đăng ký, đăng nhập, tài khoản và vai trò. Auth dùng chung `users.repository.js`. |
| `artisans` | Hồ sơ, chứng nhận nghệ nhân và vị trí xưởng trên bản đồ. |
| `products` | Danh mục, sản phẩm và nội dung trưng bày sản phẩm. |
| `traceability` | Lô sản phẩm, nhật ký công đoạn và tra cứu qua mã QR. |
| `retail` | Giỏ hàng và đơn bán lẻ B2C. |
| `wholesale` | Yêu cầu báo giá, chào giá và phân công sản xuất B2B. |
| `reviews` | Đánh giá sản phẩm và nghệ nhân. |
| `notifications` | Thông báo cho người dùng. |
| `news` | Bài viết và tin cộng đồng làng nghề. |
| `admin` | Điều phối tác vụ quản trị. `audit-log.repository.js` lưu nhật ký thao tác. |
