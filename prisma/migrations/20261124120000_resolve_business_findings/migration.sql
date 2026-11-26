ALTER TABLE quotation_requests
    ALTER COLUMN preferred_weave_type DROP DEFAULT,
    ALTER COLUMN preferred_weave_type DROP NOT NULL;

ALTER TABLE bids ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;

CREATE TABLE private_legacy_images (filename VARCHAR(41) PRIMARY KEY);

INSERT INTO private_legacy_images (filename)
SELECT DISTINCT substring(image FROM '^/uploads/([a-f0-9-]{36}\.webp)$')
FROM batch_logs
JOIN product_batches ON product_batches.id = batch_logs.batch_id
CROSS JOIN LATERAL unnest(batch_logs.evidence_image_urls) AS urls(image)
WHERE product_batches.order_assignment_id IS NOT NULL
  AND image ~ '^/uploads/[a-f0-9-]{36}\.webp$';

ALTER TABLE products ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;

CREATE TABLE product_slug_aliases (
    slug VARCHAR(280) PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX product_slug_aliases_product_id_idx ON product_slug_aliases(product_id);
INSERT INTO product_slug_aliases (slug, product_id) SELECT slug, id FROM products;

CREATE FUNCTION preserve_product_slug() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO product_slug_aliases (slug, product_id) VALUES (NEW.slug, NEW.id)
    ON CONFLICT (slug) DO UPDATE SET product_id = EXCLUDED.product_id
    WHERE product_slug_aliases.product_id = EXCLUDED.product_id;
    IF NOT FOUND THEN
        RAISE unique_violation USING MESSAGE = 'Product slug is reserved', CONSTRAINT = 'product_slug_aliases_pkey';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_preserve_product_slug
    AFTER INSERT OR UPDATE OF slug ON products FOR EACH ROW EXECUTE FUNCTION preserve_product_slug();

ALTER TABLE artisan_profiles
    ADD COLUMN review_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN pending_identity JSONB,
    ADD COLUMN rejection_reason VARCHAR(2000);

UPDATE notifications AS notification
SET link_url = '/?don-hang=' || retail_order.id,
    message = regexp_replace(notification.message, ': (PENDING|CONFIRMED|SHIPPING|DELIVERED|CANCELLED)$',
        ': ' || CASE substring(notification.message FROM ': (PENDING|CONFIRMED|SHIPPING|DELIVERED|CANCELLED)$')
            WHEN 'PENDING' THEN 'Chờ xác nhận'
            WHEN 'CONFIRMED' THEN 'Đã xác nhận'
            WHEN 'SHIPPING' THEN 'Đang giao'
            WHEN 'DELIVERED' THEN 'Đã giao'
            WHEN 'CANCELLED' THEN 'Đã hủy'
        END)
FROM retail_orders AS retail_order
WHERE notification.user_id = retail_order.buyer_id
  AND notification.type = 'ORDER_STATUS'
  AND notification.link_url IS NULL
  AND notification.title IN ('Tiến độ đơn bán lẻ', 'Trạng thái đơn hàng')
  AND notification.message ~ ': (PENDING|CONFIRMED|SHIPPING|DELIVERED|CANCELLED)$'
  AND retail_order.order_code = split_part(split_part(notification.message, ' · ', 1), ': ', 1);
