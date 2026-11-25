package com.example.mortgage.rentvsbuy.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of the rent-vs-buy comparison. Money values are BigDecimal with scale 0 (whole yen).
 * The result only states numbers; it never says which option is better.
 *
 * @param loanPrincipal propertyPrice + closingCost - downPayment (always &gt; 0)
 * @param closingCost   RoundingPolicy(propertyPrice x closingCostRatePercent / 100)
 * @param years         yearly rows, year = 1..horizonYears
 * @param summary       crossover years and values at the horizon end
 * @param sensitivity   three entries for asset change rates (a - offset, a, a + offset)
 * @param notes         modelling notes
 */
public record RentVsBuyResult(
        BigDecimal loanPrincipal,
        BigDecimal closingCost,
        List<YearRow> years,
        Summary summary,
        List<SensitivityRow> sensitivity,
        List<RentVsBuyNote> notes) {

    /**
     * One year of the comparison (year k covers payments 12(k-1)+1 .. 12k).
     *
     * @param year               1-based year
     * @param purchaseYearOutlay loanPayment + ownershipCost in the year
     * @param purchaseCumulative downPayment + running sum of purchaseYearOutlay
     * @param loanBalance        loan balance after the year's last payment (0 once repaid)
     * @param assetValue         RoundingPolicy(propertyPrice x (1 + assetChangeRate)^year)
     * @param purchaseNetCost    purchaseCumulative - netAsset, where netAsset = RoundingPolicy(assetValue x
     *                           (1 - saleCostRate)) - loanBalance (can be negative)
     * @param rentYearOutlay     12 x monthlyRent of the year + renewal fee of the year
     * @param rentCumulative     rentInitialCost + running sum of rentYearOutlay
     */
    public record YearRow(
            int year,
            BigDecimal purchaseYearOutlay,
            BigDecimal purchaseCumulative,
            BigDecimal loanBalance,
            BigDecimal assetValue,
            BigDecimal purchaseNetCost,
            BigDecimal rentYearOutlay,
            BigDecimal rentCumulative) {
    }

    /**
     * @param crossoverYearCumulative first year with purchaseCumulative &lt;= rentCumulative, or null if none
     * @param crossoverYearNet        first year with purchaseNetCost &lt;= rentCumulative, or null if none
     * @param purchaseCumulativeAtEnd purchaseCumulative at horizonYears
     * @param purchaseNetAtEnd        purchaseNetCost at horizonYears
     * @param rentCumulativeAtEnd     rentCumulative at horizonYears
     */
    public record Summary(
            Integer crossoverYearCumulative,
            Integer crossoverYearNet,
            BigDecimal purchaseCumulativeAtEnd,
            BigDecimal purchaseNetAtEnd,
            BigDecimal rentCumulativeAtEnd) {
    }

    /**
     * Result recomputed with one asset change rate (everything else equal).
     *
     * @param assetChangeRatePercent asset change rate used, in percent
     * @param crossoverYearNet       first year with purchaseNetCost &lt;= rentCumulative, or null if none
     * @param purchaseNetAtEnd       purchaseNetCost at horizonYears
     */
    public record SensitivityRow(
            BigDecimal assetChangeRatePercent,
            Integer crossoverYearNet,
            BigDecimal purchaseNetAtEnd) {
    }
}
