BEGIN;

-- These composite keys ensure that the referenced records belong together.
ALTER TABLE products ADD CONSTRAINT uq_products_id_artisan UNIQUE (id, artisan_id);
ALTER TABLE bids ADD CONSTRAINT uq_bids_id_quote_artisan UNIQUE (id, quotation_request_id, artisan_id);

ALTER TABLE retail_order_items ADD CONSTRAINT fk_order_item_product_artisan
  FOREIGN KEY (product_id, artisan_id) REFERENCES products (id, artisan_id);
ALTER TABLE reviews ADD CONSTRAINT fk_review_product_artisan
  FOREIGN KEY (product_id, artisan_id) REFERENCES products (id, artisan_id);
ALTER TABLE order_assignments ADD CONSTRAINT fk_assignment_bid_quote_artisan
  FOREIGN KEY (bid_id, quotation_request_id, artisan_id)
  REFERENCES bids (id, quotation_request_id, artisan_id);

COMMIT;
