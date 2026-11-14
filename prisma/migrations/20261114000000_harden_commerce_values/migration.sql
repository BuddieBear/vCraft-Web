BEGIN;
-- PostgreSQL orders numeric NaN above ordinary numbers, so positivity checks alone accept it.
ALTER TABLE products ADD CONSTRAINT chk_products_price_finite CHECK (price <> 'NaN'::numeric);
ALTER TABLE quotation_requests ADD CONSTRAINT chk_quotes_budget_finite CHECK (max_budget <> 'NaN'::numeric);
ALTER TABLE bids ADD CONSTRAINT chk_bids_price_finite CHECK (proposed_price <> 'NaN'::numeric);
ALTER TABLE order_assignments ADD CONSTRAINT chk_assignments_price_finite CHECK (agreed_price <> 'NaN'::numeric);
ALTER TABLE retail_orders ADD CONSTRAINT chk_orders_total_finite CHECK (total_amount <> 'NaN'::numeric);
ALTER TABLE retail_order_items ADD CONSTRAINT chk_order_items_price_finite CHECK (unit_price <> 'NaN'::numeric AND subtotal <> 'NaN'::numeric);

-- Existing legacy reviews may need remediation; new and modified rows must retain evidence.
ALTER TABLE reviews ADD CONSTRAINT chk_verified_review_order CHECK (
  NOT is_verified_purchase OR retail_order_id IS NOT NULL OR quotation_request_id IS NOT NULL
) NOT VALID;
COMMIT;
