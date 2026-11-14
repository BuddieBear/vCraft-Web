BEGIN;

CREATE OR REPLACE FUNCTION trigger_update_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    artisan_ids UUID[];
    product_ids UUID[];
BEGIN
    CASE TG_OP
        WHEN 'INSERT' THEN
            artisan_ids := ARRAY[NEW.artisan_id];
            product_ids := ARRAY[NEW.product_id];
        WHEN 'UPDATE' THEN
            artisan_ids := ARRAY[OLD.artisan_id, NEW.artisan_id];
            product_ids := ARRAY[OLD.product_id, NEW.product_id];
        WHEN 'DELETE' THEN
            artisan_ids := ARRAY[OLD.artisan_id];
            product_ids := ARRAY[OLD.product_id];
    END CASE;

    -- Lock affected targets before counting reviews committed by concurrent writers.
    PERFORM id FROM artisan_profiles WHERE id = ANY(artisan_ids)
    ORDER BY id FOR NO KEY UPDATE;
    PERFORM id FROM products WHERE id = ANY(product_ids)
    ORDER BY id FOR NO KEY UPDATE;

    UPDATE artisan_profiles AS a
    SET average_rating = COALESCE((
            SELECT ROUND(AVG(r.rating), 2) FROM reviews AS r WHERE r.artisan_id = a.id
        ), 5.00),
        total_reviews = (
            SELECT COUNT(*) FROM reviews AS r WHERE r.artisan_id = a.id
        )
    WHERE a.id = ANY(artisan_ids);

    UPDATE products AS p
    SET average_rating = COALESCE((
            SELECT ROUND(AVG(r.rating), 2) FROM reviews AS r WHERE r.product_id = p.id
        ), 5.00),
        total_reviews = (
            SELECT COUNT(*) FROM reviews AS r WHERE r.product_id = p.id
        )
    WHERE p.id = ANY(product_ids);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;
