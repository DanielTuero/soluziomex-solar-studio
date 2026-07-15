ALTER TABLE revenue_models
ADD COLUMN contract_scenario_years text NOT NULL DEFAULT '[10,15,20,25]';
