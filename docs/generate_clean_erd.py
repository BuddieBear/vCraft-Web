import json
import os

tables = [
    # Column 1: Auth, Admin & Community (x = 60, w = 480)
    {
        "id": "users",
        "name": "users",
        "title": "Tài khoản & Phân quyền RBAC",
        "domain": "AUTH & CORE",
        "color": "#1d4ed8",
        "bg_color": "#eff6ff",
        "border_color": "#93c5fd",
        "x": 60, "y": 140, "w": 480,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "email", "type": "varchar(255)", "uk": True},
            {"name": "password_hash", "type": "varchar(255)"},
            {"name": "full_name", "type": "varchar(120)"},
            {"name": "phone", "type": "varchar(20)"},
            {"name": "role", "type": "user_role (ENUM)"},
            {"name": "avatar_url", "type": "varchar(500)"},
            {"name": "is_active", "type": "boolean"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "notifications",
        "name": "notifications",
        "title": "Chuông thông báo thời gian thực",
        "domain": "AUTH & CORE",
        "color": "#1d4ed8",
        "bg_color": "#eff6ff",
        "border_color": "#93c5fd",
        "x": 60, "y": 550, "w": 480,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "user_id", "type": "uuid", "fk": "users.id"},
            {"name": "title", "type": "varchar(200)"},
            {"name": "message", "type": "text"},
            {"name": "type", "type": "notification_type (ENUM)"},
            {"name": "link_url", "type": "varchar(500)"},
            {"name": "is_read", "type": "boolean"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "audit_logs",
        "name": "audit_logs",
        "title": "Ghi vết kiểm toán bảo mật",
        "domain": "AUTH & CORE",
        "color": "#1d4ed8",
        "bg_color": "#eff6ff",
        "border_color": "#93c5fd",
        "x": 60, "y": 910, "w": 480,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "user_id", "type": "uuid", "fk": "users.id"},
            {"name": "action", "type": "varchar(100)"},
            {"name": "target_table", "type": "varchar(80)"},
            {"name": "target_record_id", "type": "uuid"},
            {"name": "metadata", "type": "jsonb"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "community_news",
        "name": "community_news",
        "title": "Bản tin BQL & Làng nghề",
        "domain": "AUTH & CORE",
        "color": "#1d4ed8",
        "bg_color": "#eff6ff",
        "border_color": "#93c5fd",
        "x": 60, "y": 1240, "w": 480,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "author_admin_id", "type": "uuid", "fk": "users.id"},
            {"name": "title", "type": "varchar(250)"},
            {"name": "slug", "type": "varchar(255)", "uk": True},
            {"name": "category", "type": "news_category (ENUM)"},
            {"name": "content", "type": "text"},
            {"name": "thumbnail_url", "type": "varchar(500)"},
            {"name": "is_pinned", "type": "boolean"},
            {"name": "published_at", "type": "timestamptz"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },

    # Column 2: Artisans & Craft Village (x = 590, w = 530)
    {
        "id": "artisan_profiles",
        "name": "artisan_profiles",
        "title": "Hồ sơ Nghệ nhân & Bản đồ Leaflet",
        "domain": "ARTISANS & MAP",
        "color": "#b45309",
        "bg_color": "#fffbeb",
        "border_color": "#fde68a",
        "x": 590, "y": 140, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "user_id", "type": "uuid", "fk": "users.id", "uk": True},
            {"name": "workshop_name", "type": "varchar(200)"},
            {"name": "artisan_title", "type": "varchar(150)"},
            {"name": "family_history", "type": "text"},
            {"name": "experience_years", "type": "smallint"},
            {"name": "address", "type": "varchar(300)"},
            {"name": "latitude", "type": "numeric(10,7)"},
            {"name": "longitude", "type": "numeric(10,7)"},
            {"name": "opening_hours", "type": "varchar(100)"},
            {"name": "accepts_tourists", "type": "boolean"},
            {"name": "cover_image_url", "type": "varchar(500)"},
            {"name": "gallery_images", "type": "text[]"},
            {"name": "verification_status", "type": "status (ENUM)"},
            {"name": "verified_at", "type": "timestamptz"},
            {"name": "average_rating", "type": "numeric(3,2)"},
            {"name": "total_reviews", "type": "integer"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "artisan_certificates",
        "name": "artisan_certificates",
        "title": "Chứng nhận OCOP & Nghệ nhân",
        "domain": "ARTISANS & MAP",
        "color": "#b45309",
        "bg_color": "#fffbeb",
        "border_color": "#fde68a",
        "x": 590, "y": 860, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "title", "type": "varchar(200)"},
            {"name": "issuing_authority", "type": "varchar(200)"},
            {"name": "issued_year", "type": "smallint"},
            {"name": "certificate_image_url", "type": "varchar(500)"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "categories",
        "name": "categories",
        "title": "Danh mục Lụa (Lụa Vân, Gấm...)",
        "domain": "CATALOG & SILK",
        "color": "#047857",
        "bg_color": "#ecfdf5",
        "border_color": "#a7f3d0",
        "x": 590, "y": 1190, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "name", "type": "varchar(120)", "uk": True},
            {"name": "slug", "type": "varchar(150)", "uk": True},
            {"name": "description", "type": "text"},
            {"name": "thumbnail_url", "type": "varchar(500)"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    },

    # Column 3: Products, Cart & Reviews (x = 1170, w = 530)
    {
        "id": "products",
        "name": "products",
        "title": "Sản phẩm & Tác phẩm Triển lãm",
        "domain": "CATALOG & SILK",
        "color": "#047857",
        "bg_color": "#ecfdf5",
        "border_color": "#a7f3d0",
        "x": 1170, "y": 140, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "category_id", "type": "uuid", "fk": "categories.id"},
            {"name": "name", "type": "varchar(250)"},
            {"name": "slug", "type": "varchar(280)", "uk": True},
            {"name": "weave_type", "type": "silk_weave_type"},
            {"name": "raw_material", "type": "varchar(150)"},
            {"name": "description", "type": "text"},
            {"name": "cultural_story", "type": "text"},
            {"name": "price", "type": "numeric(12,2)"},
            {"name": "stock_quantity", "type": "integer"},
            {"name": "media_urls", "type": "text[]"},
            {"name": "is_unique_piece", "type": "boolean"},
            {"name": "is_published", "type": "boolean"},
            {"name": "average_rating", "type": "numeric(3,2)"},
            {"name": "total_reviews", "type": "integer"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "cart_items",
        "name": "cart_items",
        "title": "Giỏ hàng B2C của khách",
        "domain": "B2C & RETAIL",
        "color": "#be123c",
        "bg_color": "#fff1f2",
        "border_color": "#fecdd3",
        "x": 1170, "y": 820, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "user_id", "type": "uuid", "fk": "users.id"},
            {"name": "product_id", "type": "uuid", "fk": "products.id"},
            {"name": "quantity", "type": "integer"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "reviews",
        "name": "reviews",
        "title": "Đánh giá & Xếp hạng 1-5 sao",
        "domain": "B2C & RETAIL",
        "color": "#be123c",
        "bg_color": "#fff1f2",
        "border_color": "#fecdd3",
        "x": 1170, "y": 1110, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "buyer_id", "type": "uuid", "fk": "users.id"},
            {"name": "target_type", "type": "target_type (ENUM)"},
            {"name": "product_id", "type": "uuid", "fk": "products.id"},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "retail_order_id", "type": "uuid", "fk": "retail_orders.id"},
            {"name": "quotation_request_id", "type": "uuid", "fk": "quotation_requests.id"},
            {"name": "rating", "type": "smallint (1..5)"},
            {"name": "comment", "type": "text"},
            {"name": "media_urls", "type": "text[]"},
            {"name": "is_verified_purchase", "type": "boolean"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },

    # Column 4: B2B Wholesale, Bidding & QR Batches (x = 1750, w = 530)
    {
        "id": "quotation_requests",
        "name": "quotation_requests",
        "title": "Yêu cầu Báo giá Đơn sỉ B2B",
        "domain": "B2B WHOLESALE",
        "color": "#6d28d9",
        "bg_color": "#f5f3ff",
        "border_color": "#ddd6fe",
        "x": 1750, "y": 140, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "buyer_id", "type": "uuid", "fk": "users.id"},
            {"name": "target_artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "title", "type": "varchar(200)"},
            {"name": "expected_quantity", "type": "integer"},
            {"name": "max_budget", "type": "numeric(14,2)"},
            {"name": "preferred_weave_type", "type": "weave_type"},
            {"name": "deadline", "type": "date"},
            {"name": "attachments", "type": "text[]"},
            {"name": "status", "type": "quote_status (ENUM)"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "bids",
        "name": "bids",
        "title": "Các Hộ Dệt Chào Giá Thầu",
        "domain": "B2B WHOLESALE",
        "color": "#6d28d9",
        "bg_color": "#f5f3ff",
        "border_color": "#ddd6fe",
        "x": 1750, "y": 600, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "quotation_request_id", "type": "uuid", "fk": "quotation_requests.id"},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "proposed_price", "type": "numeric(12,2)"},
            {"name": "proposed_completion_days", "type": "integer"},
            {"name": "note", "type": "text"},
            {"name": "sample_images", "type": "text[]"},
            {"name": "status", "type": "bid_status (ENUM)"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "order_assignments",
        "name": "order_assignments",
        "title": "BQL Phân Bổ Sản Xuất Đơn Sỉ",
        "domain": "B2B WHOLESALE",
        "color": "#6d28d9",
        "bg_color": "#f5f3ff",
        "border_color": "#ddd6fe",
        "x": 1750, "y": 1000, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "quotation_request_id", "type": "uuid", "fk": "quotation_requests.id"},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "bid_id", "type": "uuid", "fk": "bids.id"},
            {"name": "allocated_quantity", "type": "integer"},
            {"name": "agreed_price", "type": "numeric(12,2)"},
            {"name": "status", "type": "assignment_status (ENUM)"},
            {"name": "started_at", "type": "timestamptz"},
            {"name": "completed_at", "type": "timestamptz"},
            {"name": "notes", "type": "text"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "product_batches",
        "name": "product_batches",
        "title": "Lô Sản Xuất & Mã Tem QR",
        "domain": "QR TRACEABILITY",
        "color": "#0f766e",
        "bg_color": "#f0fdfa",
        "border_color": "#99f6e4",
        "x": 1750, "y": 1470, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "product_id", "type": "uuid", "fk": "products.id"},
            {"name": "order_assignment_id", "type": "uuid", "fk": "order_assignments.id"},
            {"name": "batch_code", "type": "varchar(50)", "uk": True},
            {"name": "qr_code_url", "type": "varchar(500)"},
            {"name": "total_quantity", "type": "integer"},
            {"name": "status", "type": "batch_status (ENUM)"},
            {"name": "started_at", "type": "date"},
            {"name": "completed_at", "type": "date"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "batch_logs",
        "name": "batch_logs",
        "title": "Nhật Ký 5 Công Đoạn Dệt Lụa",
        "domain": "QR TRACEABILITY",
        "color": "#0f766e",
        "bg_color": "#f0fdfa",
        "border_color": "#99f6e4",
        "x": 1750, "y": 1910, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "batch_id", "type": "uuid", "fk": "product_batches.id"},
            {"name": "stage", "type": "silk_production_stage"},
            {"name": "stage_title", "type": "varchar(150)"},
            {"name": "description", "type": "text"},
            {"name": "evidence_images", "type": "text[]"},
            {"name": "logged_at", "type": "timestamptz"},
            {"name": "step_order", "type": "integer"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    },

    # Column 5: Retail Orders (x = 2330, w = 530)
    {
        "id": "retail_orders",
        "name": "retail_orders",
        "title": "Đơn Hàng Mua Lẻ (B2C)",
        "domain": "B2C & RETAIL",
        "color": "#be123c",
        "bg_color": "#fff1f2",
        "border_color": "#fecdd3",
        "x": 2330, "y": 140, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "order_code", "type": "varchar(50)", "uk": True},
            {"name": "buyer_id", "type": "uuid", "fk": "users.id"},
            {"name": "recipient_name", "type": "varchar(120)"},
            {"name": "recipient_phone", "type": "varchar(20)"},
            {"name": "shipping_address", "type": "text"},
            {"name": "total_amount", "type": "numeric(12,2)"},
            {"name": "payment_method", "type": "method (ENUM)"},
            {"name": "payment_status", "type": "status (ENUM)"},
            {"name": "status", "type": "order_status (ENUM)"},
            {"name": "created_at", "type": "timestamptz"},
            {"name": "updated_at", "type": "timestamptz"}
        ]
    },
    {
        "id": "retail_order_items",
        "name": "retail_order_items",
        "title": "Chi Tiết Sản Phẩm Đơn Lẻ",
        "domain": "B2C & RETAIL",
        "color": "#be123c",
        "bg_color": "#fff1f2",
        "border_color": "#fecdd3",
        "x": 2330, "y": 620, "w": 530,
        "fields": [
            {"name": "id", "type": "uuid", "pk": True},
            {"name": "order_id", "type": "uuid", "fk": "retail_orders.id"},
            {"name": "product_id", "type": "uuid", "fk": "products.id"},
            {"name": "artisan_id", "type": "uuid", "fk": "artisan_profiles.id"},
            {"name": "quantity", "type": "integer"},
            {"name": "unit_price", "type": "numeric(12,2)"},
            {"name": "subtotal", "type": "numeric(12,2)"},
            {"name": "created_at", "type": "timestamptz"}
        ]
    }
]

