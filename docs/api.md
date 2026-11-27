# API vCraft

API đặt dưới `/api`, trả JSON dạng `{ data: ... }` hoặc `{ error: { code, message } }`. Giá và các số `Decimal` được trả dưới dạng chuỗi; thời gian dùng ISO 8601. Danh sách hỗ trợ `page` và `limit` (1–100) khi có ghi bên dưới.

## Xác thực

Đặt `JWT_SECRET` thành chuỗi ngẫu nhiên ít nhất 32 byte trong `.env` trước khi đăng nhập. Ví dụ, tự tạo một giá trị bằng `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Không dùng giá trị mẫu hoặc chia sẻ secret. API ký token HS256, kiểm tra issuer, audience và thời hạn một giờ; mỗi request được xác thực còn kiểm tra tài khoản hiện đang hoạt động và lấy vai trò từ database.

Các endpoint riêng yêu cầu `Authorization: Bearer <accessToken>`. Mỗi token được ghi nhận trong `auth_sessions`. Logout, đổi mật khẩu, reset mật khẩu và logout-all đều thu hồi phiên tương ứng. Tính năng đặt lại mật khẩu gửi email qua Resend với ba biến `PUBLIC_APP_URL` (origin HTTPS khi triển khai production), `PASSWORD_RESET_FROM` (địa chỉ từ tên miền đã xác minh) và `RESEND_API_KEY`. Email chứa liên kết về vCraft có hiệu lực 15 phút. Trong môi trường `NODE_ENV=development` khi cả ba biến gửi email chưa được thiết lập, API ghi liên kết khôi phục cục bộ (`/dang-nhap#reset=<token>`) ra console máy chủ và chỉ trả `{ accepted: true }` (không trả `resetToken` trong phản hồi HTTP). Bộ kiểm thử tự động dùng `NODE_ENV=test` (khi cả ba biến gửi email đều trống) để nhận `resetToken` trực tiếp trong database kiểm thử. Khi triển khai `NODE_ENV=production`, không đặt `NODE_ENV`, hoặc thiếu/sai cấu hình gửi email, API từ chối an toàn với `503 RESET_MAIL_UNAVAILABLE`. Giới hạn đăng nhập/đăng ký dùng bộ nhớ từng tiến trình và cần bộ lưu trữ dùng chung khi chạy nhiều instance.

`CORS_ALLOWED_ORIGINS` là danh sách origin frontend ngăn cách bằng dấu phẩy. Môi trường phát triển mặc định cho phép `http://127.0.0.1:5189` và `http://localhost:5189`; production mặc định không cho phép origin nào. CORS chỉ điều khiển trình duyệt đọc phản hồi, còn API vẫn xác thực và phân quyền từng request.

