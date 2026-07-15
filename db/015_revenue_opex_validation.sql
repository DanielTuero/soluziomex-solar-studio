ALTER TABLE project_validation_payments RENAME TO project_validation_payments_legacy;

CREATE TABLE project_validation_payments (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('Revenue', 'OperatingExpense', 'Item', 'Cost', 'Other')),
  source_id uuid,
  label text NOT NULL,
  projected_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (projected_amount >= 0),
  actual_amount numeric(14,2) NOT NULL CHECK (actual_amount > 0),
  vendor text NOT NULL DEFAULT '',
  paid_on date NOT NULL,
  notes text NOT NULL DEFAULT '',
  receipt_name text,
  receipt_mime text,
  receipt_bytes bytea,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO project_validation_payments
SELECT id, project_id,
       CASE
         WHEN source_type = 'Cost' AND source_id IN (
           SELECT id FROM project_costs WHERE cost_category = 'Maintenance'
         ) THEN 'OperatingExpense'
         ELSE source_type
       END,
       source_id, label, projected_amount, actual_amount, vendor, paid_on, notes,
       receipt_name, receipt_mime, receipt_bytes, created_at
FROM project_validation_payments_legacy;

DROP TABLE project_validation_payments_legacy;

CREATE INDEX project_validation_project_idx ON project_validation_payments(project_id, paid_on DESC);
CREATE INDEX project_validation_source_idx ON project_validation_payments(project_id, source_type, source_id);

CREATE TRIGGER audit_validation_insert AFTER INSERT ON project_validation_payments BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details)
  VALUES ('Validation', NEW.id, NEW.label, 'Recorded', '$' || printf('%,.2f', NEW.actual_amount) || CASE WHEN NEW.receipt_name IS NOT NULL THEN ' · receipt attached' ELSE ' · receipt missing' END);
END;

CREATE TRIGGER audit_validation_delete AFTER DELETE ON project_validation_payments BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details)
  VALUES ('Validation', OLD.id, OLD.label, 'Removed', 'Revenue or operating expense validation record removed');
END;
