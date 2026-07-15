import { describe, expect, test } from "vitest";
import { buildValidationRows, validationSummary } from "./validation";
import type { ProjectCost, ProjectItem, ProjectValidationPayment } from "./types";

const item = { id:"item-1", product_name:"Panels", quantity:10, unit_price:100 } as ProjectItem;
const cost = { id:"cost-1", label:"Installation", amount:500, cost_category:"Installation" } as ProjectCost;
const payment = (actual:number):ProjectValidationPayment => ({ id:`pay-${actual}`,project_id:"p",source_type:"Item",source_id:"item-1",label:"Panels",projected_amount:1000,actual_amount:actual,vendor:"",paid_on:"2026-01-01",notes:"",receipt_name:null,receipt_mime:null,has_receipt:false,created_at:"" });

describe("project validation", () => {
  test("compares partial and total payments with current projections", () => {
    const rows=buildValidationRows([item],[cost],[payment(600),payment(450)]);
    expect(rows.find(row=>row.source_id==="item-1")).toMatchObject({projected:1000,actual:1050,variance:-50,status:"Over budget",paymentCount:2});
    expect(rows.find(row=>row.source_id==="cost-1")?.status).toBe("Awaiting actuals");
  });

  test("includes unplanned payments as overruns", () => {
    const other={...payment(200),id:"other",source_type:"Other" as const,source_id:null,label:"Unexpected permit",projected_amount:0};
    const rows=buildValidationRows([],[],[other]);
    expect(validationSummary(rows)).toMatchObject({projected:0,actual:200,variance:-200,overBudgetLines:1});
  });
});
