BEGIN;

ALTER TABLE order_assignments ADD CONSTRAINT uq_assignments_id_artisan UNIQUE (id, artisan_id);
ALTER TABLE retail_orders ADD CONSTRAINT uq_retail_orders_id_buyer UNIQUE (id, buyer_id);
ALTER TABLE quotation_requests ADD CONSTRAINT uq_quotes_id_buyer UNIQUE (id, buyer_id);

-- Populate a shared ownership key before checking either reference.
ALTER TABLE product_batches ADD COLUMN artisan_id uuid;
UPDATE product_batches b SET artisan_id = p.artisan_id FROM products p WHERE p.id = b.product_id;
ALTER TABLE product_batches ALTER COLUMN artisan_id SET NOT NULL;

CREATE FUNCTION set_batch_artisan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    SELECT artisan_id INTO NEW.artisan_id FROM products WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_set_batch_artisan
BEFORE INSERT OR UPDATE OF product_id ON product_batches
FOR EACH ROW EXECUTE FUNCTION set_batch_artisan();

ALTER TABLE product_batches ADD CONSTRAINT fk_batch_product_artisan
    FOREIGN KEY (product_id, artisan_id) REFERENCES products (id, artisan_id);
ALTER TABLE product_batches ADD CONSTRAINT fk_batch_assignment_artisan
    FOREIGN KEY (order_assignment_id, artisan_id) REFERENCES order_assignments (id, artisan_id)
    ON DELETE SET NULL (order_assignment_id);

ALTER TABLE reviews ADD CONSTRAINT fk_review_retail_buyer
    FOREIGN KEY (retail_order_id, buyer_id) REFERENCES retail_orders (id, buyer_id)
    ON DELETE SET NULL (retail_order_id);
ALTER TABLE reviews ADD CONSTRAINT fk_review_quote_buyer
    FOREIGN KEY (quotation_request_id, buyer_id) REFERENCES quotation_requests (id, buyer_id)
    ON DELETE SET NULL (quotation_request_id);

COMMIT;
