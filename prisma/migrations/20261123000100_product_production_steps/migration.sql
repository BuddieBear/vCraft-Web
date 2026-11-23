BEGIN;

ALTER TYPE silk_production_stage ADD VALUE 'CUSTOM';

ALTER TABLE products
    ADD COLUMN production_steps TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD CONSTRAINT chk_product_production_steps CHECK (cardinality(production_steps) <= 12);

ALTER TABLE product_batches
    ADD COLUMN production_steps TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD CONSTRAINT chk_batch_production_steps CHECK (cardinality(production_steps) <= 12);

ALTER TABLE batch_logs
    DROP CONSTRAINT batch_logs_step_order_check,
    ADD CONSTRAINT chk_batch_log_step_order CHECK (step_order BETWEEN 1 AND 12);

CREATE UNIQUE INDEX uq_batch_log_step_order ON batch_logs(batch_id, step_order);
DROP INDEX uq_batch_stage;
DROP INDEX idx_batch_logs_order;

COMMIT;
