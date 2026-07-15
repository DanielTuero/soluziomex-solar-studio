CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  company_name text NOT NULL,
  partner_type text NOT NULL DEFAULT 'Supplier' CHECK (partner_type IN ('Supplier', 'Installer', 'Both')),
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  products_supplied text NOT NULL DEFAULT '',
  installer_share_pct numeric(7,3) NOT NULL DEFAULT 0 CHECK (installer_share_pct >= 0 AND installer_share_pct <= 100),
  payment_terms text NOT NULL DEFAULT '',
  performance_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_partners (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'Supplier' CHECK (relationship IN ('Supplier', 'Installer')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, partner_id, relationship)
);

CREATE TABLE partner_quotes (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  partner_id uuid NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  reference text NOT NULL DEFAULT '',
  quote_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'Received' CHECK (status IN ('Draft', 'Requested', 'Received', 'Accepted', 'Declined', 'Expired')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  entity_type text NOT NULL,
  entity_id text NOT NULL DEFAULT '',
  entity_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX partners_type_idx ON partners(partner_type);
CREATE INDEX project_partners_partner_idx ON project_partners(partner_id);
CREATE INDEX partner_quotes_partner_idx ON partner_quotes(partner_id);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at DESC);

CREATE TRIGGER audit_projects_insert AFTER INSERT ON projects BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Project', NEW.id, NEW.name, 'Created', 'Project created at the ' || NEW.status || ' stage');
END;
CREATE TRIGGER audit_projects_update AFTER UPDATE ON projects BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Project', NEW.id, NEW.name, 'Updated', CASE WHEN OLD.status <> NEW.status THEN 'Stage changed from ' || OLD.status || ' to ' || NEW.status ELSE 'Project details updated' END);
END;
CREATE TRIGGER audit_projects_delete AFTER DELETE ON projects BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Project', OLD.id, OLD.name, 'Removed', 'Project and its related records removed');
END;

CREATE TRIGGER audit_products_insert AFTER INSERT ON products BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Product', NEW.id, NEW.name, 'Created', NEW.category || ' · ' || NEW.sku);
END;
CREATE TRIGGER audit_products_update AFTER UPDATE ON products BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Product', NEW.id, NEW.name, CASE WHEN NEW.is_archived AND NOT OLD.is_archived THEN 'Removed' ELSE 'Updated' END, 'Product catalog entry changed');
END;
CREATE TRIGGER audit_products_delete AFTER DELETE ON products BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Product', OLD.id, OLD.name, 'Removed', 'Product deleted');
END;

CREATE TRIGGER audit_items_insert AFTER INSERT ON project_items BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Sourcing', NEW.id, COALESCE((SELECT name FROM products WHERE id=NEW.product_id), 'Product'), 'Added', 'Added to project bill of materials · quantity ' || NEW.quantity);
END;
CREATE TRIGGER audit_items_update AFTER UPDATE ON project_items BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Sourcing', NEW.id, COALESCE((SELECT name FROM products WHERE id=NEW.product_id), 'Product'), 'Updated', CASE WHEN OLD.status <> NEW.status THEN 'Sourcing status changed from ' || OLD.status || ' to ' || NEW.status ELSE 'Project sourcing details updated' END);
END;
CREATE TRIGGER audit_items_delete AFTER DELETE ON project_items BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Sourcing', OLD.id, COALESCE((SELECT name FROM products WHERE id=OLD.product_id), 'Product'), 'Removed', 'Removed from project bill of materials');
END;

CREATE TRIGGER audit_costs_insert AFTER INSERT ON project_costs BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Cost', NEW.id, NEW.label, 'Added', NEW.cost_category || ' cost · $' || printf('%,.2f', NEW.amount));
END;
CREATE TRIGGER audit_costs_update AFTER UPDATE ON project_costs BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Cost', NEW.id, NEW.label, 'Updated', NEW.cost_category || ' cost updated');
END;
CREATE TRIGGER audit_costs_delete AFTER DELETE ON project_costs BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Cost', OLD.id, OLD.label, 'Removed', OLD.cost_category || ' cost removed');
END;

CREATE TRIGGER audit_revenue_update AFTER UPDATE ON revenue_models BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Economics', NEW.project_id, COALESCE((SELECT name FROM projects WHERE id=NEW.project_id), 'Project revenue model'), 'Updated', 'Revenue, bill, or stakeholder-share assumptions changed');
END;

CREATE TRIGGER audit_cost_catalog_insert AFTER INSERT ON cost_catalog BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Cost catalog', NEW.id, NEW.name, 'Created', 'Reusable cost template added');
END;
CREATE TRIGGER audit_cost_catalog_update AFTER UPDATE ON cost_catalog BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Cost catalog', NEW.id, NEW.name, CASE WHEN NEW.is_archived AND NOT OLD.is_archived THEN 'Removed' ELSE 'Updated' END, 'Reusable cost template changed');
END;

CREATE TRIGGER audit_partners_insert AFTER INSERT ON partners BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Partner', NEW.id, NEW.company_name, 'Created', NEW.partner_type || ' added to the directory');
END;
CREATE TRIGGER audit_partners_update AFTER UPDATE ON partners BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Partner', NEW.id, NEW.company_name, CASE WHEN NEW.is_archived AND NOT OLD.is_archived THEN 'Removed' ELSE 'Updated' END, NEW.partner_type || ' directory record changed');
END;
CREATE TRIGGER audit_quotes_insert AFTER INSERT ON partner_quotes BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Quote', NEW.id, COALESCE(NULLIF(NEW.reference,''), 'Partner quote'), 'Added', 'Quote received from ' || COALESCE((SELECT company_name FROM partners WHERE id=NEW.partner_id), 'partner'));
END;
CREATE TRIGGER audit_quotes_update AFTER UPDATE ON partner_quotes BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Quote', NEW.id, COALESCE(NULLIF(NEW.reference,''), 'Partner quote'), 'Updated', 'Quote status or commercial details changed');
END;
CREATE TRIGGER audit_quotes_delete AFTER DELETE ON partner_quotes BEGIN
  INSERT INTO audit_logs (entity_type, entity_id, entity_name, action, details) VALUES ('Quote', OLD.id, COALESCE(NULLIF(OLD.reference,''), 'Partner quote'), 'Removed', 'Quote removed from partner history');
END;

INSERT INTO partners (company_name, partner_type, products_supplied, payment_terms, performance_notes)
SELECT supplier, 'Supplier', group_concat(DISTINCT p.category), 'Confirm with supplier', 'Imported from existing project sourcing records.'
FROM project_items i
JOIN products p ON p.id=i.product_id
WHERE trim(i.supplier) <> ''
GROUP BY supplier;
