ALTER TABLE revenue_models ADD COLUMN previous_cfe_monthly_bill numeric(14,2) NOT NULL DEFAULT 0 CHECK (previous_cfe_monthly_bill >= 0);

ALTER TABLE revenue_models ADD COLUMN residual_cfe_monthly_bill numeric(14,2) NOT NULL DEFAULT 0 CHECK (residual_cfe_monthly_bill >= 0);
