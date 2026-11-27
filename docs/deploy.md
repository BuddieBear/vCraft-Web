# Hướng dẫn triển khai vCraft

vCraft chạy dưới dạng một tiến trình Node.js 22 + Express phục vụ đồng thời giao diện tĩnh (`frontend/`) và REST API (`/api`) trên cùng một origin, kết nối PostgreSQL 18 và lưu tệp ảnh tải lên trên hệ thống tệp cục bộ hoặc volume gắn ngoài.

## 1. Biến môi trường cần thiết & lưu ý bảo mật

Sao chép [`.env.example`](../.env.example) sang `.env` (hoặc cấu hình biến môi trường trên nền tảng chạy) với các khóa chính sau:

| Biến | Giá trị khuyến nghị / ghi chú |
| --- | --- |
| `NODE_ENV` | Đặt `production` khi chạy máy chủ phục vụ người dùng. |
| `HOST` | `127.0.0.1` khi chạy cục bộ hoặc sau Cloudflare Tunnel cùng máy; `0.0.0.0` trong Docker/PaaS. |
| `PORT` | Mặc định `5000` (số nguyên `1–65535`). |
| `TRUST_PROXY` | `false` khi chạy cục bộ trực tiếp; `loopback` cho reverse proxy hoặc `cloudflared` cùng máy; `1` (`1–10`) cho PaaS đứng sau proxy (Render, Railway, Fly.io). **Không dùng `true`** (API từ chối để tránh giả mạo IP làm vượt rate limit). |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL 18 cho tiến trình web (role runtime `vcraft_app` nếu tách quyền). |
| `MIGRATION_DATABASE_URL` | Chuỗi kết nối PostgreSQL 18 cho bước migrate/seed (role `vcraft_migrator` nếu tách quyền; trên PaaS chỉ có 1 user DB thì trỏ cùng giá trị với `DATABASE_URL` vì [Prisma schema](../prisma/schema.prisma) dùng `directUrl`). |
| `JWT_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 byte UTF-8, không dùng giá trị mẫu và không chứa `CHANGE_ME`. Tạo bằng `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. |
| `QR_BASE_URL` | URL gốc `http://` hoặc `https://` không kèm user, query hay `#`, ví dụ `https://vcraft.example/trace`. Đặt đúng domain truy cập thật trước khi tạo mã QR cho điện thoại quét. |
| `UPLOAD_DIR` | Thư mục lưu ảnh tải lên (mặc định `storage/uploads`, trong Docker đặt `/app/storage/uploads`). Cần nằm trên ổ đĩa bền vững vì chứa cả ảnh công khai (`/uploads/...`) và ảnh lô sỉ riêng (`private-batches/`). |
| `PUBLIC_APP_URL`, `PASSWORD_RESET_FROM`, `RESEND_API_KEY` | Tùy chọn cho tính năng đặt lại mật khẩu qua Resend. Ở `NODE_ENV=production`, phải khai báo đủ cả 3 (`PUBLIC_APP_URL` dùng `https://` không có path/query/hash, `PASSWORD_RESET_FROM` thuộc tên miền đã xác minh); nếu thiếu, API từ chối yêu cầu đặt lại mật khẩu với `503 RESET_MAIL_UNAVAILABLE`. |

Lưu ý thêm:
- **Cùng origin (`CORS_ALLOWED_ORIGINS`):** Để trống khi giao diện và API phục vụ từ cùng một máy chủ Express (trong `production`, để trống mặc định không cho phép cross-origin).
- **Redis (`REDIS_URL`):** Backend hiện tại không yêu cầu Redis (giới hạn tần suất đăng nhập/đăng ký dùng bộ nhớ từng tiến trình); có thể để trống khi triển khai một instance.
- **Bảo mật:** Giữ `SITE_CSP_REPORT_ONLY=false` ở production; không đưa `.env` vào Git hoặc Docker image.

## 2. Chuẩn bị PostgreSQL 18, migration & seed dữ liệu demo

