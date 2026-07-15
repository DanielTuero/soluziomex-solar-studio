import type { Project, ProjectCost, ProjectItem, RevenueModel } from "./types";

export type Economics = {
  equipmentCost: number;
  softCosts: number;
  totalProjectCost: number;
  yearOneGeneration: number;
  yearOneBillSavings: number;
  yearOneRevenue: number;
  customerNetSavings: number;
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
  const softCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
  const totalProjectCost = equipmentCost + softCosts;
  const yearOneGeneration = Number(project.capacity_kw) * Number(project.specific_yield_kwh_kw);
  const usefulEnergy = Math.min(yearOneGeneration, Number(project.annual_usage_kwh));
  const yearOneBillSavings = usefulEnergy * Number(project.electricity_rate);
  const yearOneRevenue = Number(revenue.monthly_customer_fee) * 12;
  const customerNetSavings = yearOneBillSavings - yearOneRevenue;
  const installerYearOne = yearOneRevenue * (Number(revenue.installer_share_pct) / 100);
  const maintenanceYearOne = yearOneRevenue * (Number(revenue.maintenance_reserve_pct) / 100);
  const platformYearOne = yearOneRevenue * (Number(revenue.platform_share_pct) / 100);
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
    const billSavings = generation * rate;
    const customerFee = yearOneRevenue * Math.pow(1 + Number(revenue.annual_fee_escalation_pct) / 100, year - 1);
    const installer = customerFee * (Number(revenue.installer_share_pct) / 100);
    const maintenance = customerFee * (Number(revenue.maintenance_reserve_pct) / 100);
    const platform = customerFee * (Number(revenue.platform_share_pct) / 100);
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
    softCosts,
    totalProjectCost,
    yearOneGeneration,
    yearOneBillSavings,
    yearOneRevenue,
    customerNetSavings,
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
