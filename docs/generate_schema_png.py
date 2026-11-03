import os
from PIL import Image, ImageDraw, ImageFont

# Canvas dimensions (High Resolution 3600 x 2400)
WIDTH, HEIGHT = 3600, 2400
img = Image.new("RGB", (WIDTH, HEIGHT), "#080C15")
draw = ImageDraw.Draw(img)

# Try loading fonts
try:
    title_font = ImageFont.truetype("arialbd.ttf", 52)
    sub_font = ImageFont.truetype("arial.ttf", 24)
    group_font = ImageFont.truetype("arialbd.ttf", 26)
    header_font = ImageFont.truetype("arialbd.ttf", 22)
    col_bold = ImageFont.truetype("arialbd.ttf", 16)
    col_font = ImageFont.truetype("arial.ttf", 15)
    badge_font = ImageFont.truetype("arialbd.ttf", 13)
    legend_font = ImageFont.truetype("arialbd.ttf", 18)
except:
    title_font = ImageFont.load_default()
    sub_font = ImageFont.load_default()
    group_font = ImageFont.load_default()
    header_font = ImageFont.load_default()
    col_bold = ImageFont.load_default()
    col_font = ImageFont.load_default()
    badge_font = ImageFont.load_default()
    legend_font = ImageFont.load_default()

# 1. Header Banner
draw.rectangle([(40, 30), (WIDTH - 40, 150)], fill="#0F172A", outline="#1E293B", width=2)
draw.text((70, 48), "vCraft - KIẾN TRÚC CƠ SỞ DỮ LIỆU POSTGRESQL 18 (17 BẢNG CHUẨN HOÁ 3NF)", fill="#F8FAFC", font=title_font)
draw.text((70, 105), "Đặc Tả Chi Tiết: B2C Bán Lẻ (Cart/Orders) & B2B Mua Sỉ (Bidding) | QR Traceability 5 Bước | Notifications Realtime", fill="#94A3B8", font=sub_font)

# 2. Color Palettes for 5 Functional Domains
PALETTES = {
    "AUTH": {"header": "#1E3A8A", "accent": "#60A5FA", "bg": "#0B163B", "border": "#2563EB", "title": "PHÂN HỆ 1: TÀI KHOẢN & HỒ SƠ NGHỆ NHÂN (MAP)"},
    "CATALOG": {"header": "#064E3B", "accent": "#34D399", "bg": "#062E23", "border": "#059669", "title": "PHÂN HỆ 2: TRIỂN LÃM & NHẬT KÝ QR 5 BƯỚC"},
    "B2C": {"header": "#0E7490", "accent": "#22D3EE", "bg": "#0A3B49", "border": "#0891B2", "title": "PHÂN HỆ 3: B2C BÁN LẺ (GIỎ HÀNG & CHECKOUT)"},
    "B2B": {"header": "#78350F", "accent": "#FBBF24", "bg": "#3B1B06", "border": "#D97706", "title": "PHÂN HỆ 4: B2B MUA SỈ & ĐẤU THẦU (STATE MACHINE)"},
    "SYS": {"header": "#581C87", "accent": "#C084FC", "bg": "#2F0D49", "border": "#7C3AED", "title": "PHÂN HỆ 5: ĐÁNH GIÁ, THÔNG BÁO & KIỂM TOÁN"}
}

# 3. Domain Background Groups
DOMAINS = [
    {"group": "AUTH", "x": 40, "y": 170, "w": 650, "h": 2040},
    {"group": "CATALOG", "x": 720, "y": 170, "w": 670, "h": 2040},
    {"group": "B2C", "x": 1420, "y": 170, "w": 670, "h": 2040},
    {"group": "B2B", "x": 2120, "y": 170, "w": 700, "h": 2040},
    {"group": "SYS", "x": 2850, "y": 170, "w": 710, "h": 2040}
]

for d in DOMAINS:
    pal = PALETTES[d["group"]]
    draw.rounded_rectangle([(d["x"], d["y"]), (d["x"] + d["w"], d["y"] + d["h"])], radius=12, fill="#0D1322", outline="#1E293B", width=2)
    draw.rounded_rectangle([(d["x"], d["y"]), (d["x"] + d["w"], d["y"] + 52)], radius=10, fill=pal["bg"], outline=pal["border"], width=1)
    draw.text((d["x"] + 20, d["y"] + 14), pal["title"], fill=pal["accent"], font=group_font)

