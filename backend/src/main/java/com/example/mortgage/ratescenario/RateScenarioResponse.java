package com.example.mortgage.ratescenario;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/rate-scenarios. All amounts are whole yen.
 *
 * @param baseline  plain schedule at the starting rate (risePoints = 0)
 * @param scenarios one entry per requested risePoints value, in request order
 */
public record RateScenarioResponse(ScenarioResult baseline, List<ScenarioResult> scenarios) {

    /**
     * @param risePoints              rate step in percentage points
     * @param rateAfterPercent        annual rate after the rise, in percent
     * @param monthlyPaymentBefore    payment of month riseAfterYears*12 (at the old rate)
     * @param monthlyPaymentAfter     payment of the following month (first at the new rate)
     * @param monthlyPaymentIncrease  monthlyPaymentAfter - monthlyPaymentBefore (may be negative)
     * @param monthlyPaymentDifferenceVsBaseline monthlyPaymentAfter - baseline payment in the same month
     * @param totalPayment            sum of all monthly payments
     * @param totalInterest           total interest over the loan
     * @param extraInterestVsBaseline totalInterest - baseline totalInterest
     * @param monthlyPayments         payment per month, length years*12
     */
    public record ScenarioResult(
            BigDecimal risePoints,
            BigDecimal rateAfterPercent,
            long monthlyPaymentBefore,
            long monthlyPaymentAfter,
            long monthlyPaymentIncrease,
            long monthlyPaymentDifferenceVsBaseline,
            long totalPayment,
            long totalInterest,
            long extraInterestVsBaseline,
            List<Long> monthlyPayments) {
    }
}
