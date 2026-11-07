# Biểu đồ tuần tự vCraft

Bộ biểu đồ mô tả các luồng dự kiến cho khách tham quan, người mua, nghệ nhân và Ban quản lý (BQL). Thiết kế dựa trên [yêu cầu nghiệp vụ](../requirements/gdoc_requirements.txt), [kiến trúc phân tầng](../../ARCHITECTURE.md), [schema Prisma](../../prisma/schema.prisma) và [DDL PostgreSQL](../../database/postgresql/relational-schema.sql).

Trong mỗi sơ đồ, **Route + MW** là tuyến HTTP và middleware. Mũi tên liền biểu thị yêu cầu, mũi tên đứt biểu thị kết quả trả về. Cơ chế phiên đăng nhập và cách đẩy thông báo sẽ được chốt khi triển khai. Các ví dụ B2C dùng COD. Trong luồng B2B, khách chọn một hoặc nhiều chào giá, BQL phân đủ số lượng yêu cầu cho các chào giá được chọn và hệ thống xác nhận đã giao khi mọi phần việc hoàn tất.

## 1. Đăng nhập và xác định vai trò

```mermaid
sequenceDiagram
    accTitle: Đăng nhập và xác định vai trò
    actor U as Người dùng
    participant W as Web
    participant H as Route + MW
    participant C as Auth Controller
    participant S as Auth Service
    participant R as Users Repo
    participant D as Prisma + DB

    U->>W: Nhập email và mật khẩu
    W->>H: Gửi yêu cầu đăng nhập
    alt Dữ liệu đầu vào sai định dạng
        H-->>W: 400 và lỗi từng trường
        W-->>U: Yêu cầu sửa thông tin
    else Dữ liệu hợp lệ
        H->>C: Chuyển dữ liệu đã kiểm tra
        C->>S: Xác thực thông tin đăng nhập
        S->>R: Tìm tài khoản theo email
        R->>D: Đọc User
        D-->>R: Tài khoản hoặc không tìm thấy
        R-->>S: Kết quả tra cứu
        S->>S: Kiểm tra hash mật khẩu và isActive
        alt Xác thực thành công
            S-->>C: Thông tin phiên và vai trò
            C-->>H: 200 và thông tin đăng nhập
            H-->>W: Phản hồi đăng nhập
            W-->>U: Mở giao diện theo vai trò
        else Sai thông tin hoặc tài khoản bị vô hiệu hóa
            S-->>C: Từ chối đăng nhập
            C-->>H: 401
            H-->>W: Thông báo đăng nhập thất bại
            W-->>U: Hiển thị lỗi
        end
    end
```

## 2. Khám phá triển lãm và bản đồ làng nghề

```mermaid
sequenceDiagram
    accTitle: Khám phá triển lãm và bản đồ làng nghề
    actor U as Khách tham quan
    participant W as Web
    participant H as Route + MW
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant D as Prisma + DB

    U->>W: Mở triển lãm hoặc bản đồ
    alt Danh mục và chi tiết sản phẩm
        W->>H: Lọc theo danh mục hoặc xưởng
        H->>C: Gọi Products Controller
        C->>S: Tìm sản phẩm công khai
        S->>R: Truy vấn theo bộ lọc
        R->>D: Đọc Category và Product đã công bố
        D-->>R: Danh sách sản phẩm
        R-->>S: Sản phẩm phù hợp
        S-->>C: Dữ liệu danh mục
        C-->>H: 200 và danh sách
        H-->>W: JSON danh mục
        W-->>U: Hiện danh sách sản phẩm
        U->>W: Chọn sản phẩm
        W->>H: Tải chi tiết theo slug
        H->>C: Gọi Products Controller
        C->>S: Lấy chi tiết công khai
        S->>R: Tìm sản phẩm đã công bố
        R->>D: Đọc Product, ArtisanProfile và lô liên quan
        D-->>R: Kết quả truy vấn
        R-->>S: Dữ liệu sản phẩm
        S-->>C: Chi tiết hoặc không tìm thấy
        C-->>H: 200 hoặc 404
        H-->>W: Kết quả tải chi tiết
        W-->>U: Hiện ảnh, giá và câu chuyện hoặc báo không tìm thấy
    else Bản đồ xưởng
        W->>H: Tải các điểm xưởng
        H->>C: Gọi Artisans Controller
        C->>S: Lấy thông tin xưởng công khai
        S->>R: Truy vấn các xưởng đã duyệt
        R->>D: Đọc ArtisanProfile có trạng thái APPROVED
        D-->>R: Tọa độ, tên xưởng và giờ mở cửa
        R-->>S: Các điểm xưởng
        S-->>C: Dữ liệu bản đồ
        C-->>H: 200 và danh sách điểm
        H-->>W: JSON tọa độ và thông tin xưởng
        W-->>U: Hiện ghim trên bản đồ
        U->>W: Chọn ghim xưởng
        W-->>U: Hiện giờ mở cửa và liên kết showroom
    end
```

