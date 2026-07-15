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

export type RevenueModel = {
  project_id: string;
  monthly_customer_fee: number;
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
  revenue: RevenueModel;
  products: Product[];
};
