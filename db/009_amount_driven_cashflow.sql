ALTER TABLE revenue_models
ADD COLUMN monthly_installer_payment numeric(14,2) NOT NULL DEFAULT 0 CHECK (monthly_installer_payment >= 0);

UPDATE revenue_models
SET monthly_installer_payment = monthly_customer_fee * installer_share_pct / 100;