| Phương thức | Đường dẫn | Quyền / dữ liệu |
| --- | --- | --- |
| POST | `/auth/register` | Công khai; tạo BUYER từ `email`, `password` (12–72 byte UTF-8), `fullName` và tùy chọn `username` (3–32 ký tự không dấu gồm chữ, số, `.`, `_`, `-`, bắt đầu bằng chữ cái hoặc chữ số, lưu dạng chữ thường). |
| POST | `/auth/login` | Công khai; `identifier` (email hoặc tên đăng nhập; vẫn tương thích `email` hoặc `username`), `password`; trả `accessToken`, `tokenType`, `expiresIn`. |
| POST | `/auth/logout` | Đăng nhập; thu hồi phiên hiện tại. |
| POST | `/auth/logout-all` | Đăng nhập; thu hồi mọi phiên của tài khoản. |
| GET, PATCH | `/auth/me` | Đăng nhập; xem hoặc cập nhật `fullName`, `username` (3–32 ký tự hợp lệ; gửi `null` hoặc chuỗi rỗng để bỏ tên đăng nhập), `phone` (số điện thoại 8–15 chữ số hợp lệ hoặc để trống để xóa), `avatarUrl` (URL HTTP/HTTPS hoặc ảnh `/uploads/...`, hoặc để trống để xóa). |
| POST | `/auth/password/change` | Đăng nhập; đổi mật khẩu bằng mật khẩu hiện tại và thu hồi phiên. |
| POST | `/auth/password/reset/request` | Công khai; `identifier` (email hoặc tên đăng nhập; vẫn tương thích `email` hoặc `username`); yêu cầu đặt lại mật khẩu mà không tiết lộ trạng thái tài khoản. |
| POST | `/auth/password/reset/confirm` | Công khai; dùng token một lần để đặt mật khẩu mới. |
| GET | `/products` | Công khai; `page`, `limit`, `category`, `artisanId`, `q` tìm theo tên sản phẩm, xưởng, danh mục hoặc chất liệu (có hoặc không dấu tiếng Việt), `sort=asc` hoặc `desc` theo giá. |
| GET | `/products/:slug`, `/products/by-slug/:slug` | Công khai; gồm giá, tồn kho và điểm đánh giá. |
| GET | `/categories` | Công khai; danh mục sản phẩm. |
| GET, POST | `/products/mine`, `/products` | ARTISAN; xem sản phẩm của mình, tạo sản phẩm của xưởng đã duyệt. Khi tạo hoặc sửa có thể gửi `productionSteps`, từ 1 đến 12 tên công đoạn theo thứ tự. |
| PUT, DELETE | `/products/:id` | ARTISAN sở hữu. Khi dùng PUT, gửi `expectedStockQuantity` và `expectedRevision` lấy từ sản phẩm lúc mở form. Tồn kho hoặc dữ liệu đã đổi trả `409`. Slug cũ vẫn mở được trang QR sản phẩm. |
| GET | `/artisans` | Công khai; `page`, `limit`, `visitorsOnly=true` hoặc `false`. |
| GET | `/artisans/reference`, `/artisans/reference/:slug` | Danh sách và chi tiết cơ sở tham khảo. `location` có địa chỉ, giờ, liên hệ và tọa độ theo thông tin công bố. `areaPoint` đánh dấu vị trí khu vực cần xác nhận trước khi đến. |
| GET | `/artisans/:id` | Công khai. |
| GET, PATCH | `/artisans/me` | ARTISAN; xem và cập nhật hồ sơ. Xưởng đã duyệt gửi thay đổi tên, địa chỉ và tọa độ vào `pendingIdentity`. Dữ liệu công khai đổi sau khi Admin duyệt. |
| POST | `/artisans/me/resubmit` | ARTISAN; đưa hồ sơ đã bị từ chối về hàng chờ duyệt. |
| POST, DELETE | `/artisans/me/certificates`, `/artisans/me/certificates/:id` | ARTISAN; thêm hoặc xóa chứng nhận. |
| POST | `/media/images` | ARTISAN hoặc ADMIN; multipart `images`, tối đa 4 ảnh JPEG/PNG/WebP, mỗi ảnh tối đa 5 MB. Nghệ nhân thêm `?batchId=...` để tải ảnh cho lô riêng đang sản xuất của mình. |
| GET | `/media/batches/:id/:filename`, `/media/batches/:id/legacy/:filename` | Ảnh riêng cần Bearer token của xưởng sở hữu hoặc người mua có quyền xem nhật ký. API trả ảnh với `Cache-Control: private, no-store`. |
| GET | `/traceability/:code`, `/traceability/by-code/:code` | Công khai; nhật ký lô độc lập được phép công bố. Lô gắn với đơn sỉ dùng API nhật ký của người mua. |
| GET | `/traceability/public/recent` | Công khai; tối đa 24 lô gần đây và tên sản phẩm. |
| GET | `/traceability/purchased/:code` | BUYER sở hữu yêu cầu sỉ liên kết; xem nhật ký lô của đơn kể cả khi sản phẩm đã ẩn. |
| GET | `/traceability/private/:code/timeline`, `/traceability/private/:code/qr` | BUYER của yêu cầu hoặc ARTISAN sở hữu lô được phân công; xem riêng nhật ký lô hoặc ảnh QR riêng. Chỉ lô đang sản xuất/đã hoàn thành; phản hồi riêng không lưu cache. |
| GET | `/traceability/:code/qr`, `/traceability/products/:slug` | Công khai; ảnh QR PNG và danh sách lô được công bố. |
| GET | `/traceability/product-guide/:slug/qr` | QR của sản phẩm công khai, mở `/trace/product/:slug` với câu chuyện sản phẩm và danh sách nhật ký lô công khai. |
| GET, POST | `/traceability/mine`, `/traceability/batches` | ARTISAN; danh sách lô của mình (`productId`, `assignmentId`, `page`, `limit`) hoặc tạo lô cho sản phẩm của mình. Lô lưu thứ tự công đoạn tại lúc tạo. |
| POST, PUT | `/traceability/batches/:id/logs`, `/traceability/batches/:id/logs/:logId` | ARTISAN sở hữu; gửi `stepOrder` khi thêm công đoạn theo thứ tự lô. Có thể sửa tên, ghi chú, ảnh và `loggedOn` của lô đang sản xuất. Ngày theo `YYYY-MM-DD`, không vượt hôm nay và phải theo thứ tự công đoạn tại Việt Nam. Lô riêng nhận URL ảnh đã tải cho chính lô đó. |
| POST | `/traceability/batches/:id/complete` | ARTISAN sở hữu; hoàn thành sau khi ghi đủ công đoạn theo quy trình của lô. |
| POST | `/traceability/batches/:id/cancel` | ARTISAN sở hữu; hủy lô của đơn sỉ khi phân công còn `IN_PRODUCTION`. Số lượng của lô hủy được sử dụng để tạo lô thay thế. |
| GET | `/news`, `/news/:slug` | Công khai; danh sách hỗ trợ `page`, `limit`, `category`. |
| GET, POST | `/news/admin/list`, `/news` | ADMIN; danh sách quản trị và đăng tin. |
| PUT, DELETE | `/news/:id` | ADMIN; thay nội dung hoặc xóa tin. |
| GET | `/notifications` | Đăng nhập; `page`, `limit`. |
| PATCH | `/notifications/:id/read` | Đăng nhập; trả `updated: false` nếu không tìm thấy hoặc đã đọc. |
| GET | `/retail/cart` | BUYER; `product.isAvailable` cho biết sản phẩm còn được phép bán. Đối chiếu số lượng với `stockQuantity`. |
| PUT | `/retail/cart/:id` | BUYER; `quantity` nguyên, 0 xóa mục. Có thể giảm số lượng mục đã lưu khi tồn kho giảm. `id` là mã sản phẩm. |
| POST | `/retail/checkout` | BUYER; gửi `recipientName`, `recipientPhone`, `shippingAddress`, `confirmedItems: [{ productId, unitPrice, quantity }]` và tùy chọn `shippingNote`, `paymentMethod`. Đơn giá là chuỗi thập phân lấy từ giỏ. `409 CART_CHANGED` yêu cầu tải lại giỏ và xác nhận giá. |
| GET | `/retail/orders`, `/retail/orders/:id` | BUYER; chỉ đơn của mình, có tiến độ từng xưởng trong `fulfillments`. Danh sách hỗ trợ `page`, `limit`. |
| GET | `/retail/sales`, `/retail/admin/orders` | Hỗ trợ `page`, `limit`, `status`. ARTISAN nhận mặt hàng và trạng thái của xưởng mình. ADMIN nhận toàn bộ mặt hàng, thông tin giao nhận và trạng thái theo từng xưởng. |
| PATCH | `/retail/orders/:id/workshops/:artisanId/status` | ARTISAN cập nhật phần đơn của mình, ADMIN cập nhật từng xưởng. Chuyển `CONFIRMED → SHIPPING → DELIVERED` hoặc `CANCELLED` khi phần hàng chưa giao và chưa thu tiền. Xác nhận `paymentCollected: true` khi đã thu tiền COD. |
| PATCH | `/retail/orders/:id/status` | ARTISAN phụ trách toàn bộ đơn hoặc ADMIN cập nhật trạng thái; BUYER có thể hủy đơn chưa thanh toán đang chờ. Khi giao COD, gửi `{ status: "DELIVERED", paymentCollected: true }` sau khi đã thu tiền. |
| GET | `/wholesale/quotes`, `/wholesale/quotes/:id` | BUYER; chỉ yêu cầu của mình; danh sách hỗ trợ `page`, `limit`. |
| GET | `/wholesale/quotes/:id/journal` | BUYER sở hữu đơn đã chốt, đang sản xuất hoặc đã giao. Trả về các xưởng được giao và danh sách lô. |
| POST | `/wholesale/quotes` | BUYER; `title`, `specifications`, `targetQuantity`, `deadline` dạng `YYYY-MM-DD`, tùy chọn `artisanIds` để chọn nhiều xưởng hoặc `targetArtisanId` để chọn một xưởng, cùng `maxBudget`, `preferredWeaveType`, `attachmentUrls`, và `submitMode` (`DRAFT` mặc định để lưu bản nháp, `SEND` để gửi thẳng tới xưởng đã chọn hoặc mở chào giá; nếu không chọn xưởng và có `preferredWeaveType`, chỉ gửi tới xưởng đủ điều kiện có sản phẩm đã công bố cùng loại lụa theo danh mục, không đảm bảo công suất; nếu không có xưởng phù hợp trả `409 NO_MATCHING_WORKSHOPS`; `DISPATCH` chuyển ngay sang `PENDING_DISPATCH` nhờ Ban quản lý điều phối — không kết hợp với `artisanIds`/`targetArtisanId`). |
| POST | `/wholesale/quotes/:id/send` | BUYER sở hữu bản nháp; gửi tới xưởng đã chọn, hoặc nếu chưa chọn xưởng mà có `preferredWeaveType` thì gửi cho các xưởng đủ điều kiện có sản phẩm đã công bố cùng loại lụa (snapshot danh sách ở thời điểm gửi); nếu không có xưởng phù hợp trả `409 NO_MATCHING_WORKSHOPS` và giữ bản nháp; bản nháp không loại lụa cũ vẫn gửi rộng như trước. |
| PATCH | `/wholesale/quotes/:id/workshops` | BUYER sở hữu bản nháp. Dùng `artisanIds: []` để bỏ chọn xưởng và chuyển sang luồng nhờ điều phối. |
| POST | `/wholesale/quotes/:id/request-dispatch` | BUYER sở hữu bản nháp; chuyển sang `PENDING_DISPATCH` để Ban quản lý nhận điều phối. |
| POST | `/wholesale/quotes/:id/dispatch` | ADMIN điều phối yêu cầu `PENDING_DISPATCH` tới danh sách `artisanIds` đủ điều kiện. |
| POST | `/wholesale/quotes/:id/close-dispatch` | ADMIN đóng yêu cầu `PENDING_DISPATCH` đã quá hạn. |
| GET | `/wholesale/open-quotes`, `/wholesale/assignments` | ARTISAN đã duyệt; hỗ trợ `page`, `limit`. Dùng `view=mine` ở `open-quotes` để xem yêu cầu đã chào giá, kể cả khi thầu đã đóng. |
| GET | `/wholesale/open-quotes/:id` | ARTISAN đã duyệt và thuộc phạm vi yêu cầu đang mở hoặc đã gửi báo giá cho yêu cầu đó. Chỉ trả báo giá của xưởng đang đăng nhập. |
| POST, PATCH | `/wholesale/quotes/:id/bids` | ARTISAN chào giá cho toàn bộ số lượng với `proposedPrice`, `proposedCompletionDays` và tùy chọn `note`, `sampleImages`. Khi sửa báo giá đã gửi, kèm `expectedRevision`. |
| POST | `/wholesale/quotes/:id/bids/withdraw` | ARTISAN gửi `expectedRevision` để rút báo giá khi yêu cầu còn mở. |
| POST | `/wholesale/quotes/:id/accept` | BUYER gửi `bidIds`, `bidVersions` ánh xạ ID báo giá đến `revision` đã xem và `allocations: [{ bidId, quantity }]` để giao ngay cho các xưởng. Khi có ngân sách và chọn nhiều xưởng, bắt buộc chia đủ số lượng để đối chiếu tổng tiền. |
| GET | `/wholesale/admin/quotes` | ADMIN; xem yêu cầu đã gửi, báo giá và phân công. Lọc `status`, mặc định `BUYER_ACCEPTED`; hỗ trợ `page`, `limit`. |
| POST | `/wholesale/quotes/:id/assignments` | ADMIN; `allocations: [{ bidId, quantity }]`. |
| PATCH | `/wholesale/assignments/:id` | ARTISAN phụ trách; `status`: `IN_PRODUCTION`, `READY_FOR_DELIVERY`, `COMPLETED` theo thứ tự. Để sẵn sàng giao, các lô phải hoàn thành và tổng số lượng phải bằng số lượng được phân công. |
| POST | `/reviews` | BUYER; `targetType`, `artisanId`, `rating`, `comment`, một trong `retailOrderId` hoặc `quotationRequestId`; `productId` bắt buộc cho PRODUCT. |
| GET | `/reviews/products/:slug`, `/reviews/artisans/:id` | Công khai; đánh giá sản phẩm hoặc xưởng được công bố. Trả `summary` (điểm trung bình, số đánh giá) và `pagination` cùng `data`. |
| GET, POST | `/admin/artisans` | ADMIN; lọc `status` theo `PENDING`, `APPROVED`, `SUSPENDED`, `REJECTED` hoặc `IDENTITY_REVIEW`, hoặc cấp tài khoản nghệ nhân (có thể kèm `username` tùy chọn 3–32 ký tự) với hồ sơ `PENDING`. |
| GET | `/admin/artisans/pending` | ADMIN; danh sách hồ sơ chờ duyệt. |
| GET | `/admin/artisans/:id` | ADMIN; thông tin hồ sơ, ảnh xưởng và chứng nhận, gồm cả hồ sơ chờ duyệt. |
| PATCH | `/admin/artisans/:id/verification` | ADMIN gửi `expectedVersion` lấy từ `reviewVersion` của bản hồ sơ đã xem. `status: "REJECTED"` cần kèm `reason`. |
| PATCH | `/admin/artisans/:id/suspension` | ADMIN; `isSuspended: true` để đình chỉ, `false` để mở lại xưởng đã duyệt. |

