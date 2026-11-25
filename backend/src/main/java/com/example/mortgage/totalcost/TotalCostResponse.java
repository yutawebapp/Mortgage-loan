package com.example.mortgage.totalcost;

import java.util.List;

/**
 * Response body of POST /api/v1/simulations/total-cost. Amounts are whole yen.
 * This is a 目安 (estimate); resale value, costs after the loan term and tax deduction are not included (see notes).
 *
 * @param initial        initial block: downPayment (= initialCost, the cash outlay at the start) and closingCost
 *                       (informational; already in the total budget)
 * @param loanPrincipal  amount borrowed = propertyPrice + closingCost - downPayment
 * @param totals         whole-term totals
 * @param years          yearly rows, year = 1..years
 * @param notes          modelling notes (codes), e.g. OWNERSHIP_COST_CONSTANT, NO_RESALE_VALUE, CLOSING_COSTS_FINANCED_FROM_BUDGET
 */
public record TotalCostResponse(
        Initial initial,
        long loanPrincipal,
        Totals totals,
        List<Year> years,
        List<String> notes) {

    /** @param downPayment down payment, @param closingCost closing costs (informational), @param initialCost = downPayment */
    public record Initial(long downPayment, long closingCost, long initialCost) {
    }

    /**
     * @param totalLoanPayment     sum of loan payments over the term
     * @param totalInterest        sum of interest over the term
     * @param totalOwnershipCost   sum of ownership costs over the term
     * @param grandTotal           downPayment + totalLoanPayment + totalOwnershipCost
     * @param monthlyAverage       grandTotal / (years x 12), whole yen
     * @param firstMonthLoanPayment month-1 loan payment (reference)
     */
    public record Totals(
            long totalLoanPayment,
            long totalInterest,
            long totalOwnershipCost,
            long grandTotal,
            long monthlyAverage,
            long firstMonthLoanPayment) {
    }

    /**
     * @param year           1-based year
     * @param loanPayment    loan payments in the year
     * @param interestPaid   interest in the year
     * @param principalPaid  principal repaid in the year
     * @param yearEndBalance loan balance at year end
     * @param ownershipCost  ownership costs in the year
     * @param yearTotal      loanPayment + ownershipCost
     * @param cumulativeOutlay initialCost + cumulative yearTotal
     */
    public record Year(
            int year,
            long loanPayment,
            long interestPaid,
            long principalPaid,
            long yearEndBalance,
            long ownershipCost,
            long yearTotal,
            long cumulativeOutlay) {
    }
}
