# API vCraft

API đặt dưới `/api`, trả JSON dạng `{ data: ... }` hoặc `{ error: { code, message } }`. Giá và các số `Decimal` được trả dưới dạng chuỗi; thời gian dùng ISO 8601. Danh sách hỗ trợ `page` và `limit` (1–100) khi có ghi bên dưới.

## Xác thực

Đặt `JWT_SECRET` thành chuỗi ngẫu nhiên ít nhất 32 byte trong `.env` trước khi đăng nhập. Ví dụ, tự tạo một giá trị bằng `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Không dùng giá trị mẫu hoặc chia sẻ secret. API ký token HS256, kiểm tra issuer, audience và thời hạn một giờ; mỗi request được xác thực còn kiểm tra tài khoản hiện đang hoạt động và lấy vai trò từ database.

Các endpoint riêng yêu cầu `Authorization: Bearer <accessToken>`. Token hiện là stateless: đăng xuất phía client cần xóa token; hệ thống chưa có thu hồi token riêng lẻ. Giới hạn đăng nhập/đăng ký dùng bộ nhớ từng tiến trình, cần bộ lưu trữ dùng chung khi chạy nhiều instance. Triển khai qua HTTPS và cấu hình proxy đáng tin cậy phù hợp trước khi đưa ra internet.

`CORS_ALLOWED_ORIGINS` là danh sách origin frontend ngăn cách bằng dấu phẩy. Môi trường phát triển mặc định cho phép `http://127.0.0.1:5189` và `http://localhost:5189`; production mặc định không cho phép origin nào. CORS chỉ điều khiển trình duyệt đọc phản hồi, còn API vẫn xác thực và phân quyền từng request.

| Phương thức | Đường dẫn | Quyền / dữ liệu |
| --- | --- | --- |
| POST | `/auth/register` | Công khai; `email`, `password` (12–72 byte UTF-8), `fullName`. Chỉ tạo BUYER. |
| POST | `/auth/login` | Công khai; `email`, `password`; trả `accessToken`, `tokenType`, `expiresIn`. |
| GET | `/auth/me` | Đăng nhập. |
| GET | `/products` | Công khai; `page`, `limit`, `category`, `artisanId`, `q` tìm theo tên sản phẩm, xưởng, danh mục hoặc chất liệu. |
| GET | `/products/:slug`, `/products/by-slug/:slug` | Công khai; gồm giá, tồn kho và điểm đánh giá. |
| GET | `/categories` | Công khai; danh mục sản phẩm. |
| GET, POST | `/products/mine`, `/products` | ARTISAN; xem sản phẩm của mình, tạo sản phẩm của xưởng đã duyệt. |
| PUT, DELETE | `/products/:id` | ARTISAN sở hữu; thay dữ liệu hoặc ẩn sản phẩm. Khi dùng PUT, gửi `expectedStockQuantity` là tồn kho lúc mở form; trả `409 STALE_STOCK` nếu đã thay đổi. |
| GET | `/artisans` | Công khai; `page`, `limit`, `visitorsOnly=true` hoặc `false`. |
| GET | `/artisans/:id` | Công khai. |
| GET, PATCH | `/artisans/me` | ARTISAN; xem và cập nhật hồ sơ của mình. |
| POST, DELETE | `/artisans/me/certificates`, `/artisans/me/certificates/:id` | ARTISAN; thêm hoặc xóa chứng nhận. |
| POST | `/media/images` | ARTISAN hoặc ADMIN; multipart `images`, tối đa 4 ảnh JPEG/PNG/WebP, mỗi ảnh tối đa 5 MB. Ảnh được xoay và chuyển WebP, cạnh tối đa 1600 pixel. |
| GET | `/traceability/:code`, `/traceability/by-code/:code` | Công khai; timeline của lô được phép công bố. |
| GET | `/traceability/:code/qr`, `/traceability/products/:slug` | Công khai; ảnh QR PNG và danh sách lô được công bố. |
| GET, POST | `/traceability/mine`, `/traceability/batches` | ARTISAN; danh sách lô của mình hoặc tạo lô cho sản phẩm của mình. |
| POST, PUT | `/traceability/batches/:id/logs`, `/traceability/batches/:id/logs/:logId` | ARTISAN sở hữu; thêm công đoạn theo thứ tự hoặc sửa công đoạn của lô đang sản xuất. |
| POST | `/traceability/batches/:id/complete` | ARTISAN sở hữu; hoàn thành sau khi ghi đủ năm công đoạn. |
| GET | `/news`, `/news/:slug` | Công khai; danh sách hỗ trợ `page`, `limit`, `category`. |
| GET, POST | `/news/admin/list`, `/news` | ADMIN; danh sách quản trị và đăng tin. |
| PUT, DELETE | `/news/:id` | ADMIN; thay nội dung hoặc xóa tin. |
| GET | `/notifications` | Đăng nhập; `page`, `limit`. |
| PATCH | `/notifications/:id/read` | Đăng nhập; trả `updated: false` nếu không tìm thấy hoặc đã đọc. |
| GET | `/retail/cart` | BUYER. |
| PUT | `/retail/cart/:id` | BUYER; `quantity` nguyên, 0 xóa mục. `id` là mã sản phẩm. |
| POST | `/retail/checkout` | BUYER; `recipientName`, `recipientPhone`, `shippingAddress`, tùy chọn `shippingNote`, `paymentMethod`. |
| GET | `/retail/orders`, `/retail/orders/:id` | BUYER; chỉ đơn của mình, danh sách hỗ trợ `page`, `limit`. |
| GET | `/retail/sales`, `/retail/admin/orders` | ARTISAN xem đơn có sản phẩm của mình; ADMIN xem tất cả đơn. |
| PATCH | `/retail/orders/:id/status` | ARTISAN phụ trách toàn bộ đơn hoặc ADMIN cập nhật trạng thái; BUYER có thể hủy đơn chưa thanh toán đang chờ. Khi giao COD, gửi `{ status: "DELIVERED", paymentCollected: true }` sau khi đã thu tiền. |
| GET | `/wholesale/quotes`, `/wholesale/quotes/:id` | BUYER; chỉ yêu cầu của mình; danh sách hỗ trợ `page`, `limit`. |
| POST | `/wholesale/quotes` | BUYER; `title`, `specifications`, `targetQuantity`, `deadline` dạng `YYYY-MM-DD`, tùy chọn `targetArtisanId`, `maxBudget`, `preferredWeaveType`, `attachmentUrls`. |
| POST | `/wholesale/quotes/:id/send` | BUYER sở hữu yêu cầu. |
| POST | `/wholesale/quotes/:id/dispatch` | ADMIN điều phối yêu cầu nháp tới danh sách `artisanIds` đã duyệt. |
| GET | `/wholesale/open-quotes`, `/wholesale/assignments` | ARTISAN đã duyệt; hỗ trợ `page`, `limit`. |
| POST | `/wholesale/quotes/:id/bids` | ARTISAN; `proposedPrice`, `proposedCompletionDays`, tùy chọn `note`, `sampleImages`. |
| POST | `/wholesale/quotes/:id/accept` | BUYER sở hữu yêu cầu; `bidIds`. |
| GET | `/wholesale/admin/quotes` | ADMIN; lọc `status`, mặc định `BUYER_ACCEPTED`, cùng thầu và phân công; hỗ trợ `page`, `limit`. |
| POST | `/wholesale/quotes/:id/assignments` | ADMIN; `allocations: [{ bidId, quantity }]`. |
| PATCH | `/wholesale/assignments/:id` | ARTISAN phụ trách; `status`: `IN_PRODUCTION`, `READY_FOR_DELIVERY`, `COMPLETED` theo thứ tự. Nếu có lô gắn với phân công, không được chuyển sang sẵn sàng giao khi còn lô chưa hoàn thành. |
| POST | `/reviews` | BUYER; `targetType`, `artisanId`, `rating`, `comment`, một trong `retailOrderId` hoặc `quotationRequestId`; `productId` bắt buộc cho PRODUCT. |
| GET | `/reviews/products/:slug`, `/reviews/artisans/:id` | Công khai; đánh giá sản phẩm hoặc xưởng được công bố. |
| GET, POST | `/admin/artisans/pending`, `/admin/artisans` | ADMIN; xem hồ sơ chờ, cấp tài khoản nghệ nhân với hồ sơ PENDING. |
| PATCH | `/admin/artisans/:id/verification` | ADMIN; `status` là `APPROVED` hoặc `REJECTED`. |