# 4. Tables Definitions (17 Tables)
TABLES = [
    # --- DOMAIN 1: AUTH & ARTISAN PROFILES ---
    {
        "name": "users", "group": "AUTH", "x": 60, "y": 240, "w": 610, "h": 460,
        "badge": "Core Identity (Admin, Artisan, Buyer)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("UK", "email", "VARCHAR(255) UNIQUE", "NN"),
            ("", "password_hash", "VARCHAR(255) (Argon2/Bcrypt)", "NN"),
            ("", "full_name", "VARCHAR(120)", "NN"),
            ("", "phone", "VARCHAR(20)", ""),
            ("EN", "role", "user_role (ADMIN, ARTISAN, BUYER)", "NN"),
            ("", "avatar_url", "VARCHAR(500)", ""),
            ("", "is_active", "BOOLEAN DEFAULT TRUE", "NN"),
            ("", "created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP", "NN"),
            ("", "updated_at", "TIMESTAMPTZ (Auto Trigger updated)", "NN")
        ]
    },
    {
        "name": "artisan_profiles", "group": "AUTH", "x": 60, "y": 730, "w": 610, "h": 660,
        "badge": "Artisan Showroom & Leaflet GPS",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "user_id", "UUID -> users(id) ON DEL CASCADE", "NN, UK"),
            ("", "workshop_name", "VARCHAR(200) (GIN Search index)", "NN"),
            ("", "artisan_title", "VARCHAR(150) (Nghệ nhân Ưu tú...)", ""),
            ("", "family_history", "TEXT (Lịch sử 5 đời dệt lụa)", ""),
            ("CK", "experience_years", "SMALLINT CHECK (exp >= 0)", ""),
            ("", "address", "VARCHAR(255) (Phố Lụa Vạn Phúc)", "NN"),
            ("", "latitude, longitude", "DECIMAL(10,7) (Leaflet Map Pins)", "NN"),
            ("", "opening_hours", "VARCHAR(100) DEFAULT '08:00 - 18:00'", "NN"),
            ("", "is_open_for_visitors", "BOOLEAN DEFAULT TRUE (Mở đón khách)", "NN"),
            ("EN", "verification_status", "artisan_verification_status", "NN"),
            ("", "verified_at", "TIMESTAMPTZ (Admin duyệt)", ""),
            ("CK", "average_rating", "DECIMAL(3,2) DEFAULT 5.00 (Auto)", "NN"),
            ("CK", "total_reviews", "INTEGER DEFAULT 0 (Auto Trigger)", "NN"),
            ("", "cover_image_url", "VARCHAR(500)", ""),
            ("", "gallery_images", "TEXT[] DEFAULT '{}'", "")
        ]
    },
    {
        "name": "artisan_certificates", "group": "AUTH", "x": 60, "y": 1420, "w": 610, "h": 360,
        "badge": "OCOP 5 Sao & Di Sản Văn Hóa",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id) CASCADE", "NN"),
            ("", "title", "VARCHAR(200) (Chứng nhận OCOP...)", "NN"),
            ("", "issuing_authority", "VARCHAR(200) (Bộ NN&PTNT)", "NN"),
            ("", "issued_year", "SMALLINT", "NN"),
            ("", "certificate_image_url", "VARCHAR(500)", "NN"),
            ("", "created_at", "TIMESTAMPTZ", "NN")
        ]
    },

    # --- DOMAIN 2: EXHIBITION & 5-STAGE QR LIFECYCLE ---
    {
        "name": "categories", "group": "CATALOG", "x": 740, "y": 240, "w": 630, "h": 310,
        "badge": "Phân Loại Lụa Vạn Phúc",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("UK", "name", "VARCHAR(100) UNIQUE (Lụa Vân, Gấm...)", "NN"),
            ("UK", "slug", "VARCHAR(120) UNIQUE (SEO URL)", "NN"),
            ("", "description", "TEXT", ""),
            ("", "thumbnail_url", "VARCHAR(500)", "")
        ]
    },
    {
        "name": "products", "group": "CATALOG", "x": 740, "y": 580, "w": 630, "h": 700,
        "badge": "Triển Lãm Số & Giá Bán Lẻ",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id) RESTRICT", "NN"),
            ("FK", "category_id", "UUID -> categories(id) SET NULL", ""),
            ("", "name", "VARCHAR(255) (GIN Search index)", "NN"),
            ("UK", "slug", "VARCHAR(280) UNIQUE", "NN"),
            ("EN", "weave_type", "silk_weave_type (LUA_VAN, GAM...)", "NN"),
            ("", "raw_material", "VARCHAR(150) (100% tơ tằm)", "NN"),
            ("CK", "price", "DECIMAL(12,2) CHECK (price >= 0)", "NN"),
            ("CK", "stock_quantity", "INTEGER DEFAULT 0 CHECK (qty >= 0)", "NN"),
            ("", "media_urls", "TEXT[] (Ảnh tối ưu / nén WebP)", "NN"),
            ("", "cultural_story", "TEXT (Ý nghĩa hoa văn cổ truyền)", ""),
            ("", "is_unique_piece", "BOOLEAN DEFAULT FALSE (Độc bản)", "NN"),
            ("", "is_published", "BOOLEAN DEFAULT TRUE (Công khai)", "NN"),
            ("CK", "average_rating", "DECIMAL(3,2) DEFAULT 5.00", "NN"),
            ("CK", "total_reviews", "INTEGER DEFAULT 0 (Trigger calc)", "NN")
        ]
    },
    {
        "name": "product_batches", "group": "CATALOG", "x": 740, "y": 1310, "w": 630, "h": 430,
        "badge": "Lô Sản Xuất QR (Stock & B2B Orders)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "product_id", "UUID -> products(id) RESTRICT", "NN"),
            ("FK", "order_assignment_id", "UUID -> order_assignments(id) NULL", ""),
            ("UK", "batch_code", "VARCHAR(50) UNIQUE (VP-2026-LV-001)", "NN"),
            ("", "qr_code_url", "VARCHAR(500) (Quét ra Landing Page)", "NN"),
            ("", "started_at", "DATE DEFAULT CURRENT_DATE", "NN"),
            ("", "completed_at", "DATE", ""),
            ("CK", "total_quantity", "INTEGER CHECK (quantity > 0)", "NN"),
            ("EN", "status", "batch_status (PLAN, IN_PROG, COMP...)", "NN")
        ]
    },
    {
        "name": "batch_logs", "group": "CATALOG", "x": 740, "y": 1770, "w": 630, "h": 390,
        "badge": "5 Mốc Nhật Ký Vòng Đời Tơ Tằm",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "batch_id", "UUID -> product_batches(id) CASCADE", "NN"),
            ("EN", "stage", "silk_production_stage (1: Ươm, 2: Mắc...)", "NN"),
            ("", "stage_title", "VARCHAR(150)", "NN"),
            ("", "description", "TEXT (Mô tả kỹ thuật dệt)", "NN"),
            ("", "evidence_image_urls", "TEXT[] (Ảnh bằng chứng xưởng)", "NN"),
            ("CK", "step_order", "INTEGER CHECK (order BETWEEN 1 AND 5)", "NN"),
            ("UK", "UNIQUE", "(batch_id, stage)", "NN")
        ]
    },

    # --- DOMAIN 3: B2C RETAIL COMMERCE ---
    {
        "name": "cart_items", "group": "B2C", "x": 1440, "y": 240, "w": 630, "h": 360,
        "badge": "Giỏ Hàng Người Dùng Mua Lẻ",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "user_id", "UUID -> users(id) ON DEL CASCADE", "NN"),
            ("FK", "product_id", "UUID -> products(id) ON DEL CASCADE", "NN"),
            ("CK", "quantity", "INTEGER DEFAULT 1 CHECK (qty > 0)", "NN"),
            ("UK", "UNIQUE", "(user_id, product_id)", "NN"),
            ("", "created_at / updated_at", "TIMESTAMPTZ", "NN")
        ]
    },
    {
        "name": "retail_orders", "group": "B2C", "x": 1440, "y": 630, "w": 630, "h": 570,
        "badge": "Đơn Hàng Mua Lẻ (Checkout B2C)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("UK", "order_code", "VARCHAR(30) UNIQUE (ORD-202611-001)", "NN"),
            ("FK", "buyer_id", "UUID -> users(id) RESTRICT", "NN"),
            ("", "recipient_name", "VARCHAR(120)", "NN"),
            ("", "recipient_phone", "VARCHAR(20)", "NN"),
            ("", "shipping_address", "TEXT", "NN"),
            ("", "shipping_note", "TEXT", ""),
            ("CK", "total_amount", "DECIMAL(12,2) CHECK (amount >= 0)", "NN"),
            ("EN", "payment_method", "payment_method (COD, BANK, VNPAY, MOMO)", "NN"),
            ("EN", "payment_status", "payment_status (UNPAID, PAID, REFUND)", "NN"),
            ("EN", "status", "retail_order_status (PEND, CONFIRM, SHIP...)", "NN")
        ]
    },
    {
        "name": "retail_order_items", "group": "B2C", "x": 1440, "y": 1230, "w": 630, "h": 410,
        "badge": "Chi Tiết Mặt Hàng Đơn Bán Lẻ",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "order_id", "UUID -> retail_orders(id) CASCADE", "NN"),
            ("FK", "product_id", "UUID -> products(id) RESTRICT", "NN"),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id) RESTRICT", "NN"),
            ("CK", "quantity", "INTEGER CHECK (quantity > 0)", "NN"),
            ("CK", "unit_price", "DECIMAL(12,2) (Giá tại thời điểm mua)", "NN"),
            ("CK", "subtotal", "DECIMAL(12,2) (Thành tiền)", "NN"),
            ("", "created_at", "TIMESTAMPTZ", "NN")
        ]
    },

    # --- DOMAIN 4: B2B WHOLESALE & BIDDING STATE MACHINE ---
    {
        "name": "quotation_requests", "group": "B2B", "x": 2140, "y": 240, "w": 660, "h": 610,
        "badge": "Yêu Cầu Báo Giá Đơn Sỉ (State Machine)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "buyer_id", "UUID -> users(id) RESTRICT", "NN"),
            ("FK", "target_artisan_id", "UUID -> artisan_profiles(id) NULL", ""),
            ("", "title", "VARCHAR(255) (Đặt 2.000 khăn lụa logo ĐHQG)", "NN"),
            ("", "specifications", "TEXT (Quy cách, in thêu logo)", "NN"),
            ("CK", "target_quantity", "INTEGER CHECK (quantity > 0)", "NN"),
            ("CK", "max_budget", "DECIMAL(14,2) (Ngân sách tối đa)", ""),
            ("EN", "preferred_weave_type", "silk_weave_type (Lụa Vân...)", "NN"),
            ("", "deadline", "DATE (Hạn nhận hàng)", "NN"),
            ("", "attachment_urls", "TEXT[] (Market thiết kế, hợp đồng)", ""),
            ("EN", "status", "quote_status: DRAFT -> SENT -> BIDDING", "NN"),
            ("", "", "  -> BUYER_ACCEPTED -> IN_PROD -> DELIVERED", "")
        ]
    },
    {
        "name": "bids", "group": "B2B", "x": 2140, "y": 880, "w": 660, "h": 460,
        "badge": "Hồ Sơ Chào Giá / Đấu Thầu Nghệ Nhân",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "quotation_request_id", "UUID -> quotation_requests(id) CASCADE", "NN"),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id) CASCADE", "NN"),
            ("CK", "proposed_price", "DECIMAL(12,2) CHECK (price > 0)", "NN"),
            ("CK", "proposed_completion_days", "INTEGER CHECK (days > 0)", "NN"),
            ("", "note", "TEXT (Cam kết chất lượng OCOP)", ""),
            ("", "sample_images", "TEXT[] (Ảnh mẫu lụa thực tế)", ""),
            ("EN", "status", "bid_status (SUBMITTED, ACCEPTED, REJECT)", "NN"),
            ("UK", "UNIQUE", "(quotation_request_id, artisan_id)", "NN")
        ]
    },
    {
        "name": "order_assignments", "group": "B2B", "x": 2140, "y": 1370, "w": 660, "h": 490,
        "badge": "Phân Bổ Sản Xuất Đa Hộ (Multi-Artisan Split)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "quotation_request_id", "UUID -> quotation_requests(id)", "NN"),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id)", "NN"),
            ("FK", "bid_id", "UUID -> bids(id) UNIQUE (1-1)", "NN, UK"),
            ("CK", "allocated_quantity", "INTEGER CHECK (quantity > 0)", "NN"),
            ("CK", "agreed_price", "DECIMAL(12,2) (Giá chốt thầu)", "NN"),
            ("EN", "status", "assignment_status (ASSIGNED, IN_PROD...)", "NN"),
            ("", "started_at / completed_at", "TIMESTAMPTZ", ""),
            ("", "notes", "TEXT (Ghi chú chia lô)", "")
        ]
    },

    # --- DOMAIN 5: REVIEWS, NOTIFICATIONS, COMMUNITY & AUDIT ---
    {
        "name": "reviews", "group": "SYS", "x": 2870, "y": 240, "w": 670, "h": 540,
        "badge": "Đánh Giá Sản Phẩm (B2C) & Nghệ Nhân (B2B)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "buyer_id", "UUID -> users(id) CASCADE", "NN"),
            ("EN", "target_type", "review_target_type (PRODUCT, ARTISAN)", "NN"),
            ("FK", "product_id", "UUID -> products(id) NULLable", ""),
            ("FK", "artisan_id", "UUID -> artisan_profiles(id) CASCADE", "NN"),
            ("FK", "retail_order_id", "UUID -> retail_orders(id) NULLable", ""),
            ("FK", "quotation_request_id", "UUID -> quotation_requests(id) NULLable", ""),
            ("CK", "rating", "SMALLINT CHECK (rating BETWEEN 1 AND 5)", "NN"),
            ("", "comment", "TEXT (Nội dung nhận xét)", "NN"),
            ("", "media_urls", "TEXT[] (Feedback ảnh thật)", ""),
            ("", "is_verified_purchase", "BOOLEAN DEFAULT TRUE", "NN")
        ]
    },
    {
        "name": "notifications", "group": "SYS", "x": 2870, "y": 810, "w": 670, "h": 410,
        "badge": "Thông Báo Thời Gian Thực (Bell Alerts)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "user_id", "UUID -> users(id) CASCADE", "NN"),
            ("", "title", "VARCHAR(200)", "NN"),
            ("", "message", "TEXT", "NN"),
            ("EN", "type", "notification_type (QUOTE, BID, ORDER, NEWS)", "NN"),
            ("", "link_url", "VARCHAR(500)", ""),
            ("", "is_read", "BOOLEAN DEFAULT FALSE", "NN"),
            ("", "created_at", "TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP", "NN")
        ]
    },
    {
        "name": "community_news", "group": "SYS", "x": 2870, "y": 1250, "w": 670, "h": 440,
        "badge": "Bản Tin BQL Xã (Điện lưới, Giá tơ, Lễ hội)",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "author_admin_id", "UUID -> users(id) (Admin BQL)", "NN"),
            ("", "title", "VARCHAR(255)", "NN"),
            ("UK", "slug", "VARCHAR(280) UNIQUE", "NN"),
            ("EN", "category", "news_category (POWER, PRICE, EVENT...)", "NN"),
            ("", "content", "TEXT", "NN"),
            ("", "thumbnail_url", "VARCHAR(500)", ""),
            ("", "is_pinned", "BOOLEAN DEFAULT FALSE", "NN"),
            ("", "published_at", "TIMESTAMPTZ", "NN")
        ]
    },
    {
        "name": "audit_logs", "group": "SYS", "x": 2870, "y": 1720, "w": 670, "h": 390,
        "badge": "Ghi Vết Kiểm Toán Bảo Mật Hệ Thống",
        "cols": [
            ("PK", "id", "UUID DEFAULT gen_random_uuid()", "NN"),
            ("FK", "user_id", "UUID -> users(id) ON DEL SET NULL", ""),
            ("", "action", "VARCHAR(100) (APPROVE_ARTISAN...)", "NN"),
            ("", "target_table", "VARCHAR(100)", "NN"),
            ("", "target_record_id", "UUID", ""),
            ("", "metadata", "JSONB (Old/New values, IP address)", ""),
            ("", "created_at", "TIMESTAMPTZ DEFAULT NOW()", "NN")
        ]
    }
]

