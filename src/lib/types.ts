export type ProjectStatus = "Prospect" | "Design" | "Procurement" | "Installation" | "Operating";
export type ItemStatus = "Planned" | "Quoted" | "Ordered" | "In transit" | "Delivered" | "Installed";

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  unit_cost: number;
  currency: string;
  lead_time_days: number;
  status: string;
  has_image: boolean;
  description: string;
  source_url: string;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  customer_name: string;
  location: string;
  status: ProjectStatus;
  capacity_kw: number;
  annual_usage_kwh: number;
  electricity_rate: number;
  utility_escalation_pct: number;
  specific_yield_kwh_kw: number;
  degradation_pct: number;
  target_install_date: string | null;
  created_at: string;
};

export type ProjectItem = {
  id: string;
  project_id: string;
  product_id: string;
  product_name: string;
  product_model: string;
  product_category: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  supplier: string;
  expected_delivery: string | null;
  status: ItemStatus;
  notes: string;
};

export type ProjectCost = {
  id: string;
  project_id: string;
  cost_category: "Installation" | "Maintenance";
  cost_type: string;
  label: string;
  amount: number;
  notes: string;
};

export type CostCatalogEntry = {
  id: string;
  name: string;
  description: string;
};

export type PartnerType = "Installer" | "CFE Technician" | "Electrician" | "CFE Office Contact";

export type PartnerProject = {
  id: string;
  code: string;
  name: string;
  relationship: PartnerType;
};

export type PartnerQuote = {
  id: string;
  partner_id: string;
  project_id: string | null;
  project_name: string | null;
  reference: string;
  quote_date: string;
  amount: number;
  status: "Draft" | "Requested" | "Received" | "Accepted" | "Declined" | "Expired";
  notes: string;
};

export type Partner = {
  id: string;
  company_name: string;
  partner_type: PartnerType;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  products_supplied: string;
  installer_share_pct: number;
  installer_share_terms: string;
  payment_terms: string;
  performance_notes: string;
  status: "Active" | "Inactive";
  projects: PartnerProject[];
  quotes: PartnerQuote[];
};

export type AuditLog = {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  action: string;
  details: string;
  created_at: string;
};

export type DatabaseBackup = {
  name: string;
  kind: "Automatic" | "Manual" | "Imported";
  size: number;
  created_at: string;
};

export type RevenueModel = {
  project_id: string;
  previous_cfe_monthly_bill: number;
  residual_cfe_monthly_bill: number;
  monthly_customer_fee: number;
  monthly_installer_payment: number;
  contract_years: number;
  installer_share_pct: number;
  maintenance_reserve_pct: number;
  platform_share_pct: number;
  annual_fee_escalation_pct: number;
  discount_rate_pct: number;
};

export type WorkspaceData = {
  project: Project;
  items: ProjectItem[];
  costs: ProjectCost[];
  costCatalog: CostCatalogEntry[];
  revenue: RevenueModel;
  products: Product[];
};
