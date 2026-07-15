import { describe, expect, it } from "vitest";
import { normalizeProductSource } from "./product-source";

describe("normalizeProductSource", () => {
  it("accepts a bare supplier domain and adds https", () => {
    expect(normalizeProductSource("supplier.mx/panel")).toEqual({ url: "https://supplier.mx/panel" });
  });

  it("rejects unsafe and malformed links", () => {
    expect(normalizeProductSource("javascript:alert(1)").error).toBeTruthy();
    expect(normalizeProductSource("not a link").error).toBeTruthy();
  });
});
