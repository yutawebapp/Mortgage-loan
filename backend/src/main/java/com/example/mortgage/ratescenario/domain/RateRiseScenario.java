package com.example.mortgage.ratescenario.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * One scenario of the variable-rate rise simulation. All money values are BigDecimal with scale 0 (whole yen).
 *
 * @param risePoints              rate step in percentage points (0 for the baseline)
 * @param rateAfterPercent        annual rate after the rise, in percent
 * @param monthlyPaymentBefore    payment of month riseAfterYears*12 (last payment at the old rate)
 * @param monthlyPaymentAfter     payment of the month after that (first payment at the new rate)
 * @param monthlyPaymentIncrease  monthlyPaymentAfter - monthlyPaymentBefore (may be negative)
 * @param totalPayment            sum of all monthly payments
 * @param totalInterest           totalPayment - principal
 * @param extraInterestVsBaseline totalInterest - baseline totalInterest
 * @param monthlyPayments         payment per month, month = 1..years*12
 */
public record RateRiseScenario(
        BigDecimal risePoints,
        BigDecimal rateAfterPercent,
        BigDecimal monthlyPaymentBefore,
        BigDecimal monthlyPaymentAfter,
        BigDecimal monthlyPaymentIncrease,
        BigDecimal totalPayment,
        BigDecimal totalInterest,
        BigDecimal extraInterestVsBaseline,
        List<BigDecimal> monthlyPayments) {
}
