import { describe, expect, it } from "vitest";
import { calculateEconomics } from "./economics";
import type { Project, RevenueModel } from "./types";

const project = {
  id: "p", code: "TEST", name: "Test", customer_name: "Customer", location: "Mexico", status: "Design",
  capacity_kw: 100, annual_usage_kwh: 200000, electricity_rate: 3, utility_escalation_pct: 5,
  specific_yield_kwh_kw: 1600, degradation_pct: .5, target_install_date: null, created_at: "2026-01-01",
} satisfies Project;

const revenue = {
  project_id: "p", previous_cfe_monthly_bill: 0, residual_cfe_monthly_bill: 0, monthly_customer_fee: 20000, contract_years: 15, installer_share_pct: 10,
  maintenance_reserve_pct: 8, platform_share_pct: 82, annual_fee_escalation_pct: 3, discount_rate_pct: 10,
} satisfies RevenueModel;

describe("calculateEconomics", () => {
  it("totals equipment, costs and year-one stakeholder shares", () => {
    const result = calculateEconomics(project, [{ id:"i", project_id:"p", product_id:"x", product_name:"Panel", product_model:"X", product_category:"Panels", product_sku:"PX", quantity:100, unit_price:2000, supplier:"", expected_delivery:null, status:"Planned", notes:"" }], [{ id:"c", project_id:"p", cost_category:"Installation", cost_type:"Labor", label:"Labor", amount:100000, notes:"" }], revenue);
    expect(result.totalProjectCost).toBe(300000);
    expect(result.yearOneBillSavings).toBe(480000);
    expect(result.yearOneRevenue).toBe(240000);
    expect(result.installerYearOne).toBe(24000);
    expect(result.maintenanceYearOne).toBe(19200);
    expect(result.platformYearOne).toBe(196800);
    expect(result.projectPaybackYears).toBe(1.5);
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

  it("computes Soluziomex break-even from its allocated share rather than total customer fees", () => {
    const items = [{ id:"i", project_id:"p", product_id:"x", product_name:"Panel", product_model:"X", product_category:"Panels", product_sku:"PX", quantity:100, unit_price:2000, supplier:"", expected_delivery:null, status:"Planned" as const, notes:"" }];
    const costs = [{ id:"c", project_id:"p", cost_category:"Installation" as const, cost_type:"Labor", label:"Labor", amount:100000, notes:"" }];
    const fullShare = calculateEconomics(project, items, costs, { ...revenue, installer_share_pct:0, maintenance_reserve_pct:0, platform_share_pct:100 });
    const halfShare = calculateEconomics(project, items, costs, { ...revenue, installer_share_pct:50, maintenance_reserve_pct:0, platform_share_pct:50 });
    expect(fullShare.platformYearOne).toBe(fullShare.yearOneRevenue);
    expect(halfShare.platformYearOne).toBe(halfShare.yearOneRevenue * .5);
    expect(halfShare.projectPaybackYears!).toBeGreaterThan(fullShare.projectPaybackYears!);
  });
});