relations = [
    # Auth & Users connections
    {"from": "artisan_profiles", "to": "users", "color": "#1d4ed8", "style": "solid", "label": "1:1 owns"},
    {"from": "audit_logs", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "logs"},
    {"from": "notifications", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "receives"},
    {"from": "community_news", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "authored by"},
    
    # Artisan connections
    {"from": "artisan_certificates", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "certified"},
    {"from": "products", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "crafts"},
    
    # Products & Categories
    {"from": "products", "to": "categories", "color": "#047857", "style": "solid", "label": "categorized"},
    {"from": "cart_items", "to": "products", "color": "#047857", "style": "solid", "label": "in cart"},
    {"from": "cart_items", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "user cart"},
    
    # B2B Flow
    {"from": "quotation_requests", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "requested by"},
    {"from": "quotation_requests", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "targeted to"},
    {"from": "bids", "to": "quotation_requests", "color": "#6d28d9", "style": "solid", "label": "bids on"},
    {"from": "bids", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "placed by"},
    {"from": "order_assignments", "to": "quotation_requests", "color": "#6d28d9", "style": "solid", "label": "assigned from"},
    {"from": "order_assignments", "to": "bids", "color": "#6d28d9", "style": "solid", "label": "winning bid"},
    {"from": "order_assignments", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "produced by"},
    
    # QR Batches Flow
    {"from": "product_batches", "to": "products", "color": "#047857", "style": "solid", "label": "retail batch"},
    {"from": "product_batches", "to": "order_assignments", "color": "#6d28d9", "style": "solid", "label": "wholesale batch"},
    {"from": "batch_logs", "to": "product_batches", "color": "#0f766e", "style": "solid", "label": "5 silk steps"},
    
    # B2C Orders Flow
    {"from": "retail_orders", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "ordered by"},
    {"from": "retail_order_items", "to": "retail_orders", "color": "#be123c", "style": "solid", "label": "order item"},
    {"from": "retail_order_items", "to": "products", "color": "#047857", "style": "solid", "label": "silk item"},
    {"from": "retail_order_items", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "fulfilled by"},
    
    # Reviews Flow
    {"from": "reviews", "to": "users", "color": "#1d4ed8", "style": "dashed", "label": "reviewed by"},
    {"from": "reviews", "to": "products", "color": "#047857", "style": "solid", "label": "reviewed product"},
    {"from": "reviews", "to": "artisan_profiles", "color": "#b45309", "style": "solid", "label": "reviewed workshop"}
]

