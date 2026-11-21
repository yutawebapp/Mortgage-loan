package com.example.mortgage.eligibility.domain;

import java.math.BigDecimal;

/**
 * Result of the borrowing-capacity estimate. All money values are whole yen (scale 0).
 *
 * @param burdenRatioLimitPercent   burden ratio limit applied to annual income: 30 or 35
 * @param maxAnnualRepayment        annual income x limit (before subtracting other loans)
 * @param availableAnnualRepayment  max(0, maxAnnualRepayment - otherAnnualRepayments)
 * @param availableMonthlyRepayment availableAnnualRepayment / 12, rounded down
 * @param atScreeningRate           estimate at the screening (審査) rate
 * @param atActualRate              estimate at the rate the user plans to borrow at
 */
public record EligibilityResult(
        int burdenRatioLimitPercent,
        BigDecimal maxAnnualRepayment,
        BigDecimal availableAnnualRepayment,
        BigDecimal availableMonthlyRepayment,
        Estimate atScreeningRate,
        Estimate atActualRate) {

    /**
     * @param ratePercent    annual rate in percent used for this estimate
     * @param maxPrincipal   borrowable principal, rounded down to a multiple of 10,000 yen
     * @param monthlyPayment equal-payment monthly payment of a loan of maxPrincipal at ratePercent
     */
    public record Estimate(BigDecimal ratePercent, BigDecimal maxPrincipal, BigDecimal monthlyPayment) {
    }
}