## 3. Ban quản lý duyệt hồ sơ nghệ nhân

```mermaid
sequenceDiagram
    accTitle: Ban quản lý duyệt hồ sơ nghệ nhân
    actor A as Nghệ nhân
    actor M as BQL
    participant W as Web
    participant H as Route + MW
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant D as Prisma + DB

    A->>W: Nộp hồ sơ xưởng và chứng nhận
    W->>H: Gửi thông tin và URL chứng nhận
    H->>C: Xác thực ARTISAN rồi gọi Artisans Controller
    C->>S: Lưu hồ sơ chờ duyệt
    S->>R: Ghi hồ sơ và chứng nhận
    R->>D: Lưu ArtisanProfile PENDING và ArtisanCertificate
    D-->>R: Đã lưu
    R-->>S: Hồ sơ chờ duyệt
    S-->>C: Kết quả
    C-->>H: Hồ sơ PENDING
    H-->>W: Phản hồi nộp hồ sơ
    W-->>A: Hiện trạng thái chờ duyệt

    M->>W: Xem hồ sơ và chọn duyệt hoặc từ chối
    W->>H: Gửi quyết định kiểm duyệt
    H->>C: Xác thực ADMIN rồi gọi Admin Controller
    C->>S: Xử lý quyết định
    S->>R: Áp dụng quyết định nếu hồ sơ còn PENDING
    R->>D: Cập nhật APPROVED hoặc REJECTED và ghi AuditLog
    D-->>R: Đã cập nhật hoặc trạng thái đã thay đổi
    R-->>S: Kết quả giao dịch
    S-->>C: Trạng thái mới hoặc xung đột
    C-->>H: 200 hoặc 409
    H-->>W: Kết quả kiểm duyệt
    W-->>M: Hiện trạng thái mới hoặc yêu cầu tải lại
```

## 4. Ghi nhật ký và quét QR theo lô

```mermaid
sequenceDiagram
    accTitle: Ghi nhật ký và quét QR theo lô
    actor A as Nghệ nhân
    actor U as Người quét QR
    participant W as Web
    participant H as Route + MW
    participant C as Trace Controller
    participant S as Trace Service
    participant R as Trace Repo
    participant D as Prisma + DB

    A->>W: Tạo lô cho sản phẩm
    W->>H: Gửi thông tin lô và phân công B2B nếu có
    H->>C: Xác thực ARTISAN
    C->>S: Tạo lô và địa chỉ tra cứu
    S->>R: Kiểm tra quyền trên sản phẩm và phân công
    R->>D: Đọc Product và OrderAssignment liên quan
    D-->>R: Quyền sở hữu và thông tin phân công
    R-->>S: Dữ liệu kiểm tra
    alt Sản phẩm và phân công thuộc phạm vi của xưởng
        S->>R: Lưu lô mới
        R->>D: Tạo ProductBatch với batchCode và qrCodeUrl
        D-->>R: Lô mới
        R-->>S: Mã lô và URL
        S-->>C: Dữ liệu truy xuất
        C-->>H: 201 và URL trang tra cứu
        H-->>W: Trả URL để tạo mã QR
        W-->>A: Hiện mã QR của lô
    else Sản phẩm hoặc phân công nằm ngoài phạm vi
        S-->>C: Từ chối tạo lô
        C-->>H: 403
        H-->>W: Phản hồi từ chối
        W-->>A: Hiện lỗi phân quyền
    end

    loop Với mỗi công đoạn từ ươm tơ đến cán láng
        A->>W: Nhập mô tả và ảnh minh chứng
        W->>H: Gửi nhật ký theo mã lô
        H->>C: Xác thực ARTISAN
        C->>S: Kiểm tra quyền và thứ tự công đoạn
        S->>R: Ghi công đoạn hợp lệ
        R->>D: Thêm BatchLog, mỗi lô chỉ có một mục mỗi công đoạn
        D-->>R: Nhật ký đã lưu hoặc trùng công đoạn
        R-->>S: Kết quả ghi
        S-->>C: Kết quả xử lý
        C-->>H: 201 hoặc lỗi dữ liệu
        H-->>W: Phản hồi ghi nhật ký
        W-->>A: Hiện kết quả
    end

    U->>W: Quét QR và mở trang tra cứu
    W->>H: Yêu cầu timeline theo batchCode
    H->>C: Chuyển yêu cầu tra cứu
    C->>S: Lấy dữ liệu truy xuất công khai
    S->>R: Tìm lô theo mã
    R->>D: Đọc ProductBatch, Product và BatchLog theo stepOrder
    D-->>R: Kết quả truy vấn
    R-->>S: Lô và các công đoạn đã ghi
    alt Tìm thấy lô có thể hiển thị
        S-->>C: Thông tin lô và timeline công khai
        C-->>H: 200
        H-->>W: Dữ liệu truy xuất
        W-->>U: Hiện hành trình chế tác
    else Mã lô không hợp lệ hoặc không thể hiển thị
        S-->>C: Không tìm thấy dữ liệu công khai
        C-->>H: 404
        H-->>W: Phản hồi không tìm thấy
        W-->>U: Hiện thông báo không tìm thấy lô
    end
```