# 5. Render Tables
for t in TABLES:
    pal = PALETTES[t["group"]]
    x, y, w, h = t["x"], t["y"], t["w"], t["h"]

    draw.rounded_rectangle([(x + 6, y + 6), (x + w + 6, y + h + 6)], radius=8, fill="#04060B")
    draw.rounded_rectangle([(x, y), (x + w, y + h)], radius=8, fill="#0F172A", outline="#1E293B", width=2)
    draw.rounded_rectangle([(x, y), (x + w, y + 46)], radius=8, fill=pal["header"])

    draw.text((x + 16, y + 10), t["name"], fill="#FFFFFF", font=header_font)

    badge_txt = t["badge"]
    badge_w = len(badge_txt) * 7 + 20
    draw.rounded_rectangle([(x + w - badge_w - 12, y + 10), (x + w - 12, y + 36)], radius=4, fill="#0B132B")
    draw.text((x + w - badge_w - 4, y + 14), badge_txt, fill=pal["accent"], font=badge_font)

    cy = y + 56
    for key, name, dtype, extra in t["cols"]:
        if key == "PK":
            draw.text((x + 14, cy), "PK", fill="#FBBF24", font=col_bold)
        elif key == "FK":
            draw.text((x + 14, cy), "FK", fill="#38BDF8", font=col_bold)
        elif key == "UK":
            draw.text((x + 14, cy), "UK", fill="#34D399", font=col_bold)
        elif key == "EN":
            draw.text((x + 14, cy), "EN", fill="#C084FC", font=col_bold)
        elif key == "CK":
            draw.text((x + 14, cy), "CK", fill="#F87171", font=col_bold)
        else:
            draw.text((x + 18, cy), "•", fill="#64748B", font=col_font)

        draw.text((x + 50, cy), name, fill="#F1F5F9", font=col_bold)

        type_str = dtype
        if extra:
            type_str += f" [{extra}]"
        type_x = x + 240
        draw.text((type_x, cy), type_str, fill="#94A3B8", font=col_font)

        draw.line([(x + 12, cy + 24), (x + w - 12, cy + 24)], fill="#1E293B", width=1)
        cy += 26

