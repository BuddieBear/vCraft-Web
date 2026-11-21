ALTER TYPE quote_status ADD VALUE 'PENDING_DISPATCH' AFTER 'DRAFT';

ALTER TABLE artisan_profiles
    ADD COLUMN is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT chk_artisan_suspension_requires_approval
        CHECK (NOT is_suspended OR verification_status = 'APPROVED');
