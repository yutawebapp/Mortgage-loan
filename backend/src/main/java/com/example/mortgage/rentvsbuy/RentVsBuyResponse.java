package com.example.mortgage.rentvsbuy;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/rent-vs-buy. Amounts are whole yen.
 * Numbers only: this response never states which option is better. Figures are 目安 (estimates).
 *
 * @param loanPrincipal amount borrowed = propertyPrice + closingCost - downPayment
 * @param closingCost   closing costs (informational; already financed from the budget)
 * @param years         yearly rows, year = 1..horizonYears
 * @param summary       crossover years and values at the end of the horizon
 * @param sensitivity   three entries for asset change rate: a - 2, a, a + 2 (percentage points)
 * @param notes         modelling notes (codes)
 */
public record RentVsBuyResponse(
        long loanPrincipal,
        long closingCost,
        List<Year> years,
        Summary summary,
        List<Sensitivity> sensitivity,
        List<String> notes) {

    /**
     * @param year               1-based year
     * @param purchaseYearOutlay loan payments + ownership costs in the year
     * @param purchaseCumulative down payment + cumulative purchaseYearOutlay
     * @param loanBalance        loan balance at year end (0 once repaid)
     * @param assetValue         assumed property value at year end (before sale costs)
     * @param purchaseNetCost    purchaseCumulative - net asset value (after sale costs and loan balance)
     * @param rentYearOutlay     rent for 12 months + renewal fee in the year
     * @param rentCumulative     initial rent-side costs + cumulative rentYearOutlay
     */
    public record Year(
            int year,
            long purchaseYearOutlay,
            long purchaseCumulative,
            long loanBalance,
            long assetValue,
            long purchaseNetCost,
            long rentYearOutlay,
            long rentCumulative) {
    }

    /**
     * @param crossoverYearCumulative first year purchaseCumulative &lt;= rentCumulative, null if none in the horizon
     * @param crossoverYearNet        first year purchaseNetCost &lt;= rentCumulative, null if none in the horizon
     * @param purchaseCumulativeAtEnd purchaseCumulative at horizonYears
     * @param purchaseNetAtEnd        purchaseNetCost at horizonYears
     * @param rentCumulativeAtEnd     rentCumulative at horizonYears
     */
    public record Summary(
            Integer crossoverYearCumulative,
            Integer crossoverYearNet,
            long purchaseCumulativeAtEnd,
            long purchaseNetAtEnd,
            long rentCumulativeAtEnd) {
    }

    /**
     * @param assetChangeRatePercent asset change rate used (percent per year)
     * @param crossoverYearNet       first year purchaseNetCost &lt;= rentCumulative, null if none in the horizon
     * @param purchaseNetAtEnd       purchaseNetCost at horizonYears
     */
    public record Sensitivity(
            BigDecimal assetChangeRatePercent,
            Integer crossoverYearNet,
            long purchaseNetAtEnd) {
    }
}
