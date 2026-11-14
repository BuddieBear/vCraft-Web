BEGIN;
ALTER TABLE reviews DROP CONSTRAINT chk_review_target;
ALTER TABLE reviews ADD CONSTRAINT chk_review_target CHECK (
  (target_type = 'PRODUCT' AND product_id IS NOT NULL) OR
  (target_type = 'ARTISAN' AND product_id IS NULL)
);
ALTER TABLE reviews ADD CONSTRAINT chk_review_single_order CHECK (retail_order_id IS NULL OR quotation_request_id IS NULL);
ALTER TABLE reviews ALTER COLUMN is_verified_purchase SET DEFAULT FALSE;
COMMIT;
