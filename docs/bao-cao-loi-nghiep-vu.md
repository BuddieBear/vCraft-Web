# Báo cáo lỗi nghiệp vụ vCraft

Rà soát ngày **24/11/2026** trên nhánh `Tuấn-Dũng`, commit `8d6efe4`. Báo cáo tổng hợp lỗi và điểm thiếu trong luồng thao tác của **Người mua**, **Nghệ nhân** và **Admin**. Lỗi liên quan nhiều vai trò được ghi tại vai trò phát sinh thao tác và nêu vai trò bị ảnh hưởng trong mô tả.

| Vai trò | Cao | Trung bình | Tổng |
| --- | ---: | ---: | ---: |
| Người mua | 4 | 9 | 13 |
| Nghệ nhân | 3 | 4 | 7 |
| Admin | 3 | 3 | 6 |
| **Tổng** | **10** | **16** | **26** |

**Cao** áp dụng cho lỗi sai giá hoặc phạm vi công bố dữ liệu, làm mất khả năng truy xuất, hoặc khiến đơn không thể xử lý qua luồng thông thường. **Trung bình** áp dụng cho lỗi hiển thị, kiểm tra đầu vào và thao tác còn thiếu có ảnh hưởng đến vận hành.

## 1. Người mua

| STT | Mức | Lỗi hoặc điểm thiếu | Kết quả tái hiện | Kết quả mong đợi |
| --- | --- | --- | --- | --- |
| 01 | Cao | Giá thay đổi khi xác nhận mua lẻ | Khách mở giỏ với tổng **150.000 ₫**. Xưởng đổi giá thành **250.000 ₫**. Khách bấm đặt hàng và API tạo đơn **250.000 ₫** ngay. [Giỏ hàng](../frontend/src/pages/cart.page.js#L182) · [Tạo đơn](../backend/src/repositories/retail.repository.js#L46) | Hiển thị lại giá mới và yêu cầu khách xác nhận trước khi tạo đơn. |
| 02 | Cao | Chốt báo giá vượt ngân sách tối đa | Yêu cầu đặt sỉ ghi tối đa **100.000 ₫**. Hệ thống vẫn nhận và chốt hai báo giá **150.000 ₫** và **200.000 ₫**, không cảnh báo vượt ngân sách. [Màn hình chốt báo giá](../frontend/src/pages/wholesale/buyer.js#L218) · [Xử lý chốt báo giá](../backend/src/repositories/wholesale.repository.js#L206) | Kiểm tra tổng tiền trước khi chốt. Nếu nghiệp vụ cho phép vượt ngân sách, khách cần xác nhận rõ tổng tiền mới. |
| 03 | Cao | Tổng giá không khớp số lượng giao từng xưởng | Hai xưởng báo tổng giá cho 10 chiếc. Người mua chia thành 4 và 6 chiếc. Mỗi phân công vẫn giữ nguyên tổng giá chào cho cả 10 chiếc. Nghệ nhân và Admin cùng gặp sai lệch khi đối soát. [Lưu phân công và giá](../backend/src/repositories/wholesale.repository.js#L224) | Lưu số tiền đã được các bên xác nhận cho đúng số lượng giao mỗi xưởng. |
| 04 | Cao | Ảnh của nhật ký đơn riêng truy cập được khi chưa đăng nhập | Với ảnh tự tạo trong lô kiểm thử, API nhật ký riêng trả `401` khi chưa đăng nhập. Ảnh minh chứng vẫn mở được qua URL trực tiếp và trả `200`. [Phục vụ tệp ảnh](../backend/src/app.js#L42) | Áp dụng quyền xem đơn cho file ảnh thuộc nhật ký riêng. |
| 05 | Trung bình | Luồng gửi Ban quản lý điều phối bị chặn từ bản nháp | Form tạo yêu cầu đòi chọn ít nhất một xưởng để lưu nháp. Nút **Gửi Ban quản lý điều phối** chỉ xuất hiện với bản nháp chưa chọn xưởng. API đã nhận và điều phối được bản nháp phù hợp. [Tạo bản nháp](../frontend/src/pages/wholesale/buyer.js#L121) · [Nút gửi điều phối](../frontend/src/pages/wholesale/buyer.js#L193) | Khách chưa biết chọn xưởng nào có thể lưu nháp rồi gửi Ban quản lý. |
| 06 | Trung bình | Báo giá hết hạn vẫn hiện nút chốt | Trên yêu cầu hết hạn, nút **Chốt báo giá** vẫn bấm được. API trả `409` với thông báo chung. [Màn hình chốt báo giá](../frontend/src/pages/wholesale/buyer.js#L218) | Hiển thị đã hết hạn và khóa thao tác chốt. |
| 07 | Trung bình | Thiếu nút hủy đơn lẻ đang chờ | Đơn lẻ **Chờ xác nhận** và chưa thu COD không có nút **Hủy đơn**. Cùng đơn đó, API hủy được và chuyển về `CANCELLED`. [Lịch sử đơn trên giao diện](../frontend/src/pages/cart.page.js#L138) · [Quy tắc hủy đơn](../backend/src/repositories/retail.repository.js#L170) | Hiện thao tác hủy trên đơn còn đủ điều kiện. |
| 08 | Trung bình | Lịch sử mua lẻ chỉ tải 24 đơn | Giao diện gọi `/retail/orders?limit=24` và không có điều khiển trang tiếp theo. Đơn cũ hơn giới hạn này không xuất hiện trong lịch sử. [Tải lịch sử đơn](../frontend/src/pages/cart.page.js#L138) | Cho xem các trang cũ hơn của lịch sử đơn. |
| 09 | Trung bình | Hồ sơ lưu số điện thoại sai và điền vào checkout | API cập nhật hồ sơ trả `200` với số điện thoại `abc`. Form checkout tự điền giá trị này, trong khi bước xác nhận đơn yêu cầu số hợp lệ. [Kiểm tra hồ sơ](../backend/src/routes/auth.routes.js#L17) · [Tự điền checkout](../frontend/src/pages/cart.page.js#L94) | Áp dụng cùng quy tắc kiểm tra số điện thoại khi lưu hồ sơ và khi checkout. |
| 10 | Trung bình | Bỏ trống loại lụa vẫn bị gán Lụa vân | Tạo yêu cầu đặt sỉ không chọn loại lụa. Dữ liệu lưu `LUA_VAN` và nghệ nhân thấy **Lụa vân** trong chi tiết yêu cầu. [Giá trị mặc định](../backend/src/services/wholesale.service.js#L76) | Giữ trạng thái chưa chọn hoặc yêu cầu khách xác nhận loại lụa trên form. |
| 11 | Trung bình | Giá lưu và giá hiển thị khác nhau | Sản phẩm và đơn hàng lưu **100.000,25 ₫**. Màn hình chi tiết và lịch sử đơn hiển thị **100.000 ₫**. [Định dạng giá](../frontend/src/components/ui.js#L23) | Dùng cùng quy tắc tiền tệ ở lúc nhập, lúc lưu và lúc hiển thị. |
| 12 | Trung bình | Không nhập được ghi chú giao hàng từ checkout | Form có người nhận, số điện thoại và địa chỉ. API checkout hỗ trợ `shippingNote`, nhưng khách không có ô nhập ghi chú trên giao diện. [Form checkout](../frontend/src/pages/cart.page.js#L41) · [API checkout](../backend/src/routes/retail.routes.js#L23) | Khách có thể gửi ghi chú giao hàng và xưởng thấy ghi chú trên đơn. |
| 13 | Trung bình | Thông báo đơn lẻ thiếu liên kết và dùng mã trạng thái | Thông báo tiến độ đánh dấu đã đọc được, nhưng không có liên kết mở đơn. Nội dung API dùng mã như `SHIPPING` thay cho nhãn dễ hiểu. [Tạo thông báo](../backend/src/repositories/retail.repository.js#L162) · [Liên kết từ thông báo](../frontend/src/pages/notifications.page.js#L34) | Hiện trạng thái bằng tiếng Việt và cho khách mở đúng đơn lẻ. |

## 2. Nghệ nhân

| STT | Mức | Lỗi hoặc điểm thiếu | Kết quả tái hiện | Kết quả mong đợi |
| --- | --- | --- | --- | --- |
| 14 | Cao | Nhập nhầm lô có thể làm kẹt đơn đặt sỉ | Tạo lô chiếm hết số lượng phân công. Xưởng không thấy thao tác sửa hoặc hủy lô, gọi tạo lô thay thế trả `409`. Đơn cũng không thể chuyển **Sẵn sàng giao** khi lô chưa hoàn thành. Admin thử phân công lại khi đang sản xuất trả `409`. [Giao diện lô](../frontend/src/pages/wholesale/artisan.js#L91) · [Giới hạn số lượng lô](../backend/src/repositories/traceability.repository.js#L58) | Có thao tác sửa hoặc hủy lô nhập sai tại các trạng thái phù hợp, đồng thời cập nhật phần số lượng còn phải sản xuất. |
| 15 | Trung bình | Báo giá gửi rồi không thể sửa hoặc rút | Yêu cầu vẫn đang mở. Nghệ nhân chỉ xem được báo giá đã gửi. Gửi báo giá mới cho cùng yêu cầu trả `409` và giá cũ vẫn còn. [Chi tiết báo giá của xưởng](../frontend/src/pages/wholesale/artisan.js#L70) · [Lưu báo giá](../backend/src/repositories/wholesale.repository.js#L190) | Cho sửa hoặc rút báo giá trước khi khách chốt, theo thời hạn và quy tắc đã công bố. |
| 16 | Cao | Hai tab có thể ghi đè thay đổi giá | Hai tab mở cùng sản phẩm giá **250.000 ₫**. Tab A lưu giá **310.000 ₫**. Tab B sửa mô tả và lưu từ dữ liệu cũ. Giá quay về **250.000 ₫** vì tồn kho chưa đổi. [Điều kiện cập nhật sản phẩm](../backend/src/repositories/products.repository.js#L117) | Phát hiện bản sửa cũ và yêu cầu tải lại trước khi ghi đè thay đổi từ tab khác. |
| 17 | Cao | Đổi đường dẫn sản phẩm làm QR cũ hỏng | Trước khi đổi slug, trang đích QR sản phẩm trả `200`. Sau khi lưu slug mới, QR cũ trả `404` còn đường dẫn mới mở được. [Trang đích QR](../backend/src/routes/site.routes.js#L43) · [Tạo QR sản phẩm](../backend/src/routes/traceability.routes.js#L18) | QR sản phẩm đã phát hành dẫn đến sản phẩm đúng sau khi đổi đường dẫn. |
| 18 | Trung bình | Báo giá hết hạn vẫn mang trạng thái đang nhận báo giá | Từ lịch sử báo giá của xưởng, yêu cầu đã quá hạn vẫn hiện **Đang nhận báo giá** và không có nhãn hết hạn. [Chi tiết yêu cầu cho xưởng](../frontend/src/pages/wholesale/artisan.js#L49) | Hiển thị trạng thái thực tế của yêu cầu theo thời hạn. |
| 19 | Trung bình | Ngày công đoạn trên màn hình xưởng lệch một ngày | Lưu ngày công đoạn **20/11**. Màn hình nghệ nhân định dạng theo UTC và hiện **19/11**. Nhật ký người mua hiện đúng **20/11** theo giờ Việt Nam. [Ngày công đoạn trên màn hình xưởng](../frontend/src/pages/wholesale/artisan.js#L192) · [Múi giờ dùng để định dạng](../frontend/src/pages/wholesale/view.js#L28) | Cùng một công đoạn hiển thị cùng ngày ở các màn hình. |
| 20 | Trung bình | Nhật ký cho lưu công đoạn ngược thứ tự ngày | Lưu bước cắt ngày **20/11**, sau đó ghi bước may ngày **19/11**. API nhận cả hai và cho hoàn thành lô. [Lưu công đoạn](../backend/src/repositories/traceability.repository.js#L96) | Kiểm tra ngày so với công đoạn liền trước và liền sau khi thêm hoặc sửa nhật ký. |

## 3. Admin

| STT | Mức | Lỗi hoặc điểm thiếu | Kết quả tái hiện | Kết quả mong đợi |
| --- | --- | --- | --- | --- |
| 21 | Cao | Có thể duyệt phiên bản hồ sơ khác bản đã xem | Admin tải hồ sơ ở địa chỉ A. Nghệ nhân đổi sang địa chỉ B trước khi Admin bấm duyệt. Yêu cầu duyệt trả `204` và địa chỉ B được công bố. [Nút duyệt hồ sơ](../frontend/src/pages/admin.page.js#L191) · [Cập nhật trạng thái duyệt](../backend/src/repositories/users.repository.js#L26) | Xác nhận hồ sơ chưa đổi kể từ khi Admin mở bản thẩm định. |
| 22 | Cao | Xưởng đổi tên và địa chỉ công khai sau khi được duyệt | Sau khi được duyệt, nghệ nhân đổi tên và địa chỉ. Trang công khai hiển thị dữ liệu mới ngay và hồ sơ vẫn `APPROVED`. [Cập nhật hồ sơ xưởng](../backend/src/repositories/artisans.repository.js#L45) | Các thay đổi định danh cần được xem xét lại trước khi công bố theo quy tắc xác minh xưởng. |
| 23 | Trung bình | Hồ sơ bị từ chối thiếu quy trình bổ sung và duyệt lại | Nghệ nhân sửa hồ sơ thành công nhưng trạng thái vẫn là `REJECTED`. Admin không có bộ lọc hồ sơ bị từ chối và không nhập được lý do từ chối. Duyệt lại hoặc cấp lại cùng email trả `409`. [Bộ lọc trạng thái](../frontend/src/pages/admin.page.js#L142) · [API duyệt xưởng](../backend/src/routes/admin.routes.js#L19) | Giữ lý do từ chối, cho nghệ nhân nộp bổ sung và cho Admin xem xét lại. |
| 24 | Trung bình | Yêu cầu hết hạn vẫn nằm trong hàng chờ điều phối | Admin thấy yêu cầu quá hạn ở **Chờ Ban quản lý điều phối**, chọn xưởng và bấm **Mời xưởng chào giá**. API trả `409` với thông báo chung và yêu cầu vẫn nằm trong hàng chờ. [Màn hình điều phối](../frontend/src/pages/wholesale/admin.js#L13) · [Kiểm tra hạn điều phối](../backend/src/repositories/wholesale.repository.js#L172) | Hiện tình trạng hết hạn và cho Admin xử lý hoặc đóng yêu cầu theo quy định. |
| 25 | Cao | Không thể hủy phần hàng chưa giao trong đơn nhiều xưởng | Xưởng A đã chuyển **Đang giao**. Xưởng B còn chờ và không thể giao. Admin hủy riêng phần B trả `400`, hủy toàn đơn trả `409`, xưởng B thử hủy cũng bị chặn. [Trạng thái phần đơn](../backend/src/routes/retail.routes.js#L15) · [Ràng buộc hủy toàn đơn](../backend/src/repositories/retail.repository.js#L170) | Có cách hủy phần chưa giao và đối soát tồn kho, COD và trạng thái của các phần còn lại. |
| 26 | Trung bình | Màn hình Admin thiếu chi tiết để đối soát đơn lẻ | Admin thấy mã đơn, trạng thái và các nút xử lý theo xưởng. Trên đơn kiểm thử, màn hình không hiển thị mặt hàng và địa chỉ giao dù API danh sách có dữ liệu đơn. [Hiển thị đơn bán lẻ](../frontend/src/pages/retail-orders.page.js#L105) | Admin có thể đối chiếu mặt hàng, số lượng và thông tin giao hàng khi xử lý đơn. |

## Phạm vi và kết quả kiểm tra

- Đã đăng nhập tài khoản Người mua trên `localhost:5190`. Các ca cố ý tạo lỗi hoặc thay đổi trạng thái được tái hiện bằng dữ liệu riêng qua Playwright, HTTP và đối chiếu PostgreSQL.
- Luồng mô phỏng **Khăn lụa in logo** đã hoàn tất theo ba vai trò. Xưởng gửi báo giá, người mua chốt, Admin phân công, xưởng ghi đủ hai công đoạn và xác nhận giao. Database xác nhận đơn `DELIVERED`, phân công và lô `COMPLETED`.
- Bộ kiểm thử tích hợp trên PostgreSQL riêng đã qua trong vòng rà soát. Các luồng mua lẻ, giao COD, đánh giá, duyệt xưởng và quản lý tin cũng đã được kiểm tra. Gửi email khôi phục thật chưa được kiểm tra.

## Bản sửa sau rà soát

| Mục | Thay đổi |
| --- | --- |
| 01, 07–09, 11–13 | Đối chiếu giá và số lượng trước khi checkout. Sau khi tải giá mới, người mua xác nhận lại. Lịch sử có phân trang và hỗ trợ hủy đơn đủ điều kiện. Kiểm tra điện thoại, giữ hai chữ số thập phân khi có, lưu ghi chú giao hàng và mở đúng đơn từ thông báo tiếng Việt. |
| 02, 03, 05, 06 | Áp dụng trần ngân sách nếu đã nhập. Hiện tổng tiền sau khi chia số lượng và tính giá từng phần theo tỷ lệ. Cho lưu nháp chưa chọn xưởng để gửi Ban quản lý. Khóa thao tác chốt yêu cầu đã hết hạn. |
| 04, 14, 19, 20 | Ảnh lô riêng dùng quyền xem nhật ký. Cho hủy lô nhập sai khi phân công còn đang sản xuất để tạo lô thay thế. Ngày công đoạn theo giờ Việt Nam và được kiểm tra thứ tự khi thêm, sửa hoặc hoàn thành. |
| 10, 15, 18, 24 | Loại lụa có thể để trống. Xưởng sửa và rút báo giá khi còn mở, người mua phải xem lại nếu giá vừa đổi. Các vai trò thấy yêu cầu hết hạn. Admin có thể đóng yêu cầu quá hạn đang chờ điều phối. |
| 16, 17 | Phát hiện bản sửa sản phẩm cũ qua `revision`. QR vẫn mở được trang quy trình khi sản phẩm đổi slug. |
| 21–23 | Duyệt đúng phiên bản minh chứng. Thay đổi tên, địa chỉ hoặc tọa độ của xưởng đã duyệt được gửi xét duyệt lại. Admin xem hồ sơ bị từ chối và ghi lý do. Xưởng có thể nộp lại. |
| 25, 26 | Hủy riêng phần chưa giao và chưa thu tiền, hoàn tồn đúng xưởng và tính lại đơn. Admin xem mặt hàng, số lượng và thông tin giao nhận. |

Bộ kiểm thử tích hợp đã chạy trên PostgreSQL mới. Playwright đã kiểm tra xác nhận giá mới, hủy đơn và mở lại từ thông báo, gửi yêu cầu chưa chọn xưởng, sửa và rút báo giá, hiển thị ảnh lô riêng cho người mua, từ chối hồ sơ kèm lý do và nộp lại. Migration cũng đã được áp dụng trên cơ sở dữ liệu localhost có dữ liệu cũ để kiểm tra chặn ảnh riêng và cập nhật liên kết thông báo.
