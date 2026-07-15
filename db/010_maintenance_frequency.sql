ALTER TABLE project_costs
ADD COLUMN maintenance_frequency text NOT NULL DEFAULT 'Monthly'
CHECK (maintenance_frequency IN ('Monthly', 'Quarterly', 'Semiannual', 'Annual'));
