package com.example.mortgage.eligibility;

import java.math.BigDecimal;

/**
 * Response body of POST /api/v1/simulations/eligibility. All amounts are whole yen.
 *
 * @param burdenRatioLimitPercent   30 or 35
 * @param maxAnnualRepayment        annual income x limit (before subtracting other loans)
 * @param availableAnnualRepayment  max(0, maxAnnualRepayment - other annual repayments)
 * @param availableMonthlyRepayment availableAnnualRepayment / 12, rounded down
 * @param atScreeningRate           estimate at the screening rate
 * @param atActualRate              estimate at the planned loan rate
 */
public record EligibilityResponse(
        int burdenRatioLimitPercent,
        long maxAnnualRepayment,
        long availableAnnualRepayment,
        long availableMonthlyRepayment,
        Estimate atScreeningRate,
        Estimate atActualRate) {

    /**
     * @param ratePercent    annual rate in percent
     * @param maxPrincipal   borrowable principal (multiple of 10,000 yen)
     * @param monthlyPayment monthly payment of a loan of maxPrincipal at ratePercent
     */
    public record Estimate(BigDecimal ratePercent, long maxPrincipal, long monthlyPayment) {
    }
}
