# vCraft - Làng Lụa Tơ Tằm Vạn Phúc: Báo Cáo Thiết Kế ERD & Kiến Trúc CSDL Chi Tiết

> **Học phần**: INT3306 - Phát triển ứng dụng Web (Fall 2026, VNU-UET)  
> **Dự án**: **vCraft - Triển lãm số & Giao thương Làng nghề Thủ công Truyền thống**  
> **Chuyên đề nghiên cứu**: **Làng Lụa Tơ Tằm Vạn Phúc, Hà Đông, Hà Nội**  
> **Hệ quản trị CSDL**: PostgreSQL 18.6 (64-bit)  
> **Mã nguồn DDL & Seed Data**: [relational-schema.sql](file:///D:/PTUD%20Web/vCraft/docs/relational-schema.sql)  
> **Mô hình ORM**: [prisma/schema.prisma](file:///D:/PTUD%20Web/vCraft/prisma/schema.prisma)  
> **Trang trực quan tương tác**: [schema_visualizer.html](file:///D:/PTUD%20Web/vCraft/docs/schema_visualizer.html)  
> **Ảnh thiết kế độ nét cao**: [vcraft_schema.png](file:///D:/PTUD%20Web/vCraft/docs/vcraft_schema.png)

---

## 1. Sơ Đồ Thực Thể - Quan Hệ Toàn Diện (Mermaid ERD - 17 Bảng)

Sơ đồ mô tả đầy đủ **17 thực thể chuẩn hóa 3NF**, phân thành **5 phân hệ chức năng**, chỉ rõ khóa chính (`PK`), khóa ngoại (`FK`), ràng buộc duy nhất (`UK`), kiểu dữ liệu thực tế và bản số quan hệ (Cardinality & Modality chuẩn Crow's Foot):

```mermaid
erDiagram
    %% ==========================================
    %% 1. TÀI KHOẢN & HỒ SƠ NGHỆ NHÂN (AUTH & MAP)
    %% ==========================================
    users ||--o| artisan_profiles : "1 user có tối đa 1 hồ sơ xưởng (1:0..1)"
    artisan_profiles ||--o{ artisan_certificates : "1 xưởng có 0..N chứng nhận OCOP/bằng khen (1:N)"
    
    %% ==========================================
    %% 2. TRIỂN LÃM SỐ & TRUY XUẤT NGUỒN GỐC QR
    %% ==========================================
    categories ||--o{ products : "1 danh mục chứa 0..N sản phẩm lụa (1:N)"
    artisan_profiles ||--o{ products : "1 xưởng dệt sáng tác 0..N sản phẩm lụa (1:N)"
    products ||--o{ product_batches : "1 sản phẩm được dệt thành 0..N lô hàng (1:N)"
    order_assignments ||--o{ product_batches : "1 phân bổ dệt sỉ liên kết với 0..N lô sản xuất QR (1:0..N)"
    product_batches ||--|{ batch_logs : "1 lô hàng có 1..5 mốc nhật ký vòng đời (1:1..5)"

    %% ==========================================
    %% 3. B2C BÁN LẺ (SHOPPING CART & CHECKOUT)
    %% ==========================================
    users ||--o{ cart_items : "1 khách hàng có 0..N mục trong giỏ (1:N)"
    products ||--o{ cart_items : "1 sản phẩm xuất hiện trong 0..N giỏ hàng (1:N)"
    users ||--o{ retail_orders : "1 khách hàng đặt 0..N đơn mua lẻ (1:N)"
    retail_orders ||--|{ retail_order_items : "1 đơn hàng chứa 1..N mặt hàng (1:1..N)"
    products ||--o{ retail_order_items : "1 sản phẩm bán trong 0..N dòng đơn lẻ (1:N)"
    artisan_profiles ||--o{ retail_order_items : "1 xưởng cung ứng mặt hàng mua lẻ (1:N)"

    %% ==========================================
    %% 4. B2B MUA SỈ & QUOTATION STATE MACHINE
    %% ==========================================
    users ||--o{ quotation_requests : "1 khách mua sỉ tạo 0..N yêu cầu báo giá (1:N)"
    artisan_profiles ||--o{ quotation_requests : "nhận yêu cầu báo giá gửi đích danh (Direct Quote) (1:0..N)"
    quotation_requests ||--o{ bids : "1 yêu cầu nhận 0..N hồ sơ chào giá (1:N)"
    artisan_profiles ||--o{ bids : "1 xưởng gửi 0..N hồ sơ chào giá (1:N)"
    quotation_requests ||--o{ order_assignments : "1 đơn sỉ điều phối cho 0..N xưởng dệt (1:N)"
    artisan_profiles ||--o{ order_assignments : "1 xưởng nhận 0..N phân bổ sản xuất (1:N)"
    bids ||--o| order_assignments : "1 hồ sơ thầu trúng thầu thành tối đa 1 phân bổ (1:0..1)"

    %% ==========================================
    %% 5. ĐÁNH GIÁ, THÔNG BÁO, BẢN TIN & AUDIT
    %% ==========================================
    users ||--o{ reviews : "1 khách hàng viết 0..N đánh giá (1:N)"
    products ||--o{ reviews : "1 sản phẩm nhận 0..N đánh giá B2C (1:N)"
    artisan_profiles ||--o{ reviews : "1 xưởng nhận 0..N đánh giá uy tín (1:N)"
    retail_orders ||--o{ reviews : "1 đơn bán lẻ có thể đính kèm đánh giá (1:0..N)"
    quotation_requests ||--o{ reviews : "1 đơn sỉ nghiệm thu có thể đính kèm đánh giá (1:0..N)"
    users ||--o{ notifications : "1 người dùng nhận 0..N thông báo chuông thời gian thực (1:N)"
    users ||--o{ community_news : "1 Admin BQL xuất bản 0..N tin tức (1:N)"
    users ||--o{ audit_logs : "1 người dùng phát sinh 0..N bản ghi nhật ký kiểm toán (1:N)"

    %% ==========================================
    %% CHI TIẾT THUỘC TÍNH 17 THỰC THỂ
    %% ==========================================

    users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar phone
        user_role role
        varchar avatar_url
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    artisan_profiles {
        uuid id PK
        uuid user_id FK_UK
        varchar workshop_name
        varchar artisan_title
        text family_history
        smallint experience_years
        varchar address
        decimal latitude
        decimal longitude
        varchar opening_hours
        boolean is_open_for_visitors
        varchar cover_image_url
        text_array gallery_images
        artisan_verification_status verification_status
        timestamptz verified_at
        decimal average_rating
        integer total_reviews
        timestamptz created_at
        timestamptz updated_at
    }

    artisan_certificates {
        uuid id PK
        uuid artisan_id FK
        varchar title
        varchar issuing_authority
        smallint issued_year
        varchar certificate_image_url
        timestamptz created_at
    }

    categories {
        uuid id PK
        varchar name UK
        varchar slug UK
        text description
        varchar thumbnail_url
        timestamptz created_at
    }

    products {
        uuid id PK
        uuid artisan_id FK
        uuid category_id FK
        varchar name
        varchar slug UK
        silk_weave_type weave_type
        varchar raw_material
        text description
        text cultural_story
        decimal price
        integer stock_quantity
        text_array media_urls
        boolean is_unique_piece
        boolean is_published
        decimal average_rating
        integer total_reviews
        timestamptz created_at
        timestamptz updated_at
    }

    product_batches {
        uuid id PK
        uuid product_id FK
        uuid order_assignment_id FK
        varchar batch_code UK
        varchar qr_code_url
        date started_at
        date completed_at
        integer total_quantity
        batch_status status
        timestamptz created_at
        timestamptz updated_at
    }

    batch_logs {
        uuid id PK
        uuid batch_id FK
        silk_production_stage stage
        varchar stage_title
        text description
        text_array evidence_image_urls
        timestamptz logged_at
        integer step_order
        timestamptz created_at
    }

    cart_items {
        uuid id PK
        uuid user_id FK
        uuid product_id FK
        integer quantity
        timestamptz created_at
        timestamptz updated_at
    }

    retail_orders {
        uuid id PK
        varchar order_code UK
        uuid buyer_id FK
        varchar recipient_name
        varchar recipient_phone
        text shipping_address
        text shipping_note
        decimal total_amount
        payment_method payment_method
        payment_status payment_status
        retail_order_status status
        timestamptz created_at
        timestamptz updated_at
    }

    retail_order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        uuid artisan_id FK
        integer quantity
        decimal unit_price
        decimal subtotal
        timestamptz created_at
    }

    quotation_requests {
        uuid id PK
        uuid buyer_id FK
        uuid target_artisan_id FK
        varchar title
        text specifications
        integer target_quantity
        decimal max_budget
        silk_weave_type preferred_weave_type
        date deadline
        text_array attachment_urls
        quote_status status
        timestamptz created_at
        timestamptz updated_at
    }

    bids {
        uuid id PK
        uuid quotation_request_id FK
        uuid artisan_id FK
        decimal proposed_price
        integer proposed_completion_days
        text note
        text_array sample_images
        bid_status status
        timestamptz created_at
        timestamptz updated_at
    }

    order_assignments {
        uuid id PK
        uuid quotation_request_id FK
        uuid artisan_id FK
        uuid bid_id FK_UK
        integer allocated_quantity
        decimal agreed_price
        assignment_status status
        timestamptz started_at
        timestamptz completed_at
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    reviews {
        uuid id PK
        uuid buyer_id FK
        review_target_type target_type
        uuid product_id FK
        uuid artisan_id FK
        uuid retail_order_id FK
        uuid quotation_request_id FK
        smallint rating
        text comment
        text_array media_urls
        boolean is_verified_purchase
        timestamptz created_at
        timestamptz updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        varchar title
        text message
        notification_type type
        varchar link_url
        boolean is_read
        timestamptz created_at
    }

    community_news {
        uuid id PK
        uuid author_admin_id FK
        varchar title
        varchar slug UK
        news_category category
        text content
        varchar thumbnail_url
        boolean is_pinned
        timestamptz published_at
        timestamptz created_at
        timestamptz updated_at
    }

    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar target_table
        uuid target_record_id
        jsonb metadata
        timestamptz created_at
    }
```

---

## 2. Các Điểm Hoàn Thiện Cốt Lõi So Với Thiết Kế Cũ

1. **Liên kết 2 chiều giữa Đơn sỉ B2B và Lô sản xuất QR (`product_batches.order_assignment_id`)**:
   - Khách mua sỉ sau khi chốt đơn có thể quét mã QR riêng của lô đơn sỉ để theo dõi 5 công đoạn dệt vải của chính đơn hàng mình đặt.
   - Đối với sản xuất bán lẻ hàng loạt thông thường, trường này nhận giá trị `NULL`.
2. **Hỗ trợ cả Đấu thầu công khai (Open Bidding) lẫn Đặt hàng chỉ định (Direct Quote)**:
   - Thêm `target_artisan_id` vào `quotation_requests`. Khách có thể gửi yêu cầu thẳng tới một xưởng cụ thể khi xem trên bản đồ Leaflet, hoặc để trống để mở thầu toàn bộ nghệ nhân làng Vạn Phúc.
3. **Hệ thống Thông báo Thời gian thực (`notifications`)**:
   - Phục vụ tính năng chuông thông báo (Bell notification) trên giao diện Web khi: có yêu cầu báo giá mới, có nghệ nhân vào chào giá, khách chốt thầu, đơn hàng đổi trạng thái giao hàng, hoặc BQL phát hành tin tức mới.
4. **Trigger tính điểm Rating thông minh (`trigger_update_rating_stats`)**:
   - Xử lý hoàn hảo cả 3 sự kiện: `INSERT`, `UPDATE`, và `DELETE` (khi xóa review tiêu cực/spam). Sử dụng biến `OLD` và `NEW` linh hoạt, tránh hoàn toàn lỗi crash runtime.
5. **Chỉ mục tìm kiếm mờ (GIN Trigram Indexing)**:
   - Tích hợp `pg_trgm` và chỉ mục GIN trên `products.name` và `artisan_profiles.workshop_name` phục vụ tìm kiếm tiếng Việt tức thì không giật lag.
