# Persistence Layer của vCraft

## Thành phần và trách nhiệm

| Thành phần | Cách dùng trong vCraft |
|---|---|
| Mô hình, ánh xạ và quan hệ | [Prisma schema](../prisma/schema.prisma) ánh xạ model `Product` sang bảng `products`, `saleUnit` sang cột `sale_unit` và mô tả quan hệ với danh mục, xưởng và lô. Prisma Client dùng các ánh xạ này để đọc và ghi PostgreSQL. [Prisma Schema v6](https://www.prisma.io/docs/orm/v6/prisma-schema/overview) · [Data Mapper](https://martinfowler.com/eaaCatalog/dataMapper.html) |
| Kết nối và quyền | [Prisma Client dùng chung](../backend/src/database/prisma.js) dùng `DATABASE_URL` với quyền runtime. Lệnh migrate và seed dùng `MIGRATION_DATABASE_URL`. Các quy tắc như quyền sở hữu sản phẩm phải được kiểm tra theo người dùng ứng dụng, vì các request dùng cùng tài khoản PostgreSQL runtime. [Thiết lập PostgreSQL](../README.md#4-khởi-tạo-postgresql-phát-triển) |
| Repository và phép chiếu dữ liệu | [Products](../backend/src/repositories/products.repository.js) đọc danh mục công khai có phân trang và tìm theo slug. [Users](../backend/src/repositories/users.repository.js) tách truy vấn thông tin xác thực có `passwordHash` khỏi truy vấn hồ sơ. [Traceability](../backend/src/repositories/traceability.repository.js) đọc lô đang sản xuất hoặc đã hoàn thành của sản phẩm công khai thuộc xưởng đã duyệt, theo thứ tự công đoạn. [Repository](https://martinfowler.com/eaaCatalog/repository.html) · [Prisma select](https://www.prisma.io/docs/orm/v6/prisma-client/queries/select-fields) |
| Giao dịch và cập nhật có điều kiện | [Product service](../backend/src/services/products.service.js) mở `$transaction` và truyền cùng transaction client cho repository sản phẩm và nhật ký. Thao tác ẩn chỉ sửa bản ghi còn công khai thuộc tài khoản sở hữu đang hoạt động. Cập nhật và ghi audit commit cùng nhau. Gọi lại sau khi ẩn trả `false` và không tạo thêm audit. [Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html) · [Prisma transactions v6](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions) |
| Tính toàn vẹn và vòng đời schema | [Migration SQL](../prisma/migrations) là lịch sử thay đổi schema. PostgreSQL thực thi khóa ngoại, ràng buộc duy nhất và `CHECK`, ví dụ `FIXED` có giá và `CONTACT` có giá `null`. [Seed](../prisma/seed.js) tạo dữ liệu mẫu Nha Xá và [kiểm thử ORM](../backend/tests/integration/orm.test.js) dựng lại database kiểm thử từ đầu. [Prisma Migrate v6](https://www.prisma.io/docs/orm/v6/prisma-migrate/understanding-prisma-migrate/overview) |
| DTO và JSON | [Presenter](../backend/src/presenters/product.presenter.js) định dạng dữ liệu cho các bên tiêu thụ. Giá `Decimal` thành chuỗi hoặc `null`, ngày giờ thành ISO 8601. CLI và HTTP dùng cùng một định dạng. [Data Transfer Object](https://martinfowler.com/eaaCatalog/dataTransferObject.html) |

## Đọc PostgreSQL thành JSON qua CLI

Chạy từ thư mục gốc, sau khi cấu hình `.env` và chạy `npm run db:generate`.

```powershell
npm run --silent db:json
npm run --silent db:json -- hong-dat
npm run --silent db:json -- hop-nang
```

Lệnh đầu xuất trang đầu của danh mục với tối đa 24 sản phẩm và thông tin phân trang. Hai lệnh sau xuất chi tiết theo slug. Khi slug không tồn tại hoặc không công khai, lệnh ghi lỗi ra stderr và trả mã thoát khác 0.

`npm run db:test` chạy [kiểm thử repository và giao dịch](../backend/tests/integration/persistence.test.js) sau khi dựng và seed database kiểm thử. Các bài kiểm tra xác nhận hồ sơ không chứa hash, timeline sắp đúng thứ tự, giao dịch lỗi hoàn tác cả hai lần ghi và hai yêu cầu ẩn đồng thời chỉ ghi một audit.

## Áp dụng vào luồng ghi tiếp theo

Migration là nguồn chuẩn cho schema PostgreSQL: các CHECK, trigger, partial index và khóa ngoại ghép có thể không được thể hiện đầy đủ trong Prisma schema. Tạo migration mới cho mọi thay đổi, không dùng `prisma db push` để thay thế lịch sử migration. Migration `20261113000000` kiểm tra sự khớp giữa sản phẩm và xưởng trong dòng đơn, đánh giá, và giữa hồ sơ thầu với yêu cầu và xưởng trong phân công. Nếu dữ liệu cũ vi phạm, migration sẽ thất bại; cần sửa dữ liệu trước khi áp dụng.

- **Auth.** Service kiểm tra mật khẩu và quyền. Repository xác thực chỉ cung cấp hash cho nội bộ. Repository hồ sơ cung cấp phép chiếu dành cho người dùng đã xác thực.
- **Checkout.** Service trừ tồn có điều kiện, lưu giá mua và xóa các mục giỏ trong cùng giao dịch serializable. Khi giao dịch xung đột, lời gọi có thể thất bại và bên gọi cần thông báo hoặc thử lại an toàn.
- **Bidding.** Service khóa yêu cầu khi gửi, chào giá, chốt, phân bổ và cập nhật tiến độ. Người mua có thể chọn nhiều thầu; admin phân bổ đủ số lượng cho tất cả thầu đã chọn. Khi mọi phân công hoàn thành, yêu cầu chuyển sang DELIVERED.
- **Đánh giá.** Service chỉ xác minh đánh giá của người mua đối với đơn đã giao và đúng sản phẩm hoặc xưởng. Với đơn sỉ, đánh giá sản phẩm cần có lô liên kết với phân công đã hoàn thành. Mỗi đối tượng chỉ được đánh giá một lần cho mỗi đơn và loại đối tượng; các partial unique index thực thi quy tắc này. Giá trị `is_verified_purchase` mặc định là false, và service chỉ đặt true sau khi đối chiếu đơn.

Các service này hiện là hàm nội bộ và chưa được kết nối với route hay middleware xác thực. Không truyền `userId` từ dữ liệu do client tự khai: khi nối API, lấy ID từ phiên đã xác thực và áp dụng kiểm tra đầu vào, ánh xạ lỗi và phân quyền tại ranh giới HTTP. Migration đánh giá mới yêu cầu sửa dữ liệu cũ không hợp lệ hoặc trùng lặp trước khi áp dụng.