## 5. Thêm vào giỏ và đặt đơn bán lẻ B2C

```mermaid
sequenceDiagram
    accTitle: Thêm vào giỏ và đặt đơn bán lẻ B2C
    actor U as Người mua
    participant W as Web
    participant H as Route + MW
    participant C as Retail Controller
    participant S as Retail Service
    participant R as Retail Repo
    participant D as Prisma + DB

    U->>W: Thêm sản phẩm vào giỏ
    W->>H: Gửi sản phẩm và số lượng
    H->>C: Xác thực BUYER và kiểm tra đầu vào
    C->>S: Cập nhật giỏ của người mua
    S->>R: Kiểm tra sản phẩm và cập nhật giỏ
    R->>D: Đọc Product và cập nhật CartItem
    D-->>R: Kết quả cập nhật
    R-->>S: Giỏ đã cập nhật hoặc sản phẩm không hợp lệ
    S-->>C: Kết quả
    C-->>H: Phản hồi giỏ hàng
    H-->>W: Dữ liệu giỏ hàng
    W-->>U: Hiện kết quả thêm vào giỏ

    U->>W: Nhập địa chỉ, chọn COD và đặt hàng
    W->>H: Gửi yêu cầu checkout
    H->>C: Xác thực BUYER và kiểm tra dữ liệu nhận hàng
    C->>S: Đặt đơn từ giỏ hiện tại
    S->>R: Thực hiện giao dịch checkout
    R->>D: Đọc giỏ và giá hiện tại, kiểm tra tồn kho
    alt Giỏ hợp lệ và đủ hàng
        R->>D: Trừ tồn có điều kiện, lưu đơn PENDING và UNPAID
        R->>D: Lưu dòng đơn theo đơn giá lúc mua, xóa dòng giỏ đã mua
        D-->>R: Commit và trả mã đơn
        R-->>S: Đơn đã tạo
        S-->>C: Mã đơn và tổng tiền
        C-->>H: 201
        H-->>W: Chi tiết đơn vừa tạo
        W-->>U: Hiện xác nhận đặt hàng
    else Giỏ rỗng, sản phẩm hết hàng hoặc tồn kho vừa thay đổi
        D-->>R: Rollback giao dịch
        R-->>S: Xung đột khi đặt đơn
        S-->>C: Lý do cần cập nhật giỏ
        C-->>H: 409
        H-->>W: Yêu cầu cập nhật giỏ
        W-->>U: Hiện thông báo và tải lại giỏ
    end
```

## 6. Cập nhật và theo dõi đơn bán lẻ

