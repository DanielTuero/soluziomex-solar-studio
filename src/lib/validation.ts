import type { ProjectCost, ProjectValidationPayment, RevenueModel } from "./types";

export type ValidationRow = {
  key: string;
  source_type: ProjectValidationPayment["source_type"];
  source_id: string | null;
  label: string;
  projected: number;
  actual: number;
  variance: number;
  paymentCount: number;
  status: "Awaiting actuals" | "On track" | "Below projection" | "Over budget";
};

export function buildValidationRows(revenue: RevenueModel, costs: ProjectCost[], payments: ProjectValidationPayment[]) {
  const rows = new Map<string, ValidationRow>();
  rows.set("Revenue:project", row("Revenue", null, "Customer revenue", Number(revenue.monthly_customer_fee)));
  for (const cost of costs.filter(entry => entry.cost_category === "Maintenance")) {
    rows.set(`OperatingExpense:${cost.id}`, row("OperatingExpense", cost.id, cost.label, Number(cost.amount)));
  }

  for (const payment of payments) {
    const key = payment.source_type === "Revenue"
      ? "Revenue:project"
      : payment.source_id ? `OperatingExpense:${payment.source_id}` : `OperatingExpense:${payment.id}`;
    const current = rows.get(key) ?? row(payment.source_type, payment.source_id, payment.label, 0);
    if (current.paymentCount === 0) current.projected = 0;
    current.projected += Number(payment.projected_amount);
    current.actual += Number(payment.actual_amount);
    current.paymentCount += 1;
    rows.set(key, current);
  }

  const result = [...rows.values()].map(entry => {
    const variance = entry.source_type === "Revenue" ? entry.actual - entry.projected : entry.projected - entry.actual;
    const status = entry.actual === 0
      ? "Awaiting actuals" as const
      : variance >= 0
        ? "On track" as const
        : entry.source_type === "Revenue" ? "Below projection" as const : "Over budget" as const;
    return { ...entry, variance, status };
  });
  const statusRank = { "Below projection":0, "Over budget":0, "On track":1, "Awaiting actuals":2 };
  return result.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.label.localeCompare(b.label));
}

export function validationSummary(rows: ValidationRow[]) {
  const revenueRows = rows.filter(entry => entry.source_type === "Revenue");
  const opexRows = rows.filter(entry => entry.source_type === "OperatingExpense");
  const projectedRevenue = total(revenueRows, "projected");
  const actualRevenue = total(revenueRows, "actual");
  const projectedOpex = total(opexRows, "projected");
  const actualOpex = total(opexRows, "actual");
  return {
    projectedRevenue,
    actualRevenue,
    revenueVariance: actualRevenue - projectedRevenue,
    projectedOpex,
    actualOpex,
    opexVariance: projectedOpex - actualOpex,
    validatedLines: rows.filter(entry => entry.paymentCount > 0).length,
    totalLines: rows.length,
    belowProjectionLines: rows.filter(entry => entry.status === "Below projection").length,
    overBudgetLines: rows.filter(entry => entry.status === "Over budget").length,
  };
}

function row(source_type:ValidationRow["source_type"], source_id:string|null, label:string, projected:number):ValidationRow {
  const key = source_type === "Revenue" ? "Revenue:project" : `OperatingExpense:${source_id}`;
  return { key, source_type, source_id, label, projected, actual:0, variance:0, paymentCount:0, status:"Awaiting actuals" };
}

function total(rows:ValidationRow[], key:"projected"|"actual") {
  return rows.reduce((sum, entry) => sum + entry[key], 0);
}
