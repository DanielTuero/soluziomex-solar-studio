ALTER TABLE partners ADD COLUMN partner_category text NOT NULL DEFAULT 'Installer'
  CHECK (partner_category IN ('Installer', 'CFE Technician', 'Electrician', 'CFE Office Contact'));

UPDATE partners SET partner_category='Installer' WHERE partner_type IN ('Installer', 'Both');
UPDATE partners SET is_archived=true WHERE partner_type='Supplier';

DROP TRIGGER audit_partners_insert;
DROP TRIGGER audit_partners_update;

CREATE TRIGGER audit_partners_insert AFTER INSERT ON partners BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Partner', NEW.id, NEW.company_name, 'Created', NEW.partner_category || ' added to the directory');
END;
CREATE TRIGGER audit_partners_update AFTER UPDATE ON partners BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Partner', NEW.id, NEW.company_name, CASE WHEN NEW.is_archived AND NOT OLD.is_archived THEN 'Removed' ELSE 'Updated' END, NEW.partner_category || ' directory record changed');
END;
