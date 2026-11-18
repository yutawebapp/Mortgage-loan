package com.example.mortgage.ratetype;

import com.example.mortgage.ratetype.domain.RateType;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/rate-types. All amounts are whole yen.
 *
 * @param cases four entries in the order VARIABLE_FLAT, VARIABLE_RISE, FIXED_PERIOD, FULL_FIXED
 * @param notes always RATES_ARE_USER_ASSUMPTIONS, SIMPLIFIED_RATE_CHANGE_MODEL, FEES_AND_GUARANTEE_NOT_INCLUDED
 */
public record RateTypeResponse(List<Case> cases, List<RateTypeNote> notes) {

    /**
     * @param type                          case code
     * @param rateFirstPercent              annual rate of the first stage, in percent
     * @param rateAfterPercent              annual rate after the switch, null for single-stage cases
     * @param switchAfterYears              years of the first stage, null for single-stage cases
     * @param firstMonthlyPayment           payment of month 1
     * @param monthlyPaymentBeforeSwitch    last payment at the old rate (month switchAfterYears*12), null if single-stage
     * @param monthlyPaymentAfterSwitch     first payment at the new rate (following month), null if single-stage
     * @param totalPayment                  sum of all monthly payments
     * @param totalInterest                 totalPayment - principal
     * @param totalPaymentDiffFromFullFixed totalPayment - FULL_FIXED totalPayment (may be negative)
     * @param yearlyPayments                sum of the 12 monthly payments of each loan year, length = years
     */
    public record Case(
            RateType type,
            BigDecimal rateFirstPercent,
            BigDecimal rateAfterPercent,
            Integer switchAfterYears,
            long firstMonthlyPayment,
            Long monthlyPaymentBeforeSwitch,
            Long monthlyPaymentAfterSwitch,
            long totalPayment,
            long totalInterest,
            long totalPaymentDiffFromFullFixed,
            List<Long> yearlyPayments) {
    }
}
