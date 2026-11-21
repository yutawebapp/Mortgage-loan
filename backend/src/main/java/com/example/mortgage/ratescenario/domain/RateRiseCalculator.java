package com.example.mortgage.ratescenario.domain;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java variable-rate rise simulation (no Spring / DB dependencies).
 *
 * <p>SIMPLIFIED model: the rate steps up once, after month riseAfterYears*12 (that month's payment is still at
 * the old rate). The remaining balance is re-amortized over the remaining years at the new rate, using the
 * same method. Real loans' 5-year rule / 125% rule are NOT modelled.
 *
 * <p>Stage 1 is the plain schedule at the starting rate; stage 2 is
 * {@code RepaymentCalculator.calculate(balanceAtRise, start + rise, years - riseAfterYears, method, 0)}.
 * No bonus is used.
 */
public final class RateRiseCalculator {

    private static final int MONTHS_PER_YEAR = 12;

    private RateRiseCalculator() {
    }

    /**
     * @param principal         loan amount in yen (>= 1)
     * @param startRatePercent  starting annual rate in percent, e.g. 0.5 means 0.5%
     * @param years             loan term in years (>= 2)
     * @param method            repayment method
     * @param riseAfterYears    the rate rises after this many years (1 <= riseAfterYears < years)
     * @param risePoints        rate steps in percentage points, each > 0
     */
    public static RateRiseComparison compare(BigDecimal principal,
                                             BigDecimal startRatePercent,
                                             int years,
                                             RepaymentMethod method,
                                             int riseAfterYears,
                                             List<BigDecimal> risePoints) {
        if (riseAfterYears < 1 || riseAfterYears >= years) {
            throw new IllegalArgumentException("riseAfterYears must satisfy 1 <= riseAfterYears < years");
        }
        int riseMonth = riseAfterYears * MONTHS_PER_YEAR;

        RepaymentResult stage1 = RepaymentCalculator.calculate(
                principal, startRatePercent, years, method, BigDecimal.ZERO);
        List<ScheduleRow> stage1Rows = stage1.schedule();

        // Baseline: the plain schedule, no rise.
        List<BigDecimal> basePayments = payments(stage1Rows);
        BigDecimal baseInterest = sumInterest(stage1Rows);
        RateRiseScenario baseline = toScenario(BigDecimal.ZERO, startRatePercent,
                basePayments, baseInterest, riseMonth, baseInterest, basePayments.get(riseMonth));

        List<RateRiseScenario> scenarios = new ArrayList<>(risePoints.size());
        for (BigDecimal rise : risePoints) {
            BigDecimal rateAfter = startRatePercent.add(rise);
            RateSwitchSchedule.Result switched = RateSwitchSchedule.calculate(stage1, rateAfter, years, method, riseAfterYears);
            scenarios.add(toScenario(rise, rateAfter, switched.payments(), switched.totalInterest(), riseMonth, baseInterest,
                    basePayments.get(riseMonth)));
        }
        return new RateRiseComparison(baseline, List.copyOf(scenarios));
    }

    private static RateRiseScenario toScenario(BigDecimal rise,
                                               BigDecimal rateAfter,
                                               List<BigDecimal> payments,
                                               BigDecimal totalInterest,
                                               int riseMonth,
                                               BigDecimal baselineInterest,
                                               BigDecimal baselinePaymentAfter) {
        BigDecimal totalPayment = payments.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal before = payments.get(riseMonth - 1);
        BigDecimal after = payments.get(riseMonth);
        return new RateRiseScenario(
                rise,
                rateAfter,
                before,
                after,
                after.subtract(before),
                after.subtract(baselinePaymentAfter),
                totalPayment,
                totalInterest,
                totalInterest.subtract(baselineInterest),
                List.copyOf(payments));
    }

    private static List<BigDecimal> payments(List<ScheduleRow> rows) {
        return rows.stream().map(ScheduleRow::payment).toList();
    }

    private static BigDecimal sumInterest(List<ScheduleRow> rows) {
        return rows.stream().map(ScheduleRow::interest).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
