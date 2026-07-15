CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  manufacturer text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT '',
  unit_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  currency char(3) NOT NULL DEFAULT 'MXN',
  lead_time_days integer NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  status text NOT NULL DEFAULT 'Available',
  description text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_images (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  mime_type text NOT NULL,
  bytes bytea NOT NULL,
  file_name text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  customer_name text NOT NULL,
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Prospect',
  capacity_kw numeric(12,2) NOT NULL DEFAULT 0,
  annual_usage_kwh numeric(14,2) NOT NULL DEFAULT 0,
  electricity_rate numeric(12,4) NOT NULL DEFAULT 0,
  utility_escalation_pct numeric(7,3) NOT NULL DEFAULT 5,
  specific_yield_kwh_kw numeric(12,2) NOT NULL DEFAULT 1650,
  degradation_pct numeric(7,3) NOT NULL DEFAULT 0.5,
  target_install_date date,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_items (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric(12,2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  supplier text NOT NULL DEFAULT '',
  expected_delivery date,
  status text NOT NULL DEFAULT 'Planned',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_costs (
  id uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  cost_category text NOT NULL DEFAULT 'Installation' CHECK (cost_category IN ('Installation', 'Maintenance')),
  cost_type text NOT NULL,
  label text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revenue_models (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  monthly_customer_fee numeric(14,2) NOT NULL DEFAULT 0,
  contract_years integer NOT NULL DEFAULT 15 CHECK (contract_years BETWEEN 1 AND 40),
  installer_share_pct numeric(7,3) NOT NULL DEFAULT 10,
  maintenance_reserve_pct numeric(7,3) NOT NULL DEFAULT 8,
  platform_share_pct numeric(7,3) NOT NULL DEFAULT 82,
  annual_fee_escalation_pct numeric(7,3) NOT NULL DEFAULT 3,
  discount_rate_pct numeric(7,3) NOT NULL DEFAULT 10,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (installer_share_pct + maintenance_reserve_pct + platform_share_pct = 100)
);

CREATE TABLE IF NOT EXISTS app_security (
  id integer PRIMARY KEY CHECK (id = 1),
  passcode_hash text NOT NULL DEFAULT '',
  passcode_enabled boolean NOT NULL DEFAULT false,
  session_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO app_security (id, session_secret)
VALUES (1, lower(hex(randomblob(32))))
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS project_items_project_idx ON project_items(project_id);
CREATE INDEX IF NOT EXISTS project_costs_project_idx ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);

INSERT INTO products (sku, name, category, manufacturer, model, unit_cost, lead_time_days, status, description)
VALUES
  ('PAN-JKM-585', 'Tiger Neo N-type 585 W', 'Solar panels', 'JinkoSolar', 'JKM585N-72HL4', 2690, 21, 'Available', 'N-type TOPCon bifacial module for commercial rooftops.'),
  ('PAN-CAN-550', 'HiKu6 Mono PERC 550 W', 'Solar panels', 'Canadian Solar', 'CS6W-550MS', 2410, 18, 'Available', 'High-power mono PERC module.'),
  ('INV-HUA-100', 'SUN2000 100 kW inverter', 'Inverters', 'Huawei', 'SUN2000-100KTL-M2', 142500, 30, 'Low stock', 'Three-phase smart string inverter.'),
  ('INV-SMA-50', 'Sunny Tripower CORE1 50 kW', 'Inverters', 'SMA', 'STP50-US-41', 128900, 35, 'Available', 'Free-standing commercial string inverter.'),
  ('RAC-SCH-01', 'Commercial aluminum racking kit', 'Racking', 'Schletter', 'FixGrid Pro', 1840, 14, 'Available', 'Per-module rooftop racking allowance.'),
  ('CAB-PV-6', 'PV cable 6 mm²', 'Cables', 'Top Cable', 'H1Z2Z2-K', 38, 8, 'Available', 'UV-resistant solar cable, price per meter.'),
  ('MON-HUA-01', 'SmartLogger monitoring gateway', 'Monitoring', 'Huawei', 'SmartLogger3000A', 38900, 25, 'Available', 'Plant-level communications and monitoring.'),
  ('ELE-BOS-01', 'Commercial AC/DC BOS allowance', 'Electrical', 'Local supply', 'BOS-COM', 96500, 10, 'Available', 'Combiner, breakers, disconnects, conduit and labels.')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO projects (code, name, customer_name, location, status, capacity_kw, annual_usage_kwh, electricity_rate, utility_escalation_pct, specific_yield_kwh_kw, degradation_pct, target_install_date)
  VALUES
    ('SLX-26001', 'Monterrey Distribution Center', 'NorteLogística S.A.', 'Monterrey, Nuevo León', 'Procurement', 485.55, 1120000, 3.18, 5.5, 1720, 0.45, date('now', '+42 days')),
    ('SLX-26002', 'Querétaro Cold Storage', 'Frío Central MX', 'El Marqués, Querétaro', 'Design', 298.35, 745000, 3.42, 5.2, 1680, 0.45, date('now', '+78 days')),
    ('SLX-26003', 'Puebla Manufacturing Plant', 'Componentes del Centro', 'Puebla, Puebla', 'Prospect', 712.40, 1680000, 3.06, 5.8, 1660, 0.45, date('now', '+110 days'))
  ON CONFLICT (code) DO NOTHING;

INSERT INTO project_items (project_id, product_id, quantity, unit_price, supplier, expected_delivery, status)
SELECT p.id, pr.id,
  CASE pr.sku WHEN 'PAN-JKM-585' THEN 830 WHEN 'INV-HUA-100' THEN 5 WHEN 'RAC-SCH-01' THEN 830 WHEN 'CAB-PV-6' THEN 7200 WHEN 'MON-HUA-01' THEN 1 ELSE 1 END,
  pr.unit_cost, CASE WHEN pr.category = 'Solar panels' THEN 'Energia Solar del Norte' ELSE 'TecnoVolt MX' END,
  CURRENT_DATE + CASE WHEN pr.category = 'Solar panels' THEN 24 ELSE 31 END,
  CASE WHEN pr.category = 'Solar panels' THEN 'Ordered' ELSE 'Quoted' END
FROM projects p
JOIN products pr ON pr.sku IN ('PAN-JKM-585','INV-HUA-100','RAC-SCH-01','CAB-PV-6','MON-HUA-01','ELE-BOS-01')
WHERE p.code = 'SLX-26001'
AND NOT EXISTS (SELECT 1 FROM project_items i WHERE i.project_id = p.id AND i.product_id = pr.id);

INSERT INTO project_items (project_id, product_id, quantity, unit_price, supplier, expected_delivery, status)
SELECT p.id, pr.id,
  CASE pr.sku WHEN 'PAN-CAN-550' THEN 543 WHEN 'INV-SMA-50' THEN 6 WHEN 'RAC-SCH-01' THEN 543 WHEN 'CAB-PV-6' THEN 4900 ELSE 1 END,
  pr.unit_cost, 'Solaris Supply MX', CURRENT_DATE + 38, 'Planned'
FROM projects p
JOIN products pr ON pr.sku IN ('PAN-CAN-550','INV-SMA-50','RAC-SCH-01','CAB-PV-6','MON-HUA-01','ELE-BOS-01')
WHERE p.code = 'SLX-26002'
AND NOT EXISTS (SELECT 1 FROM project_items i WHERE i.project_id = p.id AND i.product_id = pr.id);

WITH x(cost_type, label, amount) AS (VALUES
  ('Installation', 'Mechanical & electrical labor', 1185000),
  ('Logistics', 'Freight and site handling', 218000),
  ('Permits', 'Permits, interconnection & studies', 175000),
  ('Engineering', 'Detailed engineering', 285000),
  ('Contingency', 'Construction contingency', 420000)
)
INSERT INTO project_costs (project_id, cost_type, label, amount)
SELECT p.id, x.cost_type, x.label, x.amount
FROM projects p
CROSS JOIN x
WHERE p.code = 'SLX-26001'
AND NOT EXISTS (SELECT 1 FROM project_costs c WHERE c.project_id = p.id);

WITH x(cost_type, label, amount) AS (VALUES
  ('Installation', 'Mechanical & electrical labor', 790000),
  ('Logistics', 'Freight and site handling', 146000),
  ('Permits', 'Permits, interconnection & studies', 132000),
  ('Engineering', 'Detailed engineering', 190000),
  ('Contingency', 'Construction contingency', 280000)
)
INSERT INTO project_costs (project_id, cost_type, label, amount)
SELECT p.id, x.cost_type, x.label, x.amount
FROM projects p
CROSS JOIN x
WHERE p.code = 'SLX-26002'
AND NOT EXISTS (SELECT 1 FROM project_costs c WHERE c.project_id = p.id);

INSERT INTO revenue_models (project_id, monthly_customer_fee, contract_years, installer_share_pct, maintenance_reserve_pct, platform_share_pct, annual_fee_escalation_pct, discount_rate_pct)
SELECT id,
  CASE code WHEN 'SLX-26001' THEN 124000 WHEN 'SLX-26002' THEN 81000 ELSE 186000 END,
  15, 10, 8, 82, 3, 10
FROM projects
WHERE true
ON CONFLICT (project_id) DO NOTHING;
