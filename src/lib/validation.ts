import type { ProjectCost, ProjectItem, ProjectValidationPayment } from "./types";

export type ValidationRow = {
  key: string;
  source_type: ProjectValidationPayment["source_type"];
  source_id: string | null;
  label: string;
  projected: number;
  actual: number;
  variance: number;
  paymentCount: number;
  status: "Awaiting actuals" | "On track" | "Over budget";
};

export function buildValidationRows(items: ProjectItem[], costs: ProjectCost[], payments: ProjectValidationPayment[]) {
  const rows = new Map<string, ValidationRow>();
  for (const item of items) {
    rows.set(`Item:${item.id}`, row("Item", item.id, item.product_name, Number(item.quantity) * Number(item.unit_price)));
  }
  for (const cost of costs.filter(entry => (entry.cost_category || "Installation") === "Installation")) {
    rows.set(`Cost:${cost.id}`, row("Cost", cost.id, cost.label, Number(cost.amount)));
  }
  for (const payment of payments) {
    const key = payment.source_type === "Other" ? `Other:${payment.id}` : `${payment.source_type}:${payment.source_id}`;
    const current = rows.get(key) ?? row(payment.source_type, payment.source_id, payment.label, Number(payment.projected_amount));
    current.actual += Number(payment.actual_amount);
    current.paymentCount += 1;
    rows.set(key, current);
  }
  const result = [...rows.values()].map(entry => {
    const variance = entry.projected - entry.actual;
    const status = entry.actual === 0 ? "Awaiting actuals" as const : variance >= 0 ? "On track" as const : "Over budget" as const;
    return { ...entry, variance, status };
  });
  const statusRank={"Over budget":0,"On track":1,"Awaiting actuals":2};
  return result.sort((a, b) => statusRank[a.status] - statusRank[b.status] || a.label.localeCompare(b.label));
}

export function validationSummary(rows: ValidationRow[]) {
  const projected = rows.reduce((sum, entry) => sum + entry.projected, 0);
  const actual = rows.reduce((sum, entry) => sum + entry.actual, 0);
  return {
    projected,
    actual,
    variance: projected - actual,
    validatedLines: rows.filter(entry => entry.paymentCount > 0).length,
    totalLines: rows.length,
    overBudgetLines: rows.filter(entry => entry.status === "Over budget").length,
  };
}

function row(source_type:ValidationRow["source_type"],source_id:string|null,label:string,projected:number):ValidationRow {
  return { key:`${source_type}:${source_id}`, source_type, source_id, label, projected, actual:0, variance:projected, paymentCount:0, status:"Awaiting actuals" };
}
