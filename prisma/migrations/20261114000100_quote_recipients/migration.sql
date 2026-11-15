CREATE TABLE quote_recipients (
  quotation_request_id UUID NOT NULL REFERENCES quotation_requests(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES artisan_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quotation_request_id, artisan_id)
);
CREATE INDEX idx_quote_recipients_artisan ON quote_recipients(artisan_id);
