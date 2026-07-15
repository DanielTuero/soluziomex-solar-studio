import { describe,expect,test } from "vitest";
import { comparisonTimeframes,normalizeContractYears,normalizeScenarioYears } from "./timeframes";

describe("contract timeframe scenarios",()=>{
  test("keeps active contract terms inside the supported range",()=>{
    expect(normalizeContractYears(0)).toBe(1);
    expect(normalizeContractYears(18.6)).toBe(19);
    expect(normalizeContractYears(99)).toBe(40);
  });

  test("normalizes persisted comparison scenarios",()=>{
    expect(normalizeScenarioYears('[25,10,25,50]',15)).toEqual([10,25,40]);
  });

  test("always includes the active financial-model term in comparisons",()=>{
    expect(comparisonTimeframes([10,20],15)).toEqual([10,15,20]);
  });
});