```mermaid
sequenceDiagram
    accTitle: Cập nhật và theo dõi đơn bán lẻ
    actor O as Người xử lý đơn
    actor U as Người mua
    participant W as Web
    participant H as Route + MW
    participant C as Retail Controller
    participant S as Retail Service
    participant R as Repository
    participant D as Prisma + DB

    loop Xác nhận, chuyển giao và xác nhận đã giao
        O->>W: Chọn trạng thái giao hàng mới
        W->>H: Gửi mã đơn và trạng thái đích
        H->>C: Xác thực và kiểm tra vai trò
        C->>S: Yêu cầu chuyển trạng thái
        S->>R: Đọc đơn, các dòng hàng và quyền xử lý
        R->>D: Đọc RetailOrder và RetailOrderItem
        D-->>R: Đơn hiện tại
        R-->>S: Dữ liệu kiểm tra
        alt Có quyền và bước chuyển hợp lệ
            Note over S,D: PENDING → CONFIRMED → SHIPPING → DELIVERED
            S->>R: Lưu trạng thái và thông báo cho người mua
            R->>D: Cập nhật có điều kiện, ghi Notification ORDER_STATUS
            D-->>R: Kết quả giao dịch
            R-->>S: Trạng thái mới hoặc xung đột
            S-->>C: Kết quả cập nhật
        else Thiếu quyền hoặc sai thứ tự trạng thái
            S-->>C: Từ chối cập nhật
        end
        C-->>H: 200, 403 hoặc 409
        H-->>W: Phản hồi xử lý đơn
        W-->>O: Hiện kết quả cập nhật
    end

    U->>W: Mở lịch sử hoặc chi tiết đơn
    W->>H: Yêu cầu đọc đơn cá nhân
    H->>C: Xác thực BUYER
    C->>S: Tra đơn theo người mua hiện tại
    S->>R: Lọc theo buyerId và mã đơn nếu có
    R->>D: Đọc đơn và dòng hàng
    D-->>R: Dữ liệu đơn của người mua
    R-->>S: Kết quả truy vấn
    S-->>C: Trạng thái giao hàng và thanh toán
    C-->>H: 200 hoặc 404
    H-->>W: Kết quả tra cứu
    W-->>U: Hiện tiến độ đơn hàng
```

## 7. Gửi yêu cầu báo giá và nhận chào giá B2B

```mermaid
sequenceDiagram
    accTitle: Gửi yêu cầu báo giá và nhận chào giá B2B
    actor U as Người mua
    actor A as Nghệ nhân
    participant W as Web
    participant H as Route + MW
    participant C as Wholesale Ctrl
    participant S as Wholesale Svc
    participant R as Repository
    participant D as Prisma + DB

    U->>W: Nhập quy cách, số lượng và hạn giao
    W->>H: Lưu nháp yêu cầu báo giá
    H->>C: Xác thực BUYER
    C->>S: Tạo bản nháp
    S->>R: Lưu yêu cầu của người mua
    R->>D: Tạo QuotationRequest DRAFT
    D-->>R: Bản nháp đã lưu
    R-->>S: Mã yêu cầu
    S-->>C: Bản nháp
    C-->>H: 201
    H-->>W: Phản hồi lưu nháp

    U->>W: Gửi yêu cầu báo giá
    W->>H: Gửi mã yêu cầu và xưởng chỉ định nếu có
    H->>C: Xác thực BUYER
    C->>S: Kiểm tra chủ yêu cầu và trạng thái DRAFT
    alt Gửi riêng một xưởng
        S->>R: Chọn xưởng hợp lệ theo targetArtisanId
    else Mở thầu công khai
        S->>R: Chọn các xưởng đủ điều kiện nhận yêu cầu
    end
    R->>D: Lưu SENT_TO_ARTISANS và Notification QUOTE_REQUEST
    D-->>R: Đã gửi yêu cầu
    R-->>S: Kết quả gửi
    S-->>C: Trạng thái yêu cầu
    C-->>H: 200
    H-->>W: Phản hồi gửi yêu cầu
    W-->>U: Hiện trạng thái đã gửi

    A->>W: Mở yêu cầu và nhập giá, thời gian hoàn thành
    W->>H: Gửi chào giá
    H->>C: Xác thực ARTISAN
    C->>S: Kiểm tra xưởng, phạm vi nhận và trạng thái yêu cầu
    alt Yêu cầu còn nhận thầu và xưởng được tham gia
        S->>R: Ghi thầu và thông báo cho người mua
        R->>D: Tạo Bid SUBMITTED, chuyển ARTISANS_BIDDING nếu là thầu đầu
        R->>D: Ghi Notification BID_RECEIVED trong cùng giao dịch
        D-->>R: Kết quả giao dịch
        R-->>S: Chào giá đã gửi hoặc trùng thầu
        S-->>C: Kết quả gửi thầu
    else Yêu cầu đã khóa hoặc xưởng không đủ quyền
        S-->>C: Từ chối gửi chào giá
    end
    C-->>H: 201, 403 hoặc 409
    H-->>W: Phản hồi gửi chào giá
    W-->>A: Hiện kết quả
```