html = f"""<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>vCraft - Physical ERD Database Schema (High Resolution)</title>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background-color: #f8fafc;
      background-image: 
        radial-gradient(#cbd5e1 1.2px, transparent 1.2px),
        radial-gradient(#cbd5e1 1.2px, #f8fafc 1.2px);
      background-size: 28px 28px;
      background-position: 0 0, 14px 14px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      width: 2950px;
      height: 2360px;
      position: relative;
      overflow: hidden;
    }}

    .banner {{
      position: absolute;
      top: 25px;
      left: 60px;
      right: 90px;
      height: 78px;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      z-index: 100;
    }}
    .banner-title {{
      display: flex;
      align-items: center;
      gap: 16px;
    }}
    .banner-title h1 {{
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }}
    .badge-main {{
      background: #0284c7;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .legend {{
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 13.5px;
      font-weight: 700;
      color: #334155;
    }}
    .legend-item {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .dot {{ width: 13px; height: 13px; border-radius: 50%; }}

    #svg-canvas {{
      position: absolute;
      top: 0;
      left: 0;
      width: 2950px;
      height: 2360px;
      z-index: 10;
      pointer-events: none;
    }}

    .table-card {{
      position: absolute;
      background: #ffffff;
      border-radius: 10px;
      border: 2px solid;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04);
      z-index: 20;
      overflow: hidden;
    }}
    .table-header {{
      padding: 10px 14px;
      border-bottom: 1.5px solid;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .table-name {{
      font-size: 15.5px;
      font-weight: 800;
      letter-spacing: -0.3px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .table-domain {{
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }}
    .table-title {{
      font-size: 11.5px;
      color: #64748b;
      font-weight: 700;
      padding: 5px 14px 6px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }}
    .table-body {{
      padding: 4px 0;
    }}
    .table-row {{
      display: flex;
      align-items: center;
      padding: 3px 14px;
      font-size: 12px;
      line-height: 1.4;
      border-bottom: 1px solid #f1f5f9;
    }}
    .table-row:last-child {{
      border-bottom: none;
    }}
    .table-row:nth-child(even) {{
      background: #fafbfc;
    }}
    .col-key {{
      width: 48px;
      flex-shrink: 0;
    }}
    .badge-pk {{
      background: #fef3c7;
      color: #b45309;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #fcd34d;
      font-family: 'Fira Code', monospace;
    }}
    .badge-fk {{
      background: #e0f2fe;
      color: #0369a1;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #bae6fd;
      font-family: 'Fira Code', monospace;
    }}
    .badge-uk {{
      background: #f3e8ff;
      color: #7e22ce;
      font-size: 9.5px;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 3px;
      border: 1px solid #e9d5ff;
      font-family: 'Fira Code', monospace;
    }}
    .col-name {{
      flex: 1;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.2px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
    }}
    .col-type {{
      color: #475569;
      font-size: 11px;
      font-family: 'Fira Code', monospace;
      text-align: right;
    }}

    .footer-bar {{
      position: absolute;
      bottom: 18px;
      left: 60px;
      right: 90px;
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 13px;
      font-weight: 700;
      background: #ffffff;
      padding: 10px 24px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
    }}
  </style>
</head>
<body>

  <div class="banner">
    <div class="banner-title">
      <h1>vCraft Database Schema (PostgreSQL 18.6)</h1>
      <span class="badge-main">17 Tables - Chuẩn 3NF</span>
      <span style="font-size: 13.5px; color: #475569; font-weight: 700;">Làng Lụa Tơ Tằm Vạn Phúc (Hà Đông, Hà Nội) - INT3306</span>
    </div>
    <div class="legend">
      <div class="legend-item"><span class="dot" style="background:#1d4ed8"></span> Auth & Core</div>
      <div class="legend-item"><span class="dot" style="background:#b45309"></span> Artisans & Map</div>
      <div class="legend-item"><span class="dot" style="background:#047857"></span> Catalog & Silk</div>
      <div class="legend-item"><span class="dot" style="background:#6d28d9"></span> B2B Wholesale</div>
      <div class="legend-item"><span class="dot" style="background:#0f766e"></span> QR Batches</div>
      <div class="legend-item"><span class="dot" style="background:#be123c"></span> B2C Retail</div>
    </div>
  </div>

  <svg id="svg-canvas" xmlns="http://www.w3.org/2000/svg">
  </svg>
"""