1. Tạo database PostgreSQL 18 trống (ví dụ `vcraft_nhaxa`). Nếu tách hai role `vcraft_migrator` và `vcraft_app` theo [README gốc](../README.md#4-khởi-tạo-postgresql-phát-triển), chạy trước [configure-roles.sql](../database/postgresql/configure-roles.sql).
2. Sinh Prisma Client (nếu chưa chạy ở bước build) và áp dụng migration:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
3. Nếu tách role `vcraft_migrator` / `vcraft_app`, cấp quyền đọc/ghi bảng cho role ứng dụng bằng [grant-runtime.sql](../database/postgresql/grant-runtime.sql) (chạy lại sau mỗi migration có thêm bảng mới):
   ```bash
   psql "$MIGRATION_DATABASE_URL" -v target_db=vcraft_nhaxa -v app_role=vcraft_app -f database/postgresql/grant-runtime.sql
   ```
4. **Seed dữ liệu demo Nha Xá (tùy chọn cho môi trường demo):**
   - [prisma/seed.js](../prisma/seed.js) chủ động **chặn chạy khi `NODE_ENV=production`** để tránh ghi nhầm dữ liệu mẫu lên database thật.
   - Trên một **database demo riêng**, đặt `SEED_DEMO_PASSWORD` (12–72 byte UTF-8) và `QR_BASE_URL` theo domain demo, chạy seed một lần với `NODE_ENV=development` trước khi khởi động server ở `NODE_ENV=production`:
     ```bash
     NODE_ENV=development npm run db:seed
     ```
     Trên Windows PowerShell:
     ```powershell
     $env:NODE_ENV="development"; npm run db:seed; Remove-Item Env:NODE_ENV
     ```
   - Sau khi seed xong, xóa `SEED_DEMO_PASSWORD` khỏi môi trường chạy production nếu không cần thiết.

## 3. Phương án A — Chạy trên máy cá nhân + Cloudflare Tunnel (`cloudflared`)

Phù hợp nhất cho các buổi kiểm tra và demo của nhóm: tận dụng sẵn PostgreSQL 18 trên máy cá nhân và giữ ảnh upload bền vững trên ổ đĩa local mà không bị mất dữ liệu khi container ngủ hoặc khởi động lại.

1. Cấu hình `.env` trên máy:
   ```dotenv
   NODE_ENV=production
   HOST=127.0.0.1
   PORT=5000
   TRUST_PROXY=loopback
   CORS_ALLOWED_ORIGINS=
   QR_BASE_URL=https://<domain-tunnel>/trace
   UPLOAD_DIR=storage/uploads
   ```
2. Khởi động máy chủ:
   ```bash
   npm start
   ```
3. Mở tunnel bằng `cloudflared` (chọn một trong hai cách):
   - **Quick Tunnel** (dùng thử nhanh, không cần tên miền riêng):
     ```bash
     cloudflared tunnel --url http://127.0.0.1:5000
     ```
     Quick Tunnel tạo một URL `https://*.trycloudflare.com` **mới sau mỗi lần khởi động lại**. Khi lấy được URL mới, cần cập nhật lại `QR_BASE_URL` trong `.env` và khởi động lại `npm start` trước khi tạo mới hoặc tải lại mã QR.
   - **Named Tunnel** (khuyên dùng nếu demo nhiều buổi):
     Gắn cố định một subdomain/domain riêng về `http://127.0.0.1:5000` qua cấu hình tunnel của Cloudflare để giữ nguyên `QR_BASE_URL`.
4. **Lưu ý cấu hình Cloudflare khi dùng domain riêng:** Trong Cloudflare Dashboard, hãy **tắt Rocket Loader** (*Speed → Optimization*) và **tắt Email Address Obfuscation** (*Scrape Shield*). Hai tính năng này tự chèn script của Cloudflare vào trang HTML nên sẽ xung đột với chính sách CSP (`script-src 'self'`) của vCraft.

## 4. Phương án B — Deploy chuẩn chung bằng Docker / PaaS (Render, Railway, Fly.io, VPS)

Dự án đi kèm [Dockerfile](../Dockerfile) dùng `node:22-bookworm-slim` (glibc cho `sharp` và Prisma 6), cài `ca-certificates` và `openssl`, chạy `npm ci` (giữ `prisma` CLI để chạy migration trong container), sinh sẵn Prisma Client, đặt mặc định `HOST=0.0.0.0`, `PORT=5000`, `UPLOAD_DIR=/app/storage/uploads`, chạy bằng user `node` và cấu hình `HEALTHCHECK` tới `GET /api/health`.

- **Thiết lập trên Render / Railway / Fly.io:**
  - Chọn build từ `Dockerfile` ở thư mục gốc.
  - Đặt `NODE_ENV=production`, `HOST=0.0.0.0`, `TRUST_PROXY=1`, `QR_BASE_URL=https://<domain-deploy>/trace`, `UPLOAD_DIR=/app/storage/uploads`, cùng `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `JWT_SECRET`.
  - Trỏ health check của nền tảng vào `GET /api/health` (xem chi tiết tại [tài liệu API](api.md)).
  - **Bắt buộc gắn Persistent Volume / Disk vào `/app/storage/uploads` (`UPLOAD_DIR`)**: nếu dùng ổ đĩa tạm của container, toàn bộ ảnh do nghệ nhân upload sẽ bị xóa mỗi khi container restart, sleep hoặc redeploy. *(Với Docker named volume như ví dụ bên dưới, quyền `node:node` được giữ tự động; nếu dùng bind mount thư mục máy chủ hoặc volume PaaS như Fly.io/Railway gắn dưới quyền `root:root`, đảm bảo UID `1000` có quyền ghi vào thư mục này.)*

- **Ví dụ build và chạy Docker tối giản (VPS sau reverse proxy hoặc kiểm thử local):**
  ```bash
  docker build -t vcraft-web .

  # Chạy migration trước khi mở traffic (hoặc khi có schema mới)
  docker run --rm --env-file .env vcraft-web npm run db:migrate

  # Khởi chạy server gắn cổng vào loopback 127.0.0.1 cho Nginx/Caddy/cloudflared trên cùng VPS
  docker run -d --name vcraft-app \
    -p 127.0.0.1:5000:5000 \
    --env-file .env \
    -e NODE_ENV=production \
    -e HOST=0.0.0.0 \
    -e UPLOAD_DIR=/app/storage/uploads \
    -e TRUST_PROXY=1 \
    -v vcraft_uploads:/app/storage/uploads \
    --restart unless-stopped \
    vcraft-web
  ```
  *(Lưu ý: `docker run --env-file` không tự bỏ dấu ngoặc kép quanh giá trị như Node/Docker Compose — hãy giữ giá trị không ngoặc kép như trong [`.env.example`](../.env.example). Chỉ bật `TRUST_PROXY=1` khi cổng `5000` không mở trực tiếp ra Internet mà chỉ nhận lưu lượng từ reverse proxy/PaaS; khi chạy thử trực tiếp không qua proxy thì đặt `-e TRUST_PROXY=false`. Bên trong container, `DATABASE_URL` không được trỏ tới `localhost`/`127.0.0.1` nếu PostgreSQL nằm ngoài container.)*

## 5. Smoke test sau khi deploy

1. **Health check:** Gọi `GET https://<domain>/api/health` phải trả HTTP `200` với `{ "data": { "status": "ok", "database": "ok" } }`.
2. **Đăng nhập 3 vai trò:** Thử đăng nhập lần lượt bằng tài khoản `BUYER`, `ARTISAN` và `ADMIN` (hoặc tài khoản demo đã seed) để kiểm tra phiên đăng nhập (Bearer token) và màn hình theo vai trò.
3. **Quét QR bằng điện thoại thật (ngoài LAN):**
   - Quét **1 QR công khai** (mở `/trace/:code`) và kiểm tra hiển thị nhật ký công đoạn.
   - Quét **1 QR lô sỉ riêng** (mở `/trace/private/:code`), xác nhận chuyển hướng đăng nhập rồi quay lại đúng nhật ký lô khi dùng tài khoản có quyền.
4. **Kiểm tra bản đồ:** Mở mục bản đồ làng nghề, xác nhận marker xưởng và nền bản đồ tải bình thường, không có lỗi CSP trong DevTools Console.
5. **Thử upload 1 ảnh:** Đăng nhập `ARTISAN` hoặc `ADMIN`, tải lên 1 ảnh (JPEG/PNG/WebP ≤ 5 MB) và kiểm tra ảnh hiển thị bình thường; với Docker/PaaS, khởi động lại container để xác nhận ảnh vẫn tồn tại trên volume bền vững.
