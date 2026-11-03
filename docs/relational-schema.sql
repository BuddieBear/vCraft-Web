-- ============================================================================
-- vCraft: Digital Exhibition & B2B/B2C Commerce Platform for Craft Villages
-- Target DBMS: PostgreSQL 14+ (Tested on PostgreSQL 18.6)
-- Domain: Traditional Silk Village of Van Phuc (Hà Đông, Hà Nội)
-- Full Requirements Implementation based on Official Specification:
--   1. Dual Trade Models: B2C Retail + B2B Wholesale/Custom Manufacturing
--   2. Artisan Digital Profiles & Village Map (Leaflet GPS, Opening Hours)
--   3. Production Lifecycle & QR Traceability (5 Stages: Ươm -> Mắc -> Dệt -> Nhuộm -> Cán)
--      * Linked to both Generic Stock AND Custom B2B Order Assignments
--   4. B2B Quotation State Machine (Draft -> Sent -> Bidding -> Accepted -> Production -> Delivered)
--      * Supports Open Village Bidding & Direct Artisan Quote Requests
--   5. B2C Shopping Cart, Checkout, Retail Orders & Tracking
--   6. Reviews & Rating System for Products & Artisans (Robust INSERT/UPDATE/DELETE Trigger)
--   7. Real-time Interactive Notification System for Quotes, Bids, Orders, and News
--   8. Village Admin Management (Account Verification, Community News, Audits)
-- ============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 0. EXTENSIONS (Installed after clean schema)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- System User Roles
CREATE TYPE user_role AS ENUM (
    'ADMIN',       -- Ban quản lý xã / Hội làng nghề Vạn Phúc
    'ARTISAN',     -- Nghệ nhân / Hộ gia đình dệt lụa
    'BUYER'        -- Khách mua lẻ / Khách du lịch / Khách sỉ B2B
);

-- Artisan Verification Status (by Admin)
CREATE TYPE artisan_verification_status AS ENUM (
    'PENDING',     -- Chờ BQL xã thẩm định cơ sở
    'APPROVED',    -- Đã phê duyệt chính thức
    'REJECTED'     -- Không đủ điều kiện / phát hiện gian lận
);

-- Traditional Van Phuc Silk Weaving Techniques & Products
CREATE TYPE silk_weave_type AS ENUM (
    'LUA_VAN',          -- Lụa Vân gia truyền (hoa nổi trên nền lụa chìm)
    'LUA_GAM',          -- Gấm cung đình cổ truyền
    'LUA_SATIN',        -- Lụa Satin tơ tằm bóng mềm
    'LUA_TWILL',        -- Lụa dệt chéo
    'LUA_TO_TAM_THO',   -- Đũi / Tơ tằm thô mộc
    'PHU_KIEN_LUA'      -- Khăn quàng, cà vạt, quạt lụa, khẩu trang lụa
);

-- 5 Essential Lifecycle Stages for Van Phuc Silk Batch Tracking
CREATE TYPE silk_production_stage AS ENUM (
    'UOM_TO',       -- 1. Ươm tơ (Silkworm Cocoon Boiling & Reeling)
    'MAC_CUI',      -- 2. Mắc cửi & Lồng go (Warping & Heald setting)
    'DET_LUA',      -- 3. Dệt lụa hoa văn (Jacquard Loom Weaving)
    'NHUOM_MAU',    -- 4. Nhuộm thảo mộc tự nhiên (Herbal Natural Dyeing)
    'CAN_LANG'      -- 5. Cán láng & Kiểm định chất lượng (Finishing & KCS)
);

-- Production Batch Status
CREATE TYPE batch_status AS ENUM (
    'PLANNING',     -- Lên kế hoạch sản xuất
    'IN_PROGRESS',  -- Đang trong các công đoạn dệt/nhuộm
    'COMPLETED',    -- Hoàn thành, đã dán tem QR
    'CANCELLED'     -- Hủy bỏ
);

-- B2B Quotation Request State Machine (Khớp 100% mục 3.2 Google Doc)
CREATE TYPE quote_status AS ENUM (
    'DRAFT',                -- Khách nháp yêu cầu
    'SENT_TO_ARTISANS',     -- Đã phát hành đến các xưởng phù hợp
    'ARTISANS_BIDDING',     -- Các hộ gia đình đang vào chào giá
    'BUYER_ACCEPTED',       -- Khách hàng đã chốt hộ gia đình trúng thầu
    'IN_PRODUCTION',        -- Đang trong dây chuyền sản xuất
    'DELIVERED',            -- Đã giao hàng thành công
    'CANCELLED'             -- Khách hủy hoặc quá hạn
);

