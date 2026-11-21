package com.example.mortgage.refinance.domain;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.refinance.domain.RefinanceComparison.CumulativeSaving;
import com.example.mortgage.refinance.domain.RefinanceComparison.LoanSummary;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java refinance comparison (no Spring / DB dependencies).
 *
 * <p>Current loan: balance at currentRate over remainingYears. Refinanced loan: balance at newRate over
 * newYears. Both use {@link RepaymentCalculator} with no bonus. Refinance costs are paid up front and are
 * NOT added to the new loan principal. A loan's payment is 0 after its last month.
 */
public final class RefinanceComparator {

    private static final int MONTHS_PER_YEAR = 12;

    private RefinanceComparator() {
    }

    public static RefinanceComparison compare(BigDecimal balance,
                                              BigDecimal currentAnnualRatePercent,
                                              int remainingYears,
                                              BigDecimal newAnnualRatePercent,
                                              int newYears,
                                              RepaymentMethod method,
                                              BigDecimal refinanceCosts) {
        RepaymentResult current = RepaymentCalculator.calculate(
                balance, currentAnnualRatePercent, remainingYears, method, BigDecimal.ZERO);
        RepaymentResult refinanced = RepaymentCalculator.calculate(
                balance, newAnnualRatePercent, newYears, method, BigDecimal.ZERO);

        int horizonMonths = Math.max(remainingYears, newYears) * MONTHS_PER_YEAR;
        List<CumulativeSaving> series = new ArrayList<>(horizonMonths);
        Integer breakEven = null;
        BigDecimal cumCurrent = BigDecimal.ZERO;
        BigDecimal cumNew = BigDecimal.ZERO;

        for (int m = 1; m <= horizonMonths; m++) {
            if (m <= current.schedule().size()) {
                cumCurrent = cumCurrent.add(current.schedule().get(m - 1).payment());
            }
            if (m <= refinanced.schedule().size()) {
                cumNew = cumNew.add(refinanced.schedule().get(m - 1).payment());
            }
            BigDecimal net = cumCurrent.subtract(cumNew).subtract(refinanceCosts);
            series.add(new CumulativeSaving(m, net));
            if (breakEven == null && net.signum() >= 0) {
                breakEven = m;
            }
        }

        LoanSummary currentSummary = summarize(current);
        LoanSummary refinancedSummary = summarize(refinanced);

        return new RefinanceComparison(
                currentSummary,
                refinancedSummary,
                refinanceCosts,
                currentSummary.monthlyPayment().subtract(refinancedSummary.monthlyPayment()),
                currentSummary.totalPayment().subtract(refinancedSummary.totalPayment().add(refinanceCosts)),
                breakEven,
                List.copyOf(series));
    }

    private static LoanSummary summarize(RepaymentResult result) {
        return new LoanSummary(
                result.monthlyPayment(),
                result.totalPayment(),
                result.totalInterest());
    }
}
