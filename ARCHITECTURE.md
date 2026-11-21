# Kiến trúc vCraft

vCraft dùng HTML, CSS và JavaScript module cho [giao diện](frontend/README.md). Express định tuyến trang và phục vụ REST API. Các nghiệp vụ lưu dữ liệu qua Prisma và PostgreSQL.

## Cấu trúc thư mục

```text
vCraft/
├── ARCHITECTURE.md
├── backend/
│   ├── src/
│   │   ├── server.js               # Điểm khởi động HTTP server
│   │   ├── app.js                  # Cấu hình ứng dụng Express
│   │   ├── config/                 # Đọc cấu hình từ biến môi trường
│   │   ├── routes/                 # Điểm vào của REST API dưới /api
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
│   ├── schema.prisma               # Model Prisma cho PostgreSQL
│   ├── migrations/                 # Lịch sử khởi tạo và thay đổi schema
│   └── seed.js                     # Dữ liệu Nha Xá và tài khoản phát triển
├── database/
│   ├── postgresql/
│   │   ├── relational-schema.sql   # DDL và dữ liệu mẫu của thiết kế ban đầu
│   │   ├── configure-roles.sql     # Quyền sở hữu schema của tài khoản migration
│   │   └── grant-runtime.sql       # Quyền đọc/ghi cho tài khoản ứng dụng
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
Frontend → Route/Middleware → Handler → Service → Repository → Prisma → PostgreSQL
```

- Route gắn URL với middleware và handler. Middleware xác thực, kiểm tra quyền truy cập tuyến và kiểm tra đầu vào.
- Controller nhận dữ liệu đã kiểm tra, gọi service và trả HTTP response. Danh mục, đặt sỉ, bán lẻ và trang truy xuất dùng controller riêng. `site.routes.js` ánh xạ URL trang, còn `routes/index.js` định tuyến bên dưới `/api`.
- Service xử lý quyền trên từng tài nguyên, kiểm tra trạng thái và điều phối các thao tác cần nằm trong cùng một giao dịch. Ví dụ, khi tạo đơn B2C, service điều phối việc tạo đơn và các dòng sản phẩm rồi cập nhật giỏ hàng trong cùng giao dịch.
- Repository tập trung truy vấn, ghi dữ liệu và giao dịch qua Prisma Client chung. Tìm không dấu và khóa bản ghi nằm trong `database/postgresql/`. Khi đổi hệ quản trị cần chuyển các truy vấn riêng này và lịch sử migration.
- Repository danh mục dùng `select` để đọc các cột công khai và quan hệ cần thiết. HTTP và lệnh xuất JSON dùng chung presenter để chuẩn hóa giá và ngày giờ. Xem [thiết kế và cách kiểm tra Persistence Layer](docs/persistence-layer.md).
- Prisma Client backend dùng `DATABASE_URL` của tài khoản ứng dụng. Prisma CLI và seed phát triển dùng `MIGRATION_DATABASE_URL` của tài khoản migration.

## Phân hệ nghiệp vụ

Tên phân hệ được dùng xuyên suốt các tầng. Ví dụ, luồng bán lẻ đi qua `retail.routes.js`, `retail.service.js` và `retail.repository.js`.

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