-- Artisan Bid Status
CREATE TYPE bid_status AS ENUM (
    'SUBMITTED',    -- Đã nộp hồ sơ báo giá
    'ACCEPTED',     -- Khách hàng chấp thuận
    'REJECTED',     -- Khách từ chối
    'WITHDRAWN'     -- Xưởng tự rút hồ sơ
);

-- Order Assignment Status for Multi-Artisan Splitting
CREATE TYPE assignment_status AS ENUM (
    'ASSIGNED',         -- Đã giao phần việc
    'IN_PRODUCTION',    -- Đang dệt
    'READY_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED'
);

-- B2C Retail Order Status
CREATE TYPE retail_order_status AS ENUM (
    'PENDING',      -- Chờ xác nhận
    'CONFIRMED',    -- Đã xác nhận đơn hàng
    'SHIPPING',     -- Đang vận chuyển
    'DELIVERED',    -- Giao hàng thành công
    'CANCELLED'     -- Đã hủy đơn
);

-- Payment Status
CREATE TYPE payment_status AS ENUM (
    'UNPAID',
    'PAID',
    'REFUNDED'
);

-- Payment Methods
CREATE TYPE payment_method AS ENUM (
    'COD',              -- Thanh toán khi nhận hàng
    'BANK_TRANSFER',    -- Chuyển khoản ngân hàng (VietQR)
    'VNPAY',            -- Cổng VNPAY
    'MOMO'              -- Ví MoMo
);

-- Community News Categories
CREATE TYPE news_category AS ENUM (
    'PRICE_ANNOUNCEMENT', -- Thông báo giá nguyên vật liệu tơ tằm
    'POWER_OUTAGE',       -- Lịch cắt điện luân phiên ảnh hưởng xưởng dệt
    'POLICY_SUPPORT',     -- Chính sách hỗ trợ vốn / máy móc từ nhà nước
    'FESTIVAL_EVENT'      -- Tuần lễ Văn hóa Du lịch Lụa Vạn Phúc
);

-- Review Target Types
CREATE TYPE review_target_type AS ENUM (
    'PRODUCT',      -- Đánh giá sản phẩm
    'ARTISAN'       -- Đánh giá hồ sơ xưởng nghệ nhân
);

-- Notification Types (Hệ thống thông báo thời gian thực)
CREATE TYPE notification_type AS ENUM (
    'SYSTEM',           -- Thông báo từ BQL / Hệ thống
    'QUOTE_REQUEST',    -- Có yêu cầu báo giá mới gửi đến xưởng
    'BID_RECEIVED',     -- Có nghệ nhân chào giá cho yêu cầu của bạn
    'BID_ACCEPTED',     -- Báo giá của bạn đã được khách hàng chốt thầu
    'ORDER_STATUS',     -- Đơn hàng đổi trạng thái (đang giao, hoàn thành)
    'COMMUNITY_NEWS'    -- Có bản tin mới từ Ban quản lý làng nghề
);

-- ============================================================================
-- 2. CORE IDENTITY & USER MANAGEMENT
-- ============================================================================

-- Table 1: users (Tài khoản hệ thống: Admin, Nghệ nhân, Khách hàng)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'BUYER',
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Table 2: artisan_profiles (Hồ sơ xưởng, bản đồ Leaflet, giờ mở cửa)
CREATE TABLE artisan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    workshop_name VARCHAR(200) NOT NULL,
    artisan_title VARCHAR(150), -- Nghệ nhân Ưu tú, Nghệ nhân Bàn tay vàng
    family_history TEXT,        -- Lịch sử gia đình, câu chuyện làm nghề
    experience_years SMALLINT CHECK (experience_years >= 0),
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,  -- GPS Leaflet
    longitude DECIMAL(10, 7) NOT NULL, -- GPS Leaflet
    opening_hours VARCHAR(100) NOT NULL DEFAULT '08:00 - 18:00 (Hàng ngày)',
    is_open_for_visitors BOOLEAN NOT NULL DEFAULT TRUE,
    cover_image_url VARCHAR(500),
    gallery_images TEXT[] DEFAULT '{}',
    verification_status artisan_verification_status NOT NULL DEFAULT 'PENDING',
    verified_at TIMESTAMPTZ,
    average_rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00 CHECK (average_rating >= 1.00 AND average_rating <= 5.00),
    total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_artisan_profiles_map ON artisan_profiles(latitude, longitude) WHERE is_open_for_visitors = TRUE;