for t in tables:
    rows = []
    for f in t["fields"]:
        key_badge = ""
        if f.get("pk"):
            key_badge = '<span class="badge-pk">PK</span>'
        elif f.get("fk"):
            if f.get("uk"):
                key_badge = '<span class="badge-fk">FK</span> <span class="badge-uk">UK</span>'
            else:
                key_badge = '<span class="badge-fk">FK</span>'
        elif f.get("uk"):
            key_badge = '<span class="badge-uk">UK</span>'
        
        rows.append(f"""
          <div class="table-row">
            <div class="col-key">{key_badge}</div>
            <div class="col-name">{f['name']}</div>
            <div class="col-type">{f.get('type')}</div>
          </div>
        """)
    
    rows_str = "".join(rows)
    card = f"""
    <div id="table-{t['id']}" class="table-card" style="left: {t['x']}px; top: {t['y']}px; width: {t['w']}px; border-color: {t['border_color']};">
      <div class="table-header" style="background: {t['bg_color']}; border-bottom-color: {t['border_color']};">
        <div class="table-name" style="color: {t['color']};">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="{t['color']}" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          {t['name']}
        </div>
        <div class="table-domain" style="background: {t['color']}; color: white;">{t['domain']}</div>
      </div>
      <div class="table-title">{t['title']}</div>
      <div class="table-body">
        {rows_str}
      </div>
    </div>
    """
    html += card

