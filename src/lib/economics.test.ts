import { describe, expect, it } from "vitest";
import { calculateEconomics } from "./economics";
import type { Project, RevenueModel } from "./types";

const project = {
  id: "p", code: "TEST", name: "Test", customer_name: "Customer", location: "Mexico", status: "Design",
  capacity_kw: 100, annual_usage_kwh: 200000, electricity_rate: 3, utility_escalation_pct: 5,
  specific_yield_kwh_kw: 1600, degradation_pct: .5, target_install_date: null, created_at: "2026-01-01",
} satisfies Project;

const revenue = {
  project_id: "p", monthly_customer_fee: 20000, contract_years: 15, installer_share_pct: 10,
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
});
