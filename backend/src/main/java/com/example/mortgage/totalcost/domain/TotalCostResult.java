package com.example.mortgage.totalcost.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of the total housing cost simulation. All money values are whole yen (scale 0).
 *
 * @param downPayment         down payment as given; equals initialCost (the cash paid at the start)
 * @param closingCost         closing costs = RoundingPolicy(propertyPrice x closingCostRatePercent / 100);
 *                            informational only, already included in the total budget (see TotalCostNote)
 * @param initialCost         cash outlay at the start = downPayment
 * @param loanPrincipal       propertyPrice + closingCost - downPayment (always &gt; 0)
 * @param totalLoanPayment    sum of all loan payments over the term
 * @param totalInterest       sum of all interest over the term
 * @param totalOwnershipCost sum of yearly ownership costs over the term
 * @param grandTotal          downPayment + totalLoanPayment + totalOwnershipCost
 * @param monthlyAverage      RoundingPolicy(grandTotal / (years x 12)), HALF_UP
 * @param firstMonthLoanPayment month-1 loan payment (reference)
 * @param years               yearly rows, year = 1..years
 * @param notes               modelling notes
 */
public record TotalCostResult(
        BigDecimal downPayment,
        BigDecimal closingCost,
        BigDecimal initialCost,
        BigDecimal loanPrincipal,
        BigDecimal totalLoanPayment,
        BigDecimal totalInterest,
        BigDecimal totalOwnershipCost,
        BigDecimal grandTotal,
        BigDecimal monthlyAverage,
        BigDecimal firstMonthLoanPayment,
        List<YearRow> years,
        List<TotalCostNote> notes) {

    /**
     * One loan year (payments 12(k-1)+1 .. 12k).
     *
     * @param year             1-based year
     * @param loanPayment      sum of loan payments in the year
     * @param interestPaid     sum of interest in the year
     * @param principalPaid    sum of principal repaid in the year
     * @param yearEndBalance   loan balance after the year's last payment
     * @param ownershipCost    yearly ownership cost (management + repair reserve x 12 + property tax + insurance)
     * @param yearTotal        loanPayment + ownershipCost
     * @param cumulativeOutlay initialCost (= downPayment) + cumulative sum of yearTotal up to and including this year
     */
    public record YearRow(
            int year,
            BigDecimal loanPayment,
            BigDecimal interestPaid,
            BigDecimal principalPaid,
            BigDecimal yearEndBalance,
            BigDecimal ownershipCost,
            BigDecimal yearTotal,
            BigDecimal cumulativeOutlay) {
    }
}
