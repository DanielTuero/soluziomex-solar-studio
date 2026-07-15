import type { MaintenanceFrequency, Project, ProjectCost, ProjectItem, RevenueModel } from "./types";

export const maintenanceOccurrences: Record<MaintenanceFrequency, number> = {
  Monthly: 12,
  Quarterly: 4,
  Semiannual: 2,
  Annual: 1,
};

export function annualMaintenanceCost(cost: ProjectCost) {
  const frequency = cost.maintenance_frequency || "Monthly";
  return Number(cost.amount) * maintenanceOccurrences[frequency];
}

export type Economics = {
  equipmentCost: number;
  installationServicesCost: number;
  softCosts: number;
  totalProjectCost: number;
  monthlyMaintenanceCost: number;
  monthlyInstallerPayment: number;
  monthlyPlatformCash: number;
  yearOneGeneration: number;
  yearOneBillSavings: number;
  yearOneRevenue: number;
  customerNetSavings: number;
  monthlyPreviousCfeBill: number;
  monthlyResidualCfeBill: number;
  monthlyTotalCustomerOutlay: number;
  monthlyCustomerSavings: number;
  customerDiscountPct: number;
  installerYearOne: number;
  maintenanceYearOne: number;
  platformYearOne: number;
  projectPaybackYears: number | null;
  contractRevenue: number;
  contractPlatformCash: number;
  customerLifetimeSavings: number;
  roiPct: number;
  npv: number;
  series: Array<{
    year: number;
    billSavings: number;
    customerFee: number;
    customerNetSavings: number;
    installer: number;
    maintenance: number;
    platform: number;
    cumulativePlatform: number;
  }>;
};

export function calculateEconomics(
  project: Project,
  items: ProjectItem[],
  costs: ProjectCost[],
  revenue: RevenueModel,
): Economics {
  const equipmentCost = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unit_price), 0);
  const installationServicesCost = costs
    .filter((cost) => (cost.cost_category || "Installation") === "Installation")
    .reduce((sum, cost) => sum + Number(cost.amount), 0);
  const maintenanceYearOne = costs
    .filter((cost) => cost.cost_category === "Maintenance")
    .reduce((sum, cost) => sum + annualMaintenanceCost(cost), 0);
  const monthlyMaintenanceCost = maintenanceYearOne / 12;
  const softCosts = installationServicesCost;
  const totalProjectCost = equipmentCost + installationServicesCost;
  const yearOneGeneration = Number(project.capacity_kw) * Number(project.specific_yield_kwh_kw);
  const usefulEnergy = Math.min(yearOneGeneration, Number(project.annual_usage_kwh));
  const monthlyPreviousCfeBill = Number(revenue.previous_cfe_monthly_bill || 0);
  const monthlyResidualCfeBill = Number(revenue.residual_cfe_monthly_bill || 0);
  const hasCfeBillBreakdown = monthlyPreviousCfeBill > 0;
  const modeledYearOneBillSavings = usefulEnergy * Number(project.electricity_rate);
  const yearOneBillSavings = hasCfeBillBreakdown
    ? Math.max(0, monthlyPreviousCfeBill - monthlyResidualCfeBill) * 12
    : modeledYearOneBillSavings;
  const yearOneRevenue = Number(revenue.monthly_customer_fee) * 12;
  const customerNetSavings = yearOneBillSavings - yearOneRevenue;
  const monthlyTotalCustomerOutlay = monthlyResidualCfeBill + Number(revenue.monthly_customer_fee);
  const monthlyCustomerSavings = hasCfeBillBreakdown ? monthlyPreviousCfeBill - monthlyTotalCustomerOutlay : 0;
  const customerDiscountPct = monthlyPreviousCfeBill > 0 ? monthlyCustomerSavings / monthlyPreviousCfeBill * 100 : 0;
  const monthlyInstallerPayment = Number(revenue.monthly_installer_payment || 0);
  const monthlyPlatformCash = Number(revenue.monthly_customer_fee) - monthlyInstallerPayment - monthlyMaintenanceCost;
  const installerYearOne = monthlyInstallerPayment * 12;
  const platformYearOne = yearOneRevenue - installerYearOne - maintenanceYearOne;
  const series: Economics["series"] = [];
  let cumulativePlatform = -totalProjectCost;
  let contractRevenue = 0;
  let contractPlatformCash = 0;
  let customerLifetimeSavings = 0;
  let npv = -totalProjectCost;
  let projectPaybackYears: number | null = null;

  for (let year = 1; year <= Number(revenue.contract_years); year += 1) {
    const generation = usefulEnergy * Math.pow(1 - Number(project.degradation_pct) / 100, year - 1);
    const rate = Number(project.electricity_rate) * Math.pow(1 + Number(project.utility_escalation_pct) / 100, year - 1);
    const billSavings = hasCfeBillBreakdown
      ? Math.max(0, monthlyPreviousCfeBill - monthlyResidualCfeBill) * 12 * Math.pow(1 + Number(project.utility_escalation_pct) / 100, year - 1)
      : generation * rate;
    const customerFee = yearOneRevenue * Math.pow(1 + Number(revenue.annual_fee_escalation_pct) / 100, year - 1);
    const installer = installerYearOne;
    const maintenance = maintenanceYearOne;
    const platform = customerFee - installer - maintenance;
    const customerSavings = billSavings - customerFee;
    const cumulativeBeforeYear = cumulativePlatform;
    cumulativePlatform += platform;
    contractRevenue += customerFee;
    contractPlatformCash += platform;
    customerLifetimeSavings += customerSavings;
    npv += platform / Math.pow(1 + Number(revenue.discount_rate_pct) / 100, year);
    if (projectPaybackYears === null && cumulativePlatform >= 0) {
      const fractionOfYear = platform > 0 ? Math.max(0, Math.min(1, -cumulativeBeforeYear / platform)) : 1;
      projectPaybackYears = Math.round(((year - 1) + fractionOfYear) * 10) / 10;
    }
    series.push({ year, billSavings, customerFee, customerNetSavings: customerSavings, installer, maintenance, platform, cumulativePlatform });
  }

  const roiPct = totalProjectCost > 0 ? ((contractPlatformCash - totalProjectCost) / totalProjectCost) * 100 : 0;
  return {
    equipmentCost,
    installationServicesCost,
    softCosts,
    totalProjectCost,
    monthlyMaintenanceCost,
    monthlyInstallerPayment,
    monthlyPlatformCash,
    yearOneGeneration,
    yearOneBillSavings,
    yearOneRevenue,
    customerNetSavings,
    monthlyPreviousCfeBill,
    monthlyResidualCfeBill,
    monthlyTotalCustomerOutlay,
    monthlyCustomerSavings,
    customerDiscountPct,
    installerYearOne,
    maintenanceYearOne,
    platformYearOne,
    projectPaybackYears,
    contractRevenue,
    contractPlatformCash,
    customerLifetimeSavings,
    roiPct,
    npv,
    series,
  };
}

export function money(value: number, compact = false) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: compact ? 0 : 2,
    notation: compact ? "compact" : "standard",
  }).format(Number.isFinite(value) ? value : 0);
}

export function number(value: number, digits = 0) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}