CREATE INDEX idx_artisan_profiles_status ON artisan_profiles(verification_status);
CREATE INDEX idx_artisan_name_search ON artisan_profiles USING gin (workshop_name gin_trgm_ops);

-- Table 3: artisan_certificates (Giấy khen, chứng nhận OCOP, Di sản văn hóa phi vật thể)
CREATE TABLE artisan_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    issuing_authority VARCHAR(200) NOT NULL,
    issued_year SMALLINT NOT NULL,
    certificate_image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_certificates_artisan ON artisan_certificates(artisan_id);

-- ============================================================================
-- 3. DIGITAL EXHIBITION & PRODUCTS (B2C & B2B)
-- ============================================================================

-- Table 4: categories (Phân loại sản phẩm làng nghề)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: products (Sản phẩm lụa: triển lãm, giá niêm yết, tồn kho bán lẻ)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    weave_type silk_weave_type NOT NULL DEFAULT 'LUA_VAN',
    raw_material VARCHAR(150) NOT NULL DEFAULT '100% Tơ tằm tự nhiên Bảo Lộc / Vạn Phúc',
    description TEXT,
    cultural_story TEXT, -- Câu chuyện văn hóa / họa tiết cổ truyền
    price DECIMAL(12, 2) NOT NULL CHECK (price >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    media_urls TEXT[] NOT NULL DEFAULT '{}', -- Danh sách ảnh đã nén/resize
    is_unique_piece BOOLEAN NOT NULL DEFAULT FALSE, -- Sản phẩm độc bản
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    average_rating DECIMAL(3, 2) NOT NULL DEFAULT 5.00 CHECK (average_rating >= 1.00 AND average_rating <= 5.00),
    total_reviews INTEGER NOT NULL DEFAULT 0 CHECK (total_reviews >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_artisan ON products(artisan_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_published ON products(is_published) WHERE is_published = TRUE;
CREATE INDEX idx_products_name_search ON products USING gin (name gin_trgm_ops);

-- ============================================================================
-- 4. B2B WHOLESALE & QUOTATION STATE MACHINE (CHỦ YẾU)
-- (Tạo trước để product_batches có thể tham chiếu đến order_assignments)
-- ============================================================================

-- Table 6: quotation_requests (Yêu cầu báo giá đơn hàng sỉ B2B)
CREATE TABLE quotation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_artisan_id UUID REFERENCES artisan_profiles(id) ON DELETE SET NULL, -- NULL = Mở thầu công khai cho toàn làng; NOT NULL = Gửi riêng xưởng
    title VARCHAR(255) NOT NULL,
    specifications TEXT NOT NULL,       -- Kích thước, hoa văn, chất liệu tơ tằm, logo
    target_quantity INTEGER NOT NULL CHECK (target_quantity > 0),
    max_budget DECIMAL(14, 2) CHECK (max_budget IS NULL OR max_budget > 0),
    preferred_weave_type silk_weave_type NOT NULL DEFAULT 'LUA_VAN',
    deadline DATE NOT NULL,
    attachment_urls TEXT[] DEFAULT '{}',
    status quote_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quotes_buyer ON quotation_requests(buyer_id);
CREATE INDEX idx_quotes_target_artisan ON quotation_requests(target_artisan_id);
CREATE INDEX idx_quotes_status ON quotation_requests(status);
CREATE INDEX idx_quotes_deadline ON quotation_requests(deadline);

-- Table 7: bids (Chào giá / Đấu thầu của từng hộ dệt)
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
    proposed_price DECIMAL(12, 2) NOT NULL CHECK (proposed_price > 0),
    proposed_completion_days INTEGER NOT NULL CHECK (proposed_completion_days > 0),
    note TEXT,
    sample_images TEXT[] DEFAULT '{}',
    status bid_status NOT NULL DEFAULT 'SUBMITTED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_artisan_bid UNIQUE (quotation_request_id, artisan_id)
);

CREATE INDEX idx_bids_quote ON bids(quotation_request_id);
CREATE INDEX idx_bids_artisan ON bids(artisan_id);

-- Table 8: order_assignments (Điều phối phân bổ sản xuất B2B cho nhiều hộ)
CREATE TABLE order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE RESTRICT,
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
    bid_id UUID NOT NULL UNIQUE REFERENCES bids(id) ON DELETE RESTRICT,
    allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity > 0),
    agreed_price DECIMAL(12, 2) NOT NULL CHECK (agreed_price > 0),
    status assignment_status NOT NULL DEFAULT 'ASSIGNED',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_quote ON order_assignments(quotation_request_id);
CREATE INDEX idx_assignments_artisan ON order_assignments(artisan_id);

-- ============================================================================
-- 5. QR TRACEABILITY & 5-STAGE LIFECYCLE TIMELINE
-- (Liên kết được cả với Sản phẩm Bán lẻ LẪN Đơn hàng sỉ B2B)
-- ============================================================================

-- Table 9: product_batches (Lô sản xuất gắn mã QR)
CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    order_assignment_id UUID REFERENCES order_assignments(id) ON DELETE SET NULL, -- NULL: Lô sản xuất kho bán lẻ; NOT NULL: Lô sản xuất theo đơn đặt hàng B2B
    batch_code VARCHAR(50) NOT NULL UNIQUE, -- VD: VP-2026-LV-001
    qr_code_url VARCHAR(500) NOT NULL,      -- URL trang landing truy xuất
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at DATE,
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    status batch_status NOT NULL DEFAULT 'IN_PROGRESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_batches_product ON product_batches(product_id);
CREATE INDEX idx_batches_assignment ON product_batches(order_assignment_id);
CREATE INDEX idx_batches_code ON product_batches(batch_code);

-- Table 10: batch_logs (Nhật ký 5 mốc vòng đời sản phẩm có hình ảnh minh chứng)
CREATE TABLE batch_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
    stage silk_production_stage NOT NULL,
    stage_title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    evidence_image_urls TEXT[] NOT NULL DEFAULT '{}',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    step_order INTEGER NOT NULL CHECK (step_order >= 1 AND step_order <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_batch_stage ON batch_logs(batch_id, stage);
CREATE INDEX idx_batch_logs_order ON batch_logs(batch_id, step_order ASC);

-- ============================================================================
-- 6. B2C RETAIL COMMERCE (GIỎ HÀNG, ĐƠN HÀNG LẺ)
-- ============================================================================

-- Table 11: cart_items (Giỏ hàng của người dùng)
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_product_cart UNIQUE (user_id, product_id)
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id);

-- Table 12: retail_orders (Đơn hàng bán lẻ B2C)
CREATE TABLE retail_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code VARCHAR(30) NOT NULL UNIQUE, -- VD: ORD-202611-0001
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recipient_name VARCHAR(120) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_note TEXT,
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method payment_method NOT NULL DEFAULT 'COD',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    status retail_order_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_retail_orders_buyer ON retail_orders(buyer_id);
CREATE INDEX idx_retail_orders_status ON retail_orders(status);
CREATE INDEX idx_retail_orders_created ON retail_orders(created_at DESC);

-- Table 13: retail_order_items (Chi tiết món hàng trong đơn bán lẻ)
CREATE TABLE retail_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_retail_order_items_order ON retail_order_items(order_id);
CREATE INDEX idx_retail_order_items_artisan ON retail_order_items(artisan_id);

-- ============================================================================
-- 7. REVIEWS, RATINGS & FEEDBACK
-- ============================================================================

-- Table 14: reviews (Đánh giá sản phẩm và xưởng nghệ nhân sau khi mua/chốt đơn)
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type review_target_type NOT NULL DEFAULT 'PRODUCT',
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
    retail_order_id UUID REFERENCES retail_orders(id) ON DELETE SET NULL,
    quotation_request_id UUID REFERENCES quotation_requests(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_target CHECK (
        (target_type = 'PRODUCT' AND product_id IS NOT NULL) OR
        (target_type = 'ARTISAN')
    )
);

CREATE INDEX idx_reviews_product ON reviews(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_reviews_artisan ON reviews(artisan_id);
CREATE INDEX idx_reviews_buyer ON reviews(buyer_id);

-- ============================================================================
-- 8. NOTIFICATIONS, COMMUNITY NEWS & AUDIT TRAILS (ADMIN/SYSTEM)
-- ============================================================================

-- Table 15: notifications (Hệ thống thông báo thời gian thực)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'SYSTEM',
    link_url VARCHAR(500),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Table 16: community_news (Bản tin làng nghề: giá nguyên liệu, cúp điện, hỗ trợ)
CREATE TABLE community_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    category news_category NOT NULL,
    content TEXT NOT NULL,
    thumbnail_url VARCHAR(500),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_category ON community_news(category);
CREATE INDEX idx_news_pinned ON community_news(is_pinned, published_at DESC);

-- Table 17: audit_logs (Ghi vết kiểm tra của hệ thống, BQL duyệt hộ, đổi trạng thái)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    target_record_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 9. TRIGGERS & BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- Automatic updated_at Trigger Function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'users', 'artisan_profiles', 'products', 'product_batches',
            'cart_items', 'retail_orders', 'quotation_requests', 'bids',
            'order_assignments', 'reviews', 'community_news'
          )
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_timestamp ON %I;', tbl);
        EXECUTE format('CREATE TRIGGER trg_set_timestamp BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();', tbl);
    END LOOP;
END $$;

-- Automatic Average Rating Calculation Trigger Function (Handles INSERT, UPDATE, and DELETE)
CREATE OR REPLACE FUNCTION trigger_update_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_artisan_id UUID;
    v_product_id UUID;
BEGIN
    -- Determine target IDs depending on operation (INSERT, UPDATE, DELETE)
    IF TG_OP = 'DELETE' THEN
        v_artisan_id := OLD.artisan_id;
        v_product_id := OLD.product_id;
    ELSE
        v_artisan_id := NEW.artisan_id;
        v_product_id := NEW.product_id;
    END IF;

    -- Update Artisan Profile Rating Stats
    UPDATE artisan_profiles
    SET average_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews
            WHERE artisan_id = v_artisan_id
        ), 5.00),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE artisan_id = v_artisan_id
        )
    WHERE id = v_artisan_id;

    -- Update Product Rating Stats if review was for a product
    IF v_product_id IS NOT NULL THEN
        UPDATE products
        SET average_rating = COALESCE((
                SELECT ROUND(AVG(rating)::numeric, 2)
                FROM reviews
                WHERE product_id = v_product_id
            ), 5.00),
            total_reviews = (
                SELECT COUNT(*)
                FROM reviews
                WHERE product_id = v_product_id
            )
        WHERE id = v_product_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_rating ON reviews;
CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION trigger_update_rating_stats();

-- ============================================================================
-- 10. REALISTIC SEED DATA (LÀNG LỤA TƠ TẰM VẠN PHÚC)
-- ============================================================================

-- 1. USERS
INSERT INTO users (id, email, password_hash, full_name, phone, role)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin.vanphuc@hanoi.gov.vn', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashadmin', 'Ông Đỗ Quang Vinh (Chủ tịch BQL Làng Nghề)', '02433824123', 'ADMIN'),
    ('00000000-0000-0000-0000-000000000002', 'trieuvanmao@vanphucsilk.vn', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashartisan1', 'Nghệ nhân Triệu Văn Mão', '0912345678', 'ARTISAN'),
    ('00000000-0000-0000-0000-000000000003', 'dovanxuyen@vanphucsilk.vn', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashartisan2', 'Nghệ nhân Đỗ Văn Hiển', '0987654321', 'ARTISAN'),
    ('00000000-0000-0000-0000-000000000004', 'donghuong@vanphucsilk.vn', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashartisan3', 'Hộ dệt lụa Đông Hương', '0903456789', 'ARTISAN'),
    ('00000000-0000-0000-0000-000000000005', 'nguyenvana@uet.vnu.edu.vn', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashbuyer1', 'Nguyễn Văn An (Đoàn trường ĐH Công Nghệ - ĐHQGHN)', '0977112233', 'BUYER'),
    ('00000000-0000-0000-0000-000000000006', 'tourist.elena@gmail.com', '$2b$12$K8yR2u/V.WnFv9hVzU1B..samplehashbuyer2', 'Elena Rostova (Du khách Pháp)', '0945998877', 'BUYER')
ON CONFLICT (email) DO NOTHING;

-- 2. ARTISAN PROFILES
INSERT INTO artisan_profiles (id, user_id, workshop_name, artisan_title, family_history, experience_years, address, latitude, longitude, opening_hours, is_open_for_visitors, verification_status, cover_image_url)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Xưởng Lụa Triệu Văn Mão', 'Nghệ nhân Ưu tú Bàn tay vàng', 'Gia tộc có 5 đời gắn bó với nghề dệt lụa Vân cổ truyền Vạn Phúc. Từng dệt lụa dâng triều đình phong kiến và may lễ phục cấp quốc gia.', 52, 'Số 28 Phố Lụa, Phường Vạn Phúc, Quận Hà Đông, Hà Nội', 20.9782500, 105.7723100, '07:30 - 18:30 (Hàng ngày)', TRUE, 'APPROVED', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', 'Cơ sở Dệt Lụa Đỗ Văn Hiển', 'Nghệ nhân Làng nghề Hà Nội', 'Tiên phong kết hợp hoa văn truyền thống với sắc màu nhuộm tự nhiên từ củ nâu, lá bàng và hoa hòe.', 35, 'Số 45 Ngõ Cổng Đông, Làng Vạn Phúc, Hà Đông, Hà Nội', 20.9778900, 105.7731200, '08:00 - 17:30 (Thứ 2 - Thứ 7)', TRUE, 'APPROVED', 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=1200'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004', 'Hợp tác xã Lụa Đông Hương', 'Nghệ nhân Dân gian', 'Chuyên các dòng lụa tơ tằm thô mộc, khăn choàng lụa tơ tằm tự nhiên được dệt thủ công 100% bằng khung cửi gỗ cổ.', 28, 'Số 12 Phố Cầu Am, Vạn Phúc, Hà Đông, Hà Nội', 20.9769800, 105.7745000, '08:00 - 20:00 (Hàng ngày)', TRUE, 'APPROVED', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=1200')
ON CONFLICT (id) DO NOTHING;

-- 3. CERTIFICATES
INSERT INTO artisan_certificates (id, artisan_id, title, issuing_authority, issued_year, certificate_image_url)
VALUES
    ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Chứng nhận Sản phẩm OCOP 5 Sao Quốc Gia - Lụa Vân Vạn Phúc', 'Bộ Nông Nghiệp & Phát Triển Nông Thôn', 2023, 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'),
    ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Bằng khen Di sản Văn hóa Phi vật thể Nghề Dệt Lụa', 'UBND Thành Phố Hà Nội', 2021, 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800')
ON CONFLICT (id) DO NOTHING;

-- 4. CATEGORIES
INSERT INTO categories (id, name, slug, description, thumbnail_url)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'Lụa Vân Gia Truyền', 'lua-van-gia-truyen', 'Đỉnh cao kỹ thuật dệt lụa Vạn Phúc với hoa văn nổi ẩn hiện tinh tế trên nền lụa tơ tằm nguyên chất.', 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600'),
    ('20000000-0000-0000-0000-000000000002', 'Khăn Quàng & Phụ Kiện Lụa', 'khan-quang-phu-kien-lua', 'Khăn lụa tơ tằm tự nhiên vẽ tay nghệ thuật, khăn thêu tay thủ công truyền thống.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600'),
    ('20000000-0000-0000-0000-000000000003', 'Gấm Lụa Cung Đình', 'gam-lua-cung-dinh', 'Dòng gấm tơ tằm dệt dày dặn với sắc màu quý phái, dùng may lễ phục và áo dài cao cấp.', 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=600')
ON CONFLICT (id) DO NOTHING;

-- 5. PRODUCTS (BÁN LẺ & TRƯNG BÀY)
INSERT INTO products (id, artisan_id, category_id, name, slug, weave_type, raw_material, description, cultural_story, price, stock_quantity, media_urls, is_unique_piece, is_published)
VALUES
    ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Lụa Vân Cánh Bướm Hoàng Cung', 'lua-van-canh-buom-hoang-cung', 'LUA_VAN', '100% Sợi tơ tằm vàng tự nhiên', 'Vải lụa Vân với họa tiết cánh bướm chìm nổi tinh xảo, bề mặt mềm mịn, mát vào mùa hè và ấm vào mùa đông.', 'Họa tiết cánh bướm là biểu tượng của sự hồi sinh và thanh thoát, từng được các quý phi thời Nguyễn rất ưa chuộng.', 850000.00, 150, ARRAY['https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800', 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800'], FALSE, TRUE),
    ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Khăn Lụa Tơ Tằm Nhuộm Thảo Mộc Củ Nâu', 'khan-lua-to-tam-nhuom-thao-moc-cu-nau', 'PHU_KIEN_LUA', 'Tơ tằm tự nhiên 100%, thuốc nhuộm từ củ nâu rừng và bùn non', 'Khăn lụa kích thước 70x180cm, nhuộm thủ công 20 nước màu củ nâu tạo sắc nâu trầm cổ kính, an toàn cho da nhạy cảm.', 'Củ nâu là vị thuốc dân gian, khi ngâm với bùn sông Đáy sẽ tạo nên màu nâu hổ phách độc nhất vô nhị chỉ có tại làng Vạn Phúc.', 450000.00, 80, ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'], FALSE, TRUE),
    ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Áo Dài Gấm Tơ Tằm Phượng Hoàng Cổ Điển', 'ao-dai-gam-to-tam-phuong-hoang-co-dien', 'LUA_GAM', 'Tơ tằm cao cấp phối chỉ kim tuyến tự nhiên', 'Tác phẩm độc bản dệt hoa văn chim phượng hoàng, cắt may thủ công dành cho sự kiện ngoại giao cấp nhà nước.', 'Phượng hoàng là linh vật biểu trưng cho đức hạnh và thịnh vượng, được tái hiện lại từ nguyên mẫu y phục hoàng tộc triều Lê.', 5200000.00, 5, ARRAY['https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800'], TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. B2B QUOTATION REQUESTS & BIDDING (CHỦ YẾU)
