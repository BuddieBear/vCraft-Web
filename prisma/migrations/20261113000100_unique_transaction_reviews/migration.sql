BEGIN;
CREATE UNIQUE INDEX uq_review_retail_product ON reviews(buyer_id, retail_order_id, product_id) WHERE retail_order_id IS NOT NULL AND target_type = 'PRODUCT';
CREATE UNIQUE INDEX uq_review_retail_artisan ON reviews(buyer_id, retail_order_id, artisan_id) WHERE retail_order_id IS NOT NULL AND target_type = 'ARTISAN';
CREATE UNIQUE INDEX uq_review_quote_product ON reviews(buyer_id, quotation_request_id, product_id) WHERE quotation_request_id IS NOT NULL AND target_type = 'PRODUCT';
CREATE UNIQUE INDEX uq_review_quote_artisan ON reviews(buyer_id, quotation_request_id, artisan_id) WHERE quotation_request_id IS NOT NULL AND target_type = 'ARTISAN';
COMMIT;
