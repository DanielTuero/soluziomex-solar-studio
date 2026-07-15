import { describe, expect, test } from "vitest";
import { buildValidationRows, validationSummary } from "./validation";
import type { ProjectCost, ProjectValidationPayment, RevenueModel } from "./types";

const revenue = { monthly_customer_fee:1000 } as RevenueModel;
const maintenance = { id:"opex-1", label:"Preventive maintenance", amount:500, cost_category:"Maintenance" } as ProjectCost;
const installation = { id:"install-1", label:"Installation labor", amount:5000, cost_category:"Installation" } as ProjectCost;
const payment = (source_type:ProjectValidationPayment["source_type"], actual:number, projected:number, source_id:string|null=null):ProjectValidationPayment => ({
  id:`${source_type}-${actual}`, project_id:"p", source_type, source_id,
  label:source_type === "Revenue" ? "Customer revenue" : "Preventive maintenance",
  projected_amount:projected, actual_amount:actual, vendor:"", paid_on:"2026-01-01", notes:"",
  receipt_name:null, receipt_mime:null, has_receipt:false, created_at:"",
});

describe("revenue and operating expense validation", () => {
  test("compares recorded revenue and operating expenses in the correct direction", () => {
    const rows=buildValidationRows(revenue,[maintenance,installation],[payment("Revenue",950,1000),payment("OperatingExpense",550,500,"opex-1")]);
    expect(rows.find(row=>row.source_type==="Revenue")).toMatchObject({projected:1000,actual:950,variance:-50,status:"Below projection"});
    expect(rows.find(row=>row.source_id==="opex-1")).toMatchObject({projected:500,actual:550,variance:-50,status:"Over budget"});
  });

  test("excludes installation costs from projections", () => {
    const rows=buildValidationRows(revenue,[maintenance,installation],[]);
    expect(rows.map(row=>row.source_id)).not.toContain("install-1");
    expect(validationSummary(rows)).toMatchObject({projectedRevenue:1000,projectedOpex:500,actualRevenue:0,actualOpex:0});
  });

  test("tracks unplanned operating expenses without adding installation lines", () => {
    const unplanned={...payment("OperatingExpense",200,0),id:"other",label:"Emergency inspection"};
    const rows=buildValidationRows(revenue,[],[unplanned]);
    expect(rows.find(row=>row.label==="Emergency inspection")).toMatchObject({projected:0,actual:200,status:"Over budget"});
  });
});
