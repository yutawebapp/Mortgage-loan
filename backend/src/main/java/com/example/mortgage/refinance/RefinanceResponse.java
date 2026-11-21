package com.example.mortgage.refinance;

import java.util.List;

/**
 * Response body of POST /api/v1/simulations/refinance. All amounts are whole yen.
 *
 * @param current          current loan summary
 * @param refinanced      refinanced loan summary
 * @param refinanceCosts   up-front refinance costs
 * @param monthlySaving    current.monthlyPayment - refinanced.monthlyPayment (may be negative)
 * @param totalSaving      current.totalPayment - (refinanced.totalPayment + refinanceCosts) (may be negative)
 * @param breakEvenMonth   smallest month with net cumulative saving >= 0, null if never within the horizon
 * @param cumulativeSaving one entry per month, month = 1..max(remainingYears, newYears) * 12
 */
public record RefinanceResponse(
        LoanSummary current,
        LoanSummary refinanced,
        long refinanceCosts,
        long monthlySaving,
        long totalSaving,
        Integer breakEvenMonth,
        List<CumulativeSaving> cumulativeSaving) {

    /**
     * @param monthlyPayment first month's payment
     * @param totalPayment   sum of all payments over the loan
     * @param totalInterest  sum of all interest over the loan
     */
    public record LoanSummary(long monthlyPayment, long totalPayment, long totalInterest) {
    }

    /**
     * @param month 1-based month number
     * @param net   cumulative saving at this month, net of refinance costs
     */
    public record CumulativeSaving(int month, long net) {
    }
}
