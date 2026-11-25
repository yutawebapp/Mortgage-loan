import { afterEach, describe, expect, it, vi } from "vitest";
import { calculateRateScenarios, type RateScenarioResult } from "./rate-scenario";

afterEach(() => vi.unstubAllGlobals());

describe("calculateRateScenarios", () => {
  it("preserves the separate before/after and same-month baseline differences", async () => {
    const baseline: RateScenarioResult = {
      risePoints: 0, rateAfterPercent: 0.5, monthlyPaymentBefore: 82173,
      monthlyPaymentAfter: 82143, monthlyPaymentIncrease: -30,
      monthlyPaymentDifferenceVsBaseline: 0, totalPayment: 0, totalInterest: 0,
      extraInterestVsBaseline: 0, monthlyPayments: [],
    };
    const scenario: RateScenarioResult = {
      ...baseline, risePoints: 0.001, rateAfterPercent: 0.501,
      monthlyPaymentAfter: 82165, monthlyPaymentIncrease: -8,
      monthlyPaymentDifferenceVsBaseline: 22,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ baseline, scenarios: [scenario] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const request = {
      principal: 30_000_000, annualRatePercent: 0.5, years: 35,
      method: "EQUAL_PRINCIPAL" as const, riseAfterYears: 5, risePoints: [0.001],
    };
    const result = await calculateRateScenarios(request);
    expect(result.scenarios[0].monthlyPaymentIncrease).toBe(-8);
    expect(result.scenarios[0].monthlyPaymentDifferenceVsBaseline).toBe(22);
    expect(result.baseline.monthlyPaymentDifferenceVsBaseline).toBe(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/simulations/rate-scenarios", expect.objectContaining({
      method: "POST", body: JSON.stringify(request),
    }));
  });
});