## 8. Chốt thầu và phân công sản xuất B2B

```mermaid
sequenceDiagram
    accTitle: Chốt thầu và phân công sản xuất B2B
    actor U as Người mua
    actor M as BQL
    participant W as Web
    participant H as Route + MW
    participant C as Wholesale Ctrl
    participant S as Wholesale Svc
    participant R as Repository
    participant D as Prisma + DB

    U->>W: Xem giá và tiến độ cam kết, chọn chào giá
    W->>H: Gửi mã yêu cầu và danh sách chào giá chọn
    H->>C: Xác thực BUYER
    C->>S: Chốt các chào giá được chọn
    S->>R: Kiểm tra chủ yêu cầu, trạng thái và các thầu SUBMITTED
    R->>D: Đọc yêu cầu và khóa cập nhật khi chốt
    alt Yêu cầu đang ARTISANS_BIDDING và lựa chọn hợp lệ
        R->>D: Đổi thầu được chọn sang ACCEPTED
        R->>D: Đổi các thầu SUBMITTED còn lại sang REJECTED
        R->>D: Lưu BUYER_ACCEPTED và Notification BID_ACCEPTED
        D-->>R: Commit giao dịch
        R-->>S: Kết quả chốt
        S-->>C: Yêu cầu đã chốt
    else Yêu cầu hoặc chào giá đã thay đổi
        D-->>R: Không thực hiện thay đổi
        R-->>S: Kết quả kiểm tra
        S-->>C: Từ chối chốt thầu
    end
    C-->>H: 200, 403 hoặc 409
    H-->>W: Phản hồi chốt thầu
    W-->>U: Hiện kết quả chốt

    M->>W: Chia số lượng cho các xưởng được chọn
    W->>H: Gửi danh sách phân bổ
    H->>C: Xác thực ADMIN
    C->>S: Kiểm tra tổng số lượng và các chào giá đã chấp nhận
    alt Yêu cầu BUYER_ACCEPTED và phân bổ hợp lệ
        S->>R: Tạo phân công theo từng thầu đã chốt
        R->>D: Lưu OrderAssignment ASSIGNED trong một giao dịch
        D-->>R: Phân công đã lưu hoặc trùng bidId
        R-->>S: Kết quả giao dịch
        S-->>C: Danh sách phân công hoặc xung đột
    else Chưa chốt thầu hoặc phân bổ không hợp lệ
        S-->>C: Từ chối phân công
    end
    C-->>H: 201, 409 hoặc 422
    H-->>W: Phản hồi phân công
    W-->>M: Hiện danh sách phân công hoặc lỗi
```

## 9. Theo dõi sản xuất và giao đơn sỉ

```mermaid
sequenceDiagram
    accTitle: Theo dõi sản xuất và giao đơn sỉ
    actor A as Nghệ nhân
    actor U as Người mua
    participant W as Web
    participant H as Route + MW
    participant C as Wholesale Ctrl
    participant S as Wholesale Svc
    participant R as Repository
    participant D as Prisma + DB

    loop Với mỗi phân công sản xuất
        A->>W: Báo bắt đầu, sẵn sàng giao hoặc đã giao
        W->>H: Gửi mã phân công và trạng thái mới
        H->>C: Xác thực ARTISAN
        C->>S: Kiểm tra xưởng phụ trách và bước chuyển
        Note over S,D: ASSIGNED → IN_PRODUCTION → READY_FOR_DELIVERY → COMPLETED
        alt Có quyền và trạng thái hợp lệ
            S->>R: Cập nhật phân công và tổng hợp trạng thái yêu cầu
            R->>D: Khóa yêu cầu trong giao dịch, cập nhật OrderAssignment
            opt Phân công đầu tiên bắt đầu
                R->>D: Đổi yêu cầu từ BUYER_ACCEPTED sang IN_PRODUCTION
            end
            opt Mọi phân công đã COMPLETED
                R->>D: Đổi yêu cầu sang DELIVERED
            end
            R->>D: Ghi Notification ORDER_STATUS cho người mua
            D-->>R: Kết quả giao dịch
            R-->>S: Tiến độ mới hoặc xung đột
            S-->>C: Kết quả cập nhật
        else Sai xưởng hoặc sai trạng thái
            S-->>C: Từ chối cập nhật
        end
        C-->>H: 200, 403 hoặc 409
        H-->>W: Phản hồi cập nhật
        W-->>A: Hiện tiến độ hoặc lỗi
    end

    U->>W: Mở yêu cầu của mình để theo dõi
    W->>H: Tải chi tiết theo mã yêu cầu
    H->>C: Xác thực BUYER
    C->>S: Tra cứu tiến độ theo chủ yêu cầu
    S->>R: Lấy yêu cầu, các phân công và lô liên kết
    R->>D: Đọc QuotationRequest, OrderAssignment và ProductBatch
    D-->>R: Kết quả truy vấn
    R-->>S: Tiến độ và URL tra cứu lô
    S-->>C: Dữ liệu đơn sỉ
    C-->>H: 200 hoặc 404
    H-->>W: Kết quả tra cứu
    W-->>U: Hiện tiến độ từng xưởng và liên kết truy xuất
```

