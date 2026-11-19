import { ApiError, type ProblemDetail, type RepaymentMethod } from "./simulation";

export { ApiError };

export type RentVsBuyRequest = {
  propertyPrice: number;
  downPayment: number;
  closingCostRatePercent?: number;
  annualRatePercent: number;
  years: number;
  method: RepaymentMethod;
  monthlyManagementFee?: number;
  monthlyRepairReserve?: number;
  annualPropertyTax?: number;
  annualInsurance?: number;
  monthlyRent: number;
  rentGrowthPercent?: number;
  renewalFeeMonths?: number;
  renewalIntervalYears?: number;
  rentInitialCost?: number;
  horizonYears: number;
  /** −10..10。マイナスは値下がり。 */
  assetChangeRatePercent?: number;
  saleCostRatePercent?: number;
};

export type RentVsBuyYear = {
  year: number;
  purchaseYearOutlay: number;
  purchaseCumulative: number;
  loanBalance: number;
  assetValue: number;
  /** 資産価値とローン残高を考慮した額。マイナスになることがある。 */
  purchaseNetCost: number;
  rentYearOutlay: number;
  rentCumulative: number;
};

export type RentVsBuySummary = {
  /** 購入の累計支出が賃貸の累計支出を初めて下回る年（なければ null）。 */
  crossoverYearCumulative: number | null;
  /** 購入の実質負担が賃貸の累計支出を初めて下回る年（なければ null）。 */
  crossoverYearNet: number | null;
  purchaseCumulativeAtEnd: number;
  purchaseNetAtEnd: number;
  rentCumulativeAtEnd: number;
};

export type RentVsBuySensitivity = {
  assetChangeRatePercent: number;
  crossoverYearNet: number | null;
  purchaseNetAtEnd: number;
};

export type RentVsBuyResponse = {
  loanPrincipal: number;
  closingCost: number;
  years: RentVsBuyYear[];
  summary: RentVsBuySummary;
  sensitivity: RentVsBuySensitivity[];
  /** ASSET_VALUE_IS_ASSUMPTION, NO_INVESTMENT_RETURN_ON_DIFFERENCE, TAX_DEDUCTION_NOT_INCLUDED, SAME_HOME_CONDITIONS_NOT_ASSURED, OWNERSHIP_COSTS_CONTINUE_AFTER_LOAN, CLOSING_COSTS_FINANCED_FROM_BUDGET など。 */
  notes: string[];
};

export async function calculateRentVsBuy(
  body: RentVsBuyRequest,
  signal?: AbortSignal,
): Promise<RentVsBuyResponse> {
  const res = await fetch("/api/v1/simulations/rent-vs-buy", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const p = (await res.json()) as ProblemDetail;
      detail = p.detail ?? p.title ?? "";
    } catch {
      /* ignore non-JSON body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as RentVsBuyResponse;
}
