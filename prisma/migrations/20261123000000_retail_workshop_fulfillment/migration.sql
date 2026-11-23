CREATE TABLE retail_fulfillments (
    order_id UUID NOT NULL REFERENCES retail_orders(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
    status retail_order_status NOT NULL DEFAULT 'PENDING',
    payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    PRIMARY KEY (order_id, artisan_id)
);

INSERT INTO retail_fulfillments (order_id, artisan_id, status, payment_status)
SELECT DISTINCT orders.id, items.artisan_id, orders.status, orders.payment_status
FROM retail_orders AS orders
JOIN retail_order_items AS items ON items.order_id = orders.id;

CREATE INDEX idx_retail_fulfillments_artisan_status ON retail_fulfillments (artisan_id, status);