## 10. Đánh giá sau khi mua hàng

```mermaid
sequenceDiagram
    accTitle: Đánh giá sau khi mua hàng
    actor U as Người mua
    participant W as Web
    participant H as Route + MW
    participant C as Reviews Ctrl
    participant S as Reviews Svc
    participant R as Reviews Repo
    participant D as Prisma + DB

    U->>W: Chọn sản phẩm hoặc nghệ nhân và nhập đánh giá
    W->>H: Gửi đối tượng, điểm, bình luận và mã đơn
    H->>C: Xác thực BUYER và kiểm tra điểm từ 1 đến 5
    C->>S: Kiểm tra quyền đánh giá
    S->>R: Tra đơn đã giao và đối tượng trong đơn
    R->>D: Đọc đơn lẻ hoặc yêu cầu sỉ và dữ liệu liên quan
    D-->>R: Dữ liệu mua hàng
    R-->>S: Kết quả đối chiếu
    alt Đơn đã giao thuộc người mua và đúng đối tượng
        S->>R: Lưu đánh giá mua hàng đã xác minh
        R->>D: Thêm Review
        D->>D: Trigger cập nhật điểm trung bình và tổng lượt
        D-->>R: Đánh giá đã lưu
        R-->>S: Kết quả ghi
        S-->>C: Đánh giá mới
        C-->>H: 201
    else Chưa đủ điều kiện đánh giá
        S-->>C: Từ chối đánh giá
        C-->>H: 403
    end
    H-->>W: Phản hồi gửi đánh giá
    W-->>U: Hiện đánh giá hoặc lý do từ chối
```

## 11. Đăng tin cộng đồng và xem thông báo

```mermaid
sequenceDiagram
    accTitle: Đăng tin cộng đồng và xem thông báo
    actor M as BQL
    actor U as Người dùng
    participant W as Web
    participant H as Route + MW
    participant C as Controller
    participant S as Service
    participant R as Repository
    participant D as Prisma + DB

    M->>W: Soạn và đăng tin làng nghề
    W->>H: Gửi tiêu đề, danh mục và nội dung
    H->>C: Xác thực ADMIN rồi gọi News Controller
    C->>S: Đăng tin cộng đồng
    S->>R: Lưu tin và tạo thông báo
    R->>D: Ghi CommunityNews và Notification COMMUNITY_NEWS
    D-->>R: Tin đã đăng
    R-->>S: Kết quả giao dịch
    S-->>C: Dữ liệu bài đăng
    C-->>H: 201
    H-->>W: Phản hồi đăng tin
    W-->>M: Hiện tin vừa đăng

    U->>W: Mở chuông thông báo
    W->>H: Yêu cầu danh sách thông báo
    H->>C: Xác thực rồi gọi Notifications Controller
    C->>S: Đọc thông báo của tài khoản hiện tại
    S->>R: Lọc thông báo theo userId
    R->>D: Đọc Notification
    D-->>R: Các thông báo của người dùng
    R-->>S: Danh sách thông báo
    S-->>C: Dữ liệu chuông thông báo
    C-->>H: 200
    H-->>W: Danh sách kèm trạng thái đã đọc
    W-->>U: Hiện thông báo và liên kết đến tin hoặc đơn hàng
```
