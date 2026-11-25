package com.example.mortgage.refinance.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of comparing the current loan with the refinanced loan. All money values are whole yen.
 *
 * @param current        summary of the current loan
 * @param refinanced     summary of the refinanced loan
 * @param refinanceCosts up-front refinance costs
 * @param monthlySaving  current first payment - refinanced first payment (may be negative)
 * @param totalSaving    current total - (refinanced total + costs) (may be negative)
 * @param breakEvenMonth smallest month m with net cumulative saving >= 0, or null if never within horizon
 * @param cumulativeSaving one entry per month 1..H, H = max(years) * 12
 */
public record RefinanceComparison(
        LoanSummary current,
        LoanSummary refinanced,
        BigDecimal refinanceCosts,
        BigDecimal monthlySaving,
        BigDecimal totalSaving,
        Integer breakEvenMonth,
        List<CumulativeSaving> cumulativeSaving) {

    /** @param monthlyPayment first month's payment; totalPayment / totalInterest over the whole loan */
    public record LoanSummary(BigDecimal monthlyPayment, BigDecimal totalPayment, BigDecimal totalInterest) {
    }

    /** @param month 1-based month; net = cumulative current payments - cumulative new payments - costs */
    public record CumulativeSaving(int month, BigDecimal net) {
    }
}
