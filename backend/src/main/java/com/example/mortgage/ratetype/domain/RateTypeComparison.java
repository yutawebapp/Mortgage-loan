package com.example.mortgage.ratetype.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of the rate-type comparison. All money values are BigDecimal with scale 0 (whole yen).
 *
 * @param cases the four cases in the order VARIABLE_FLAT, VARIABLE_RISE, FIXED_PERIOD, FULL_FIXED
 */
public record RateTypeComparison(List<Case> cases) {

    /**
     * One compared case.
     *
     * @param type                        case code
     * @param rateFirstPercent            annual rate of the first stage, in percent
     * @param rateAfterPercent            annual rate after the switch (null for single-stage cases)
     * @param switchAfterYears            years of the first stage (null for single-stage cases)
     * @param firstMonthlyPayment         payment of month 1
     * @param monthlyPaymentBeforeSwitch  payment of month switchAfterYears*12, still at the old rate (null if single-stage)
     * @param monthlyPaymentAfterSwitch   payment of the following month, first at the new rate (null if single-stage)
     * @param totalPayment                sum of all monthly payments
     * @param totalInterest               totalPayment - principal
     * @param totalPaymentDiffFromFullFixed totalPayment - FULL_FIXED totalPayment (may be negative)
     * @param yearlyPayments              sum of the 12 monthly payments of each loan year, length = years
     */
    public record Case(
            RateType type,
            BigDecimal rateFirstPercent,
            BigDecimal rateAfterPercent,
            Integer switchAfterYears,
            BigDecimal firstMonthlyPayment,
            BigDecimal monthlyPaymentBeforeSwitch,
            BigDecimal monthlyPaymentAfterSwitch,
            BigDecimal totalPayment,
            BigDecimal totalInterest,
            BigDecimal totalPaymentDiffFromFullFixed,
            List<BigDecimal> yearlyPayments) {
    }
}
