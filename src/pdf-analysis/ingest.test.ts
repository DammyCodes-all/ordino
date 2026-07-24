import { describe, expect, it } from "vitest";
import { ingestSmokeFixture } from "@/pdf-analysis/ingest.fixture";

describe("pdf ingest", () => {
  it("ingests a generated fixture PDF with text spans", async () => {
    const result = await ingestSmokeFixture();
    if (!result.success) {
      expect.fail(`${result.error.code}: ${result.error.message}`);
    }
    expect(result.data.pageCount).toBe(1);
    expect(result.data.rawText.toLowerCase()).toContain("payment");
    expect(result.data.spanCount).toBeGreaterThan(0);
  }, 30_000);
});