html += f"""
  <script>
    const relations = {json.dumps(relations)};
    
    window.addEventListener('DOMContentLoaded', () => {{
      const svg = document.getElementById('svg-canvas');
      
      relations.forEach(rel => {{
        const fromTable = document.getElementById('table-' + rel.from);
        const toTable = document.getElementById('table-' + rel.to);
        if (!fromTable || !toTable) return;
        
        const fromRect = fromTable.getBoundingClientRect();
        const toRect = toTable.getBoundingClientRect();
        
        let startX, startY, endX, endY, cx1, cy1, cx2, cy2;
        
        if (fromRect.left > toRect.right + 20) {{
          startX = fromRect.left;
          startY = fromRect.top + 35;
          endX = toRect.right;
          endY = toRect.top + 35;
          const dx = Math.abs(startX - endX) * 0.5;
          cx1 = startX - dx;
          cy1 = startY;
          cx2 = endX + dx;
          cy2 = endY;
        }} else if (toRect.left > fromRect.right + 20) {{
          startX = fromRect.right;
          startY = fromRect.top + 35;
          endX = toRect.left;
          endY = toRect.top + 35;
          const dx = Math.abs(endX - startX) * 0.5;
          cx1 = startX + dx;
          cy1 = startY;
          cx2 = endX - dx;
          cy2 = endY;
        }} else {{
          if (fromRect.top > toRect.bottom) {{
            startX = fromRect.left + 50;
            startY = fromRect.top;
            endX = toRect.left + 50;
            endY = toRect.bottom;
            const dy = Math.abs(startY - endY) * 0.5;
            cx1 = startX;
            cy1 = startY - dy;
            cx2 = endX;
            cy2 = endY + dy;
          }} else {{
            startX = fromRect.left + 70;
            startY = fromRect.bottom;
            endX = toRect.left + 70;
            endY = toRect.top;
            const dy = Math.abs(endY - startY) * 0.5;
            cx1 = startX;
            cy1 = startY + dy;
            cx2 = endX;
            cy2 = endY - dy;
          }}
        }}
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const d = `M ${{startX}} ${{startY}} C ${{cx1}} ${{cy1}}, ${{cx2}} ${{cy2}}, ${{endX}} ${{endY}}`;
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', rel.color);
        path.setAttribute('stroke-width', '2.4');
        path.setAttribute('stroke-dasharray', rel.style === 'dashed' ? '5 4' : 'none');
        path.setAttribute('opacity', '0.85');
        svg.appendChild(path);
        
        const circleStart = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleStart.setAttribute('cx', startX);
        circleStart.setAttribute('cy', startY);
        circleStart.setAttribute('r', '4.5');
        circleStart.setAttribute('fill', rel.color);
        svg.appendChild(circleStart);

        const circleEnd = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        circleEnd.setAttribute('x', endX - 3.5);
        circleEnd.setAttribute('y', endY - 7);
        circleEnd.setAttribute('width', '7');
        circleEnd.setAttribute('height', '14');
        circleEnd.setAttribute('rx', '1.5');
        circleEnd.setAttribute('fill', rel.color);
        svg.appendChild(circleEnd);
      }});
    }});
  </script>
"""

html += """
  <div class="footer-bar">
    <div><strong>Dự án:</strong> vCraft - Triển lãm số & Giao thương Làng nghề Lụa Vạn Phúc (Hà Đông, Hà Nội)</div>
    <div><strong>Môn học:</strong> INT3306 - Phát triển ứng dụng Web (Fall 2026, VNU-UET)</div>
    <div><strong>Hệ Quản trị CSDL:</strong> PostgreSQL 18.6 | Chuẩn hóa 3NF | 17 Bảng Dữ liệu | 28 Ràng buộc Khóa ngoại</div>
  </div>
</body>
</html>
"""

with open("docs/erd_high_contrast.html", "w", encoding="utf-8") as f:
    f.write(html)
print("Saved docs/erd_high_contrast.html successfully!")