# 6. Footer Legend & Cardinality Guide
draw.rectangle([(40, HEIGHT - 120), (WIDTH - 40, HEIGHT - 30)], fill="#0F172A", outline="#1E293B", width=2)
draw.text((70, HEIGHT - 98), "KÝ HIỆU & BẢN SỐ (CROW'S FOOT):", fill="#F8FAFC", font=legend_font)

LEGENDS = [
    ("PK", "#FBBF24", "Khóa Chính (Primary Key)"),
    ("FK", "#38BDF8", "Khóa Ngoại (Foreign Key)"),
    ("UK", "#34D399", "Ràng Buộc Duy Nhất (Unique Key)"),
    ("EN", "#C084FC", "Kiểu Liệt Kê (PostgreSQL ENUM)"),
    ("CK", "#F87171", "Ràng Buộc Kiểm Tra (Check Constraint)"),
    ("1 : 1", "#60A5FA", "Quan hệ 1 - 1 (users -> artisan_profiles)"),
    ("1 : N", "#34D399", "Quan hệ 1 - Nhiều (artisan_profiles -> products)"),
    ("N : N", "#FBBF24", "Phân rã N - N qua Bids & Assignments")
]

lx = 420
for code, color, desc in LEGENDS:
    draw.rounded_rectangle([(lx, HEIGHT - 100), (lx + 46, HEIGHT - 76)], radius=4, fill="#1E293B")
    draw.text((lx + 6, HEIGHT - 96), code, fill=color, font=col_bold)
    draw.text((lx + 54, HEIGHT - 96), desc, fill="#CBD5E1", font=col_font)
    lx += len(desc) * 8 + 90

# Save Output Image
out_path = r"D:\PTUD Web\vCraft\docs\vcraft_schema.png"
img.save(out_path, quality=95)
print(f"Generated ultra-high-res 17-table schema: {out_path} ({WIDTH}x{HEIGHT})")
