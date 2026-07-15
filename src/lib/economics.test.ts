import { describe, expect, it } from "vitest";
import { calculateEconomics } from "./economics";
import type { Project, ProjectInstaller, RevenueModel } from "./types";

const project = {
  id: "p", code: "TEST", name: "Test", customer_name: "Customer", location: "Mexico", status: "Design",
  capacity_kw: 100, annual_usage_kwh: 200000, electricity_rate: 3, utility_escalation_pct: 5,
  specific_yield_kwh_kw: 1600, degradation_pct: .5, target_install_date: null, created_at: "2026-01-01",
} satisfies Project;

const revenue = {
  project_id: "p", previous_cfe_monthly_bill: 0, residual_cfe_monthly_bill: 0, monthly_customer_fee: 20000, contract_years: 15, contract_scenario_years:[10,15,20], installer_share_pct: 10,
  maintenance_reserve_pct: 8, platform_share_pct: 82, monthly_installer_payment: 2000, annual_fee_escalation_pct: 3, discount_rate_pct: 10,
} satisfies RevenueModel;

const installers = [
  { id: "installer-1", company_name: "Solar Crew", contact_name: "Ana", installer_share_pct: 6, installer_share_terms: "Paid monthly" },
  { id: "installer-2", company_name: "Grid Works", contact_name: "Luis", installer_share_pct: 4, installer_share_terms: "Paid after collection" },
] satisfies ProjectInstaller[];

describe("calculateEconomics", () => {
  it("totals equipment, costs and year-one stakeholder shares", () => {
    const result = calculateEconomics(project, [{ id:"i", project_id:"p", product_id:"x", product_name:"Panel", product_model:"X", product_category:"Panels", product_sku:"PX", quantity:100, unit_price:2000, supplier:"", expected_delivery:null, status:"Planned", notes:"" }], [{ id:"c", project_id:"p", cost_category:"Installation", cost_type:"Labor", label:"Labor", amount:100000, notes:"" }], revenue, installers);
    expect(result.totalProjectCost).toBe(300000);
    expect(result.yearOneBillSavings).toBe(480000);
    expect(result.yearOneRevenue).toBe(240000);
    expect(result.installerYearOne).toBe(24000);
    expect(result.installerSharePct).toBe(10);
    expect(result.series[1].installer).toBeCloseTo(24720);
    expect(result.maintenanceYearOne).toBe(0);
    expect(result.platformYearOne).toBe(216000);
    expect(result.projectPaybackYears).toBe(1.4);
    expect(result.series).toHaveLength(15);
  });

  it("uses the saved CFE bill breakdown for customer savings and discount", () => {
    const result = calculateEconomics(project, [], [], {
      ...revenue,
      previous_cfe_monthly_bill: 50000,
      residual_cfe_monthly_bill: 5000,
      monthly_customer_fee: 30000,
    });
    expect(result.yearOneBillSavings).toBe(540000);
    expect(result.monthlyTotalCustomerOutlay).toBe(35000);
    expect(result.monthlyCustomerSavings).toBe(15000);
    expect(result.customerDiscountPct).toBe(30);
    expect(result.yearOneRevenue).toBe(360000);
  });

  it("spreads maintenance charges across cash flow according to frequency", () => {
    const items = [{ id:"i", project_id:"p", product_id:"x", product_name:"Panel", product_model:"X", product_category:"Panels", product_sku:"PX", quantity:100, unit_price:2000, supplier:"", expected_delivery:null, status:"Planned" as const, notes:"" }];
    const costs = [{ id:"c", project_id:"p", cost_category:"Installation" as const, cost_type:"Labor", label:"Labor", amount:100000, maintenance_frequency:"Monthly" as const, notes:"" }, { id:"m", project_id:"p", cost_category:"Maintenance" as const, cost_type:"Care", label:"Quarterly care", amount:3000, maintenance_frequency:"Quarterly" as const, notes:"" }, { id:"a", project_id:"p", cost_category:"Maintenance" as const, cost_type:"Care", label:"Annual service", amount:12000, maintenance_frequency:"Annual" as const, notes:"" }];
    const result = calculateEconomics(project, items, costs, revenue, installers);
    expect(result.totalProjectCost).toBe(300000);
    expect(result.monthlyMaintenanceCost).toBe(2000);
    expect(result.maintenanceYearOne).toBe(24000);
    expect(result.platformYearOne).toBe(192000);
    expect(result.series[0].cumulativePlatform).toBe(-108000);
  });

  it("derives installer payments from project assignments and ignores legacy revenue fields", () => {
    const legacySharesChanged = calculateEconomics(project, [], [], { ...revenue, installer_share_pct:50, maintenance_reserve_pct:50, platform_share_pct:0, monthly_installer_payment:99999 }, installers);
    const originalShares = calculateEconomics(project, [], [], revenue, installers);
    expect(legacySharesChanged.platformYearOne).toBe(originalShares.platformYearOne);
    expect(legacySharesChanged.installerYearOne).toBe(24000);
    expect(legacySharesChanged.platformYearOne).toBe(legacySharesChanged.yearOneRevenue-legacySharesChanged.installerYearOne);
  });
});