Không gửi `userId` trong body: API lấy danh tính và vai trò từ token đã kiểm tra. Các URL ảnh trong các body nêu trên phải là HTTP hoặc HTTPS. Xung đột trạng thái, bản ghi trùng hoặc tồn kho trả `409`; xác thực và phân quyền trả `401` và `403`. Giao dịch serializable có thể thất bại khi cạnh tranh: người dùng nên tải lại giỏ trước khi thử checkout lần nữa.

Ảnh tải lên được lưu tại `UPLOAD_DIR` (mặc định `storage/uploads`) và trả đường dẫn tương đối `/uploads/...` trên origin của API; cần ổ đĩa bền vững khi triển khai. API phục vụ trang truy xuất công khai tại `/trace/:code`; QR lô sỉ riêng trỏ tới `/trace/private/:code`, yêu cầu đăng nhập và trở về đúng lô sau đăng nhập. Khi triển khai hoặc quét bằng thiết bị khác, đặt `QR_BASE_URL` tới địa chỉ mà thiết bị có thể truy cập, ví dụ `https://vcraft.example/trace`. Tạo lại ảnh QR nếu địa chỉ trước đó đã thay đổi. Xem [persistence layer](persistence-layer.md) về các giới hạn dữ liệu và migration.

Sau migration `quote_recipients`, chạy lại `grant-runtime.sql` theo README để tài khoản ứng dụng có quyền trên bảng mới. Chỉ người mua tạo yêu cầu mới có quyền xem bản nháp. Khi Ban quản lý gửi yêu cầu tới một nhóm, quyền xem và chào giá thuộc các xưởng được mời và đủ điều kiện. Khi xưởng bị đình chỉ, sản phẩm và hồ sơ xưởng tạm ẩn khỏi danh mục công khai, đồng thời API chặn sản phẩm mới, lô độc lập mới, checkout và chào giá mới. Nghệ nhân vẫn có thể đăng nhập, xem sản phẩm xưởng khác, xem lịch sử báo giá và xử lý đơn đã được phân công. Nhật ký lô đã công bố vẫn truy cập được theo mã QR. Nội dung tin tức và đánh giá là dữ liệu người dùng; frontend cần hiển thị dưới dạng văn bản hoặc làm sạch HTML trước khi render.

Checkout hỗ trợ COD và tạo đơn `UNPAID`. Phương thức thanh toán khác trả `422 PAYMENT_METHOD_UNAVAILABLE`. Mỗi xưởng xác nhận giao và thu COD cho phần hàng của mình. Khi hủy một phần chưa giao và chưa thu tiền, hệ thống hoàn tồn kho của phần đó và tính lại tổng tiền, trạng thái giao và thu tiền dựa trên các phần còn hiệu lực. Đánh giá xác minh chỉ dành cho các phần đã giao của đơn đã thanh toán. Với sản phẩm đặt sỉ, lô tương ứng phải hoàn thành.

Giá phân công mới được tính bằng giá chào cho toàn bộ đơn nhân tỷ lệ số lượng của xưởng, làm tròn đến 0,01 ₫. Khi có ngân sách tối đa, tổng giá phân công phải nằm trong ngân sách. Sau migration `resolve_business_findings`, chạy lại `grant-runtime.sql` nếu tài khoản vận hành cần cấp quyền bảng. Thư mục `private-batches` trong `UPLOAD_DIR` được phục vụ qua API xác thực.