INSERT INTO quotation_requests (id, buyer_id, target_artisan_id, title, specifications, target_quantity, max_budget, preferred_weave_type, deadline, status)
VALUES
    ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', NULL, 'Đặt 2.000 Khăn Lụa Tơ Tằm In Logo Lễ Kỷ Niệm 20 Năm Thành Lập ĐHQGHN', 'Kích thước khăn: 70cm x 180cm. Chất liệu: Lụa tơ tằm mềm mại. Kỹ thuật: In lụa thủ công logo Trường ĐH Công Nghệ và thông điệp kỷ niệm. Đóng hộp quà tặng cao cấp.', 2000, 700000000.00, 'LUA_VAN', '2026-12-15', 'ARTISANS_BIDDING')
ON CONFLICT (id) DO NOTHING;

INSERT INTO bids (id, quotation_request_id, artisan_id, proposed_price, proposed_completion_days, note, status)
VALUES
    ('71000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 320000.00, 25, 'Xưởng Triệu Văn Mão cam kết dệt lụa tơ tằm chuẩn OCOP 5 sao, in logo ép nhiệt cao cấp sắc nét, hỗ trợ đóng hộp sang trọng.', 'ACCEPTED'),
    ('71000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 310000.00, 28, 'Cơ sở Đỗ Văn Hiển đề xuất màu nhuộm tự nhiên nhã nhặn, tiến độ đáp ứng tốt cho đơn hàng 2000 chiếc.', 'SUBMITTED')
ON CONFLICT (id) DO NOTHING;

-- Phân bổ đơn hàng B2B (Multi-artisan assignment)
INSERT INTO order_assignments (id, quotation_request_id, artisan_id, bid_id, allocated_quantity, agreed_price, status)
VALUES
    ('72000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 2000, 320000.00, 'ASSIGNED')
ON CONFLICT (id) DO NOTHING;

-- 7. PRODUCT BATCHES & 5-STAGE LOGS (TRUY XUẤT QR)
-- Lô này gắn trực tiếp với Order Assignment của đơn sỉ B2B trên!
INSERT INTO product_batches (id, product_id, order_assignment_id, batch_code, qr_code_url, started_at, completed_at, total_quantity, status)
VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'VP-2026-LV-001', 'https://vcraft.vn/trace/VP-2026-LV-001', '2026-09-01', '2026-10-15', 500, 'COMPLETED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO batch_logs (id, batch_id, stage, stage_title, description, evidence_image_urls, logged_at, step_order)
VALUES
    ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'UOM_TO', 'Ươm tơ tằm nguyên liệu', 'Tuyển chọn kén tằm vàng giống tốt từ vùng trồng dâu nuôi tằm, đảo kén trong nước sôi 80°C để rút sợi tơ tằm nguyên chất đồng đều.', ARRAY['https://images.unsplash.com/photo-1544816155-12df9643f363?w=800'], '2026-09-02 08:30:00+07', 1),
    ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'MAC_CUI', 'Mắc cửi & So tơ vào go dệt', 'Nghệ nhân dùng đôi mắt tinh tường luồn từng sợi tơ vào khổ go 1.15m với mật độ sợi dọc đạt chuẩn 3.600 sợi/mét.', ARRAY['https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800'], '2026-09-12 14:00:00+07', 2),
    ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 'DET_LUA', 'Dệt lụa hoa văn cánh bướm trên khung gỗ', 'Dệt thủ công kết hợp con thoi bay truyền thống, mỗi ngày nghệ nhân dệt tỉ mỉ khoảng 4 - 5 mét lụa hoa văn nổi chìm.', ARRAY['https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800'], '2026-09-28 10:15:00+07', 3),
    ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', 'NHUOM_MAU', 'Nhuộm màu thảo mộc tự nhiên', 'Nấu nước lá sen và củ nâu thảo dược tự nhiên, ngâm hấp nhiệt lụa trong 48 tiếng để sợi ngậm màu vĩnh cửu không phai.', ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'], '2026-10-08 16:45:00+07', 4),
    ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', 'CAN_LANG', 'Cán láng & Kiểm định chất lượng KCS', 'Cán láng bằng con lăn gỗ sồi cổ để bề mặt lụa đạt độ óng ả tuyệt mỹ, dán tem QR truy xuất nguồn gốc từng mét lụa.', ARRAY['https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800'], '2026-10-15 11:00:00+07', 5)
