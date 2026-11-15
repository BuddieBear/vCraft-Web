BEGIN;
ALTER TABLE quotation_requests DROP CONSTRAINT quotation_requests_target_artisan_id_fkey;
ALTER TABLE quotation_requests ADD CONSTRAINT quotation_requests_target_artisan_id_fkey
  FOREIGN KEY (target_artisan_id) REFERENCES artisan_profiles(id) ON DELETE RESTRICT;
COMMIT;
