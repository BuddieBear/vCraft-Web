-- =============================================================================
-- vCraft Database Schema for MySQL 8.0+
-- Topic: Nền tảng Triển lãm số & Điều phối đơn sỉ Làng lụa tơ tằm Vạn Phúc, Hà Đông
-- Character Set: utf8mb4, Collation: utf8mb4_unicode_ci
-- =============================================================================

CREATE DATABASE IF NOT EXISTS vcraft_db 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE vcraft_db;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Tắt kiểm tra khóa ngoại tạm thời để khởi tạo/reset sạch sẽ
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS community_news;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS quote_requests;
DROP TABLE IF EXISTS log_images;
DROP TABLE IF EXISTS batch_production_logs;
DROP TABLE IF EXISTS product_batches;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TABLE IF EXISTS artisan_profiles;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- 1. BẢNG USERS (Tài khoản người dùng toàn hệ thống)
-- =============================================================================
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role ENUM('ADMIN', 'ARTISAN', 'BUYER') NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  avatar_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. BẢNG ARTISAN_PROFILES (Hồ sơ xưởng dệt lụa Vạn Phúc)
-- =============================================================================
CREATE TABLE artisan_profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL UNIQUE,
  workshop_name VARCHAR(255) NOT NULL,
  artisan_title VARCHAR(150) NULL,
  family_history TEXT NULL,
  description TEXT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  open_for_visit BOOLEAN NOT NULL DEFAULT FALSE,
  visit_schedule JSON NULL,
  certifications JSON NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_artisan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_artisan_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT ck_artisan_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  INDEX idx_artisan_map (open_for_visit, status, workshop_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. BẢNG PRODUCT_CATEGORIES (Danh mục phân loại lụa)
-- =============================================================================
CREATE TABLE product_categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  cover_image_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. BẢNG PRODUCTS (Sản phẩm lụa thủ công)
-- =============================================================================
CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  artisan_id VARCHAR(36) NOT NULL,
  category_id VARCHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  reference_price DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  silk_weave_type VARCHAR(150) NULL,
  dimensions VARCHAR(100) NULL,
  material VARCHAR(150) DEFAULT '100% Tơ tằm tự nhiên Vạn Phúc',
  care_instructions TEXT NULL,
  status ENUM('DRAFT', 'PUBLISHED', 'HIDDEN') NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_artisan FOREIGN KEY (artisan_id) REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_product_category FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  CONSTRAINT ck_product_price CHECK (reference_price >= 0),
  INDEX idx_products_listing (status, category_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. BẢNG PRODUCT_IMAGES (Thư viện hình ảnh sản phẩm)
-- =============================================================================
CREATE TABLE product_images (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id VARCHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_order (product_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. BẢNG PRODUCT_BATCHES (Lô sản xuất lụa & Mã QR) - Yêu cầu 4.1
-- =============================================================================
CREATE TABLE product_batches (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  product_id VARCHAR(36) NOT NULL,
  artisan_id VARCHAR(36) NOT NULL,
  batch_code VARCHAR(100) NOT NULL UNIQUE,
  trace_token VARCHAR(36) NOT NULL UNIQUE DEFAULT (UUID()),
  qr_code_url TEXT NULL,
  quantity INT NOT NULL DEFAULT 1,
  production_date DATE NOT NULL,
  status ENUM('IN_PROGRESS', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_batches_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT fk_batches_artisan FOREIGN KEY (artisan_id) REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT ck_batch_quantity CHECK (quantity > 0),
  INDEX idx_batches_product (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. BẢNG BATCH_PRODUCTION_LOGS (Nhật ký 5 công đoạn dệt lụa Vạn Phúc)
-- =============================================================================
CREATE TABLE batch_production_logs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  batch_id VARCHAR(36) NOT NULL,
  stage_name ENUM('UOM_TO', 'MAC_CUI', 'DET_LUA', 'NHUOM_MAU', 'CAN_LANG') NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  occurred_at DATETIME NOT NULL,
  step_number INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_batch FOREIGN KEY (batch_id) REFERENCES product_batches(id) ON DELETE CASCADE,
  CONSTRAINT uq_batch_step UNIQUE (batch_id, step_number),
  CONSTRAINT ck_log_step CHECK (step_number BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. BẢNG LOG_IMAGES (Ảnh chứng minh từng bước làm lụa)
-- =============================================================================
CREATE TABLE log_images (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  log_id VARCHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_images_log FOREIGN KEY (log_id) REFERENCES batch_production_logs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. BẢNG QUOTE_REQUESTS (Yêu cầu báo giá đơn hàng mua sỉ) - Yêu cầu 4.2
-- =============================================================================
CREATE TABLE quote_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  buyer_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  quantity INT NOT NULL,
  bidding_deadline DATETIME NOT NULL,
  expected_delivery DATETIME NOT NULL,
  delivery_address TEXT NOT NULL,
  custom_requirements TEXT NULL,
  status ENUM('DRAFT', 'OPEN_FOR_BIDDING', 'BUYER_ACCEPTED', 'IN_PRODUCTION', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'OPEN_FOR_BIDDING',
  accepted_quote_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quote_req_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT ck_quote_req_qty CHECK (quantity >= 5),
  CONSTRAINT ck_quote_req_dates CHECK (expected_delivery >= bidding_deadline),
  INDEX idx_quote_req_buyer (buyer_id, created_at),
  INDEX idx_quote_req_status (status, bidding_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. BẢNG QUOTES (Bản chào giá / Đấu thầu của các xưởng dệt)
-- =============================================================================
CREATE TABLE quotes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  request_id VARCHAR(36) NOT NULL,
  artisan_id VARCHAR(36) NOT NULL,
  unit_price DECIMAL(14, 2) NOT NULL,
  total_amount DECIMAL(14, 2) NOT NULL,
  estimated_days INT NOT NULL,
  note TEXT NULL,
  status ENUM('SUBMITTED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') NOT NULL DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quotes_request FOREIGN KEY (request_id) REFERENCES quote_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_quotes_artisan FOREIGN KEY (artisan_id) REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT ck_quote_unit_price CHECK (unit_price > 0),
  CONSTRAINT ck_quote_total CHECK (total_amount > 0),
  CONSTRAINT ck_quote_days CHECK (estimated_days > 0),
  CONSTRAINT uq_request_artisan UNIQUE (request_id, artisan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Khóa ngoại từ quote_requests sang quotes cho báo giá được chọn
ALTER TABLE quote_requests
  ADD CONSTRAINT fk_quote_req_accepted_quote
  FOREIGN KEY (accepted_quote_id) REFERENCES quotes(id) ON DELETE RESTRICT;

-- =============================================================================
-- 11. BẢNG ORDERS (Hợp đồng / Đơn hàng sau khi chốt báo giá)
-- =============================================================================
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  request_id VARCHAR(36) NOT NULL UNIQUE,
  quote_id VARCHAR(36) NOT NULL UNIQUE,
  buyer_id VARCHAR(36) NOT NULL,
  artisan_id VARCHAR(36) NOT NULL,
  final_amount DECIMAL(14, 2) NOT NULL,
  deposit_amount DECIMAL(14, 2) DEFAULT 0.00,
  status ENUM('CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'COMPLETED', 'DISPUTED') NOT NULL DEFAULT 'CONFIRMED',
  started_at DATETIME NULL,
  delivered_at DATETIME NULL,
  received_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_request FOREIGN KEY (request_id) REFERENCES quote_requests(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_quote FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_artisan FOREIGN KEY (artisan_id) REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
  CONSTRAINT ck_orders_amount CHECK (final_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. BẢNG COMMUNITY_NEWS (Bản tin Ban Quản lý làng nghề)
-- =============================================================================
CREATE TABLE community_news (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  author_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category ENUM('MATERIAL_PRICE', 'POWER_OUTAGE', 'POLICY', 'EVENT_FESTIVAL') NOT NULL,
  cover_image_url TEXT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'PUBLISHED',
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_news_category (category, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. BẢNG NOTIFICATIONS (Hệ thống thông báo đẩy & trong ứng dụng)
-- =============================================================================
CREATE TABLE notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_url TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU (SEED DATA LÀNG LỤA VẠN PHÚC)
-- Mật khẩu mặc định: Password123@ (Hash $2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW)
-- =============================================================================

INSERT INTO users (id, email, password_hash, role, status, full_name, phone)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@vcraft.vn', '$2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW', 'ADMIN', 'ACTIVE', 'Ban Quản Lý Làng Lụa Vạn Phúc', '0912345678'),
  ('22222222-2222-2222-2222-222222222221', 'trieuvanmao@vanphuc.vn', '$2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW', 'ARTISAN', 'ACTIVE', 'Nghệ nhân Triệu Văn Mão', '0961029298'),
  ('22222222-2222-2222-2222-222222222222', 'dovanhien@vanphuc.vn', '$2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW', 'ARTISAN', 'ACTIVE', 'Nghệ nhân Đỗ Văn Hiển', '0987654321'),
  ('22222222-2222-2222-2222-222222222223', 'donghuong@vanphuc.vn', '$2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW', 'ARTISAN', 'ACTIVE', 'Xưởng Lụa Đông Hương', '0901234567'),
  ('33333333-3333-3333-3333-333333333333', 'buyer@uet.vnu.edu.vn', '$2a$10$wE0vA9sPfxu.QY2h8u9PaeY9rXyYf4oV3X2H8fK6y3B4gZ.sL7yqW', 'BUYER', 'ACTIVE', 'Phòng Hợp tác & Phát triển ĐHQGHN', '02437547461');

INSERT INTO artisan_profiles (id, user_id, workshop_name, artisan_title, family_history, description, address, latitude, longitude, open_for_visit, visit_schedule, certifications, status)
VALUES
  (
    'a1111111-aaaa-1111-aaaa-111111111111',
    '22222222-2222-2222-2222-222222222221',
    'Cơ sở Lụa Triệu Văn Mão',
    'Nghệ nhân Ưu tú',
    'Gia đình 4 đời gìn giữ nghề dệt lụa tơ tằm cổ truyền Vạn Phúc. Là xưởng đầu tiên phục dựng thành công dòng Lụa Vân cung đình thất truyền.',
    'Chuyên sản xuất Lụa Vân hoa cúc, song hạc, thọ mai bằng tơ tằm 100% dệt thủ công trên khung cửi truyền thống.',
    'Số 10 Phố Lụa, Phường Vạn Phúc, Quận Hà Đông, Hà Nội',
    20.9768200,
    105.7758100,
    TRUE,
    '{"monday_to_sunday": "08:00 - 18:00", "tour_experience": "Trải nghiệm quay tơ dệt vải trực tiếp"}',
    '["OCOP 5 Sao", "Di sản Văn hóa Phi vật thể Quốc gia"]',
    'APPROVED'
  ),
  (
    'a2222222-aaaa-2222-aaaa-222222222222',
    '22222222-2222-2222-2222-222222222222',
    'Xưởng Lụa Tơ Tằm Đỗ Văn Hiển',
    'Nghệ nhân Dân gian',
    '3 đời dệt lụa satin và đũi tơ tằm tự nhiên. Tiên phong áp dụng kỹ thuật nhuộm màu từ thảo mộc thân thiện môi trường.',
    'Chuyên dòng lụa đũi mộc và khăn choàng lụa tơ tằm nhuộm củ nâu, lá bàng già.',
    'Số 18 Ngõ 8 Phố Lụa Vạn Phúc, Hà Đông, Hà Nội',
    20.9761500,
    105.7765200,
    TRUE,
    '{"monday_to_saturday": "08:30 - 17:30", "tour_experience": "Xem quy trình nấu nhuộm màu tự nhiên"}',
    '["OCOP 4 Sao", "Chứng nhận Lụa tơ tằm nguyên chất 100%"]',
    'APPROVED'
  ),
  (
    'a3333333-aaaa-3333-aaaa-333333333333',
    '22222222-2222-2222-2222-222222222223',
    'Xưởng Dệt Lụa Đông Hương',
    'Hộ sản xuất truyền thống',
    'Chuyên nhận gia công đơn hàng lớn cho các nhà thiết kế thời trang và quà tặng đối ngoại.',
    'Sở hữu 10 khung dệt liên hoàn, chuyên dệt khổ lụa rộng và gấm hoa văn hiện đại.',
    'Số 25 Phố Lụa, Phường Vạn Phúc, Hà Đông, Hà Nội',
    20.9772000,
    105.7752000,
    FALSE,
    '{"note": "Xưởng chuyên sản xuất đơn lớn, không mở đón khách tham quan trải nghiệm"}',
    '["Chứng nhận Hộ làng nghề tiêu biểu"]',
    'APPROVED'
  );

INSERT INTO product_categories (id, name, slug, description, cover_image_url)
VALUES
  ('c1111111-cccc-1111-cccc-111111111111', 'Lụa Vân Cổ Truyền', 'lua-van-co-truyen', 'Đỉnh cao kỹ nghệ dệt lụa Vạn Phúc với hoa văn chìm nổi tinh tế, mịn mát mùa hè, ấm áp mùa đông.', 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800'),
  ('c2222222-cccc-2222-cccc-222222222222', 'Lụa Tơ Tằm Trơn & Satin', 'lua-to-tam-tron-satin', 'Bề mặt lụa óng ả, mềm rủ tự nhiên, chuyên dùng may áo dài truyền thống và dạ hội.', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800'),
  ('c3333333-cccc-3333-cccc-333333333333', 'Khăn Choàng & Phụ Kiện Lụa', 'khan-choang-phu-kien', 'Khăn lụa tơ tằm dệt tay, nhuộm thảo mộc tự nhiên hoặc vẽ họa tiết tranh Đông Hồ, Phố cổ.', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=800');

INSERT INTO products (id, artisan_id, category_id, name, slug, description, reference_price, silk_weave_type, dimensions, care_instructions, status)
VALUES
  (
    'p1111111-pppp-1111-pppp-111111111111',
    'a1111111-aaaa-1111-aaaa-111111111111',
    'c1111111-cccc-1111-cccc-111111111111',
    'Khăn Lụa Vân Song Hạc Cát Tường',
    'khan-lua-van-song-hac-cat-tuong',
    'Khăn lụa tơ tằm dệt hoa văn Lụa Vân Song Hạc cổ truyền. Tơ tằm tự nhiên 100%, dệt tay thủ công trên khung dệt cổ xưởng Triệu Văn Mão.',
    850000.00,
    'Lụa Vân hoa văn Song Hạc',
    '0.7m x 1.9m',
    'Giặt tay với dầu gội nhẹ hoặc sữa tắm. Không vắt mạnh, phơi nơi thoáng gió tránh nắng gắt.',
    'PUBLISHED'
  );

INSERT INTO product_images (product_id, image_url, thumbnail_url, is_primary, sort_order)
VALUES
  ('p1111111-pppp-1111-pppp-111111111111', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=1200', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=300', TRUE, 0);

INSERT INTO product_batches (id, product_id, artisan_id, batch_code, trace_token, qr_code_url, quantity, production_date, status)
VALUES
  (
    'b1111111-bbbb-1111-bbbb-111111111111',
    'p1111111-pppp-1111-pppp-111111111111',
    'a1111111-aaaa-1111-aaaa-111111111111',
    'VP-VAN-2026-L01',
    'e5b72186-b482-4ef1-9871-332918817a10',
    'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://vcraft.vn/trace/e5b72186-b482-4ef1-9871-332918817a10',
    50,
    '2026-10-01',
    'COMPLETED'
  );

INSERT INTO batch_production_logs (id, batch_id, stage_name, title, description, occurred_at, step_number)
VALUES
  (
    'l1111111-1111-1111-1111-111111111111',
    'b1111111-bbbb-1111-bbbb-111111111111',
    'UOM_TO',
    'Tuyển kén vàng & Kéo tơ tằm nguyên chất',
    'Thu mua 45kg kén tằm giống dâu tằm tự nhiên. Luộc kén trong nồi đồng và kéo thành những nõn tơ vàng óng không pha sợi hóa học.',
    '2026-10-02 08:30:00',
    1
  ),
  (
    'l2222222-2222-2222-2222-222222222222',
    'b1111111-bbbb-1111-bbbb-111111111111',
    'MAC_CUI',
    'Mắc cửi & Cài go hoa văn Song Hạc',
    'Nghệ nhân kỳ công xếp từng sợi tơ dọc dài 100m, cài go hoa dệt thủ công tạo mẫu hoa văn chìm nổi Song Hạc truyền thống.',
    '2026-10-08 14:00:00',
    2
  ),
  (
    'l3333333-3333-3333-3333-333333333333',
    'b1111111-bbbb-1111-bbbb-111111111111',
    'DET_LUA',
    'Dệt thủ công trên khung dệt gỗ cổ truyền',
    'Thợ dệt điều khiển thoi đưa nhịp nhàng với tốc độ 4 mét/ngày. Từng đường dệt chắc chắn, đều đặn tạo độ mịn mượt.',
    '2026-10-18 16:45:00',
    3
  ),
  (
    'l4444444-4444-4444-4444-444444444444',
    'b1111111-bbbb-1111-bbbb-111111111111',
    'NHUOM_MAU',
    'Nấu tẩy keo tơ & Nhuộm thảo mộc tự nhiên',
    'Nấu lụa bằng nước tro rơm nếp để tẩy sạch keo sericin. Nhuộm thủ công 3 lần bằng nước cốt lá bàng già và củ nâu cho màu vàng hổ phách trầm ấm.',
    '2026-10-25 10:15:00',
    4
  ),
  (
    'l5555555-5555-5555-5555-555555555555',
    'b1111111-bbbb-1111-bbbb-111111111111',
    'CAN_LANG',
    'Phơi nắng tự nhiên & Cán láng hoàn thiện',
    'Phơi lụa trên bãi cỏ thoáng gió dưới nắng thu Vạn Phúc. Cán ép bề mặt bằng con lăn đá tạo độ óng ả đặc trưng. Đóng tem QR lô VP-VAN-2026-L01.',
    '2026-10-30 15:00:00',
    5
  );

INSERT INTO quote_requests (id, buyer_id, title, description, quantity, bidding_deadline, expected_delivery, delivery_address, custom_requirements, status)
VALUES
  (
    'r1111111-rrrr-1111-rrrr-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'Đặt 1.000 khăn lụa tơ tằm thêu logo quà tặng kỷ niệm ĐHQGHN',
    'Cần đặt 1.000 chiếc khăn lụa tơ tằm màu xanh navy hoặc vàng đồng, thêu logo kỷ niệm ở góc khăn, kèm hộp quà gấm cao cấp.',
    1000,
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    DATE_ADD(NOW(), INTERVAL 30 DAY),
    'Nhà điều hành ĐHQGHN, Hòa Lạc, Thạch Thất, Hà Nội',
    'Khăn tơ tằm 100%, có tem QR truy xuất nguồn gốc xưởng dệt Vạn Phúc gắn trên từng hộp.',
    'OPEN_FOR_BIDDING'
  );

INSERT INTO quotes (id, request_id, artisan_id, unit_price, total_amount, estimated_days, note, status)
VALUES
  (
    'q1111111-qqqq-1111-qqqq-111111111111',
    'r1111111-rrrr-1111-rrrr-111111111111',
    'a1111111-aaaa-1111-aaaa-111111111111',
    380000.00,
    380000000.00,
    22,
    'Xưởng Triệu Văn Mão cam kết lụa vân Song Hạc thượng hạng, tặng kèm túi thơm hoa hồi cho mỗi hộp khăn.',
    'SUBMITTED'
  ),
  (
    'q2222222-qqqq-2222-qqqq-222222222222',
    'r1111111-rrrr-1111-rrrr-111111111111',
    'a2222222-aaaa-2222-aaaa-222222222222',
    350000.00,
    350000000.00,
    25,
    'Xưởng Đỗ Văn Hiển cam kết nhuộm màu xanh thảo dược không phai, thêu chỉ tơ tằm óng ánh.',
    'SUBMITTED'
  );

INSERT INTO community_news (id, author_id, title, slug, content, category, cover_image_url, is_pinned, status, published_at)
VALUES
  (
    'n1111111-nnnn-1111-nnnn-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Thông báo biến động giá kén tơ vàng tháng 11/2026',
    'thong-bao-gia-ken-to-vang-thang-11-2026',
    'Ban Quản lý Làng lụa Vạn Phúc xin thông báo: Do ảnh hưởng thời tiết giao mùa, giá thu mua kén tằm vàng chất lượng loại 1 tại các vùng nguyên liệu tăng nhẹ khoảng 5%, dao động ở mức 210.000đ - 230.000đ/kg kén tươi. Đề nghị các hộ chủ động điều chỉnh dự toán chào thầu.',
    'MATERIAL_PRICE',
    'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800',
    TRUE,
    'PUBLISHED',
    DATE_SUB(NOW(), INTERVAL 2 DAY)
  );
