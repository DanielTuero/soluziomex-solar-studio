export function normalizeProductSource(input: unknown) {
  const raw = String(input || "").trim();
  if (!raw) return { url: "" };
  if (raw.length > 2048) return { url: "", error: "The source link is too long." };
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol) || !parsed.hostname) throw new Error();
    return { url: parsed.toString() };
  } catch {
    return { url: "", error: "Enter a valid product source link, such as supplier.com/product." };
  }
}