Không gửi `userId` trong body: API lấy danh tính và vai trò từ token đã kiểm tra. Các URL ảnh trong các body nêu trên phải là HTTP hoặc HTTPS. Xung đột trạng thái, bản ghi trùng hoặc tồn kho trả `409`; xác thực và phân quyền trả `401` và `403`. Giao dịch serializable có thể thất bại khi cạnh tranh: người dùng nên tải lại giỏ trước khi thử checkout lần nữa.

Ảnh tải lên được lưu tại `UPLOAD_DIR` (mặc định `storage/uploads`) và trả đường dẫn tương đối `/uploads/...` trên origin của API; cần ổ đĩa bền vững khi triển khai. API phục vụ trang truy xuất tại `/trace/:code`; QR mặc định trỏ tới trang này ở cổng backend. Khi triển khai hoặc quét bằng thiết bị khác, đặt `QR_BASE_URL` tới địa chỉ mà thiết bị có thể truy cập, ví dụ `https://vcraft.example/trace`. Tạo lại ảnh QR nếu địa chỉ trước đó đã thay đổi. Xem [persistence layer](persistence-layer.md) về các giới hạn dữ liệu và migration.

Sau migration `quote_recipients`, chạy lại `grant-runtime.sql` theo README để tài khoản ứng dụng có quyền trên bảng mới. Khi admin điều phối yêu cầu nháp đến một nhóm, chỉ xưởng thuộc nhóm mới xem và gửi chào giá; yêu cầu do người mua gửi vẫn theo phạm vi công khai hoặc xưởng chỉ định. Nội dung tin tức và đánh giá là dữ liệu người dùng; frontend cần hiển thị dưới dạng văn bản hoặc làm sạch HTML trước khi render.

Checkout chỉ hỗ trợ COD và tạo đơn `UNPAID`; yêu cầu thanh toán qua phương thức chưa tích hợp trả `422 PAYMENT_METHOD_UNAVAILABLE`. Khi xác nhận đã giao và thu tiền COD, đơn chuyển sang `DELIVERED` và `PAID` trong cùng giao dịch. Các đơn cũ đã giao mà chưa ghi nhận thu tiền cần đối soát. Đánh giá xác minh của đơn lẻ yêu cầu đơn đã giao và đã thanh toán; với sản phẩm B2B, lô tương ứng phải hoàn thành. Với đơn có sản phẩm từ nhiều xưởng, ADMIN thực hiện chuyển trạng thái toàn đơn vì schema chưa có trạng thái giao hàng riêng cho từng xưởng. Người mua và admin/nghệ nhân chỉ hủy đơn chưa thanh toán ở các trạng thái được phép; khi hủy, tồn kho được hoàn lại trong transaction.