ON CONFLICT (id) DO NOTHING;

-- 8. B2C RETAIL: CART & SAMPLE ORDERS
INSERT INTO cart_items (id, user_id, product_id, quantity)
VALUES
    ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO retail_orders (id, order_code, buyer_id, recipient_name, recipient_phone, shipping_address, shipping_note, total_amount, payment_method, payment_status, status)
VALUES
    ('61000000-0000-0000-0000-000000000001', 'ORD-202611-0001', '00000000-0000-0000-0000-000000000006', 'Elena Rostova', '0945998877', 'Khách sạn Metropole Hà Nội, 15 Ngô Quyền, Hoàn Kiếm, Hà Nội', 'Giao trong giờ hành chính trước 17h', 900000.00, 'BANK_TRANSFER', 'PAID', 'DELIVERED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO retail_order_items (id, order_id, product_id, artisan_id, quantity, unit_price, subtotal)
VALUES
    ('62000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 2, 450000.00, 900000.00)
ON CONFLICT (id) DO NOTHING;

-- 9. REVIEWS & RATINGS
INSERT INTO reviews (id, buyer_id, target_type, product_id, artisan_id, retail_order_id, rating, comment, is_verified_purchase)
VALUES
    ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'PRODUCT', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', 5, 'Khăn lụa củ nâu rất thơm mùi thảo mộc thiên nhiên, sờ vào mềm mát và óng ả. Xưởng giao hàng rất nhanh và đóng gói chu đáo!', TRUE),
    ('80000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'ARTISAN', NULL, '10000000-0000-0000-0000-000000000002', '61000000-0000-0000-0000-000000000001', 5, 'Tôi đã ghé xưởng nghệ nhân Đỗ Văn Hiển tham quan khi đến Hà Nội. Nghệ nhân cực kỳ nhiệt tình giảng giải từng công đoạn dệt và ngâm màu.', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10. NOTIFICATIONS
INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read)
VALUES
    ('85000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Có yêu cầu báo giá mới', 'Khách hàng Nguyễn Văn An vừa gửi yêu cầu báo giá 2.000 khăn lụa tơ tằm thêu logo ĐHQGHN.', 'QUOTE_REQUEST', '/quotes/70000000-0000-0000-0000-000000000001', FALSE),
    ('85000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', 'Nghệ nhân đã chào giá', 'Nghệ nhân Triệu Văn Mão đã gửi hồ sơ chào giá 320.000đ/chiếc cho yêu cầu của bạn.', 'BID_RECEIVED', '/quotes/70000000-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. COMMUNITY NEWS (BQL XÃ)
INSERT INTO community_news (id, author_admin_id, title, slug, category, content, thumbnail_url, is_pinned)
VALUES
    ('90000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Thông báo Lịch Điều tiết Điện Lưới phục vụ các Tổ máy dệt tháng 11/2026', 'thong-bao-lich-dieu-tiet-dien-thang-11-2026', 'POWER_OUTAGE', 'Điện lực Hà Đông xin thông báo: Ưu tiên cấp điện liên tục 24/7 cho các tuyến đường dệt lụa chính (Phố Lụa, Ngõ Cổng Đông) để các xưởng kịp hoàn thành các đơn hàng xuất khẩu cuối năm.', 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800', TRUE),
    ('90000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Bình ổn giá tơ tằm nguyên liệu vụ Đông 2026 cho các hộ dệt Vạn Phúc', 'binh-on-gia-to-tam-nguyen-lieu-vu-dong-2026', 'PRICE_ANNOUNCEMENT', 'Hiệp hội Làng nghề đã ký thỏa thuận cung ứng 50 tấn tơ tằm tự nhiên Bảo Lộc với mức giá ưu đãi giảm 8% cho các hộ có chứng nhận OCOP.', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA DDL & SEED SCRIPT
-- ============================================================================
