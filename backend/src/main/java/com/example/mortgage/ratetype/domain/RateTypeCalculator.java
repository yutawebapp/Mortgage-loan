package com.example.mortgage.ratetype.domain;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;
import com.example.mortgage.ratescenario.domain.RateSwitchSchedule;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java rate-type comparison (no Spring / DB dependencies). All rates are user-entered assumptions.
 *
 * <p>SIMPLIFIED model (same idea as RateRiseCalculator): a two-stage case keeps the first stage's full-term
 * schedule up to the switch month (that month's payment is still at the old rate), then re-amortizes the
 * remaining balance over the remaining years at the after-rate, using the same method. Single-stage cases are
 * the plain schedule. 5-year rule / 125% rule, fees, guarantee and 団信 differences are NOT modelled.
 *
 * <p>All amortization is delegated to {@link RepaymentCalculator#calculate}. No bonus is used.
 */
public final class RateTypeCalculator {

    private static final int MONTHS_PER_YEAR = 12;

    private RateTypeCalculator() {
    }

    /**
     * @param principal                     loan amount in yen (>= 1)
     * @param years                         loan term in years (>= 2)
     * @param method                        repayment method
     * @param variableRatePercent           variable rate in percent (before the rise)
     * @param variableRiseAfterYears        variable rate rises after this many years (1 <= x < years)
     * @param variableRisePoints            rise in percentage points (> 0)
     * @param fixedPeriodYears              fixed period in years (1 <= x < years)
     * @param fixedPeriodRatePercent        fixed rate in percent during the fixed period
     * @param fixedPeriodAfterRatePercent   rate in percent after the fixed period (may be lower or higher)
     * @param fullFixedRatePercent          rate in percent for the full-term fixed case
     */
    public static RateTypeComparison compare(BigDecimal principal,
                                             int years,
                                             RepaymentMethod method,
                                             BigDecimal variableRatePercent,
                                             int variableRiseAfterYears,
                                             BigDecimal variableRisePoints,
                                             int fixedPeriodYears,
                                             BigDecimal fixedPeriodRatePercent,
                                             BigDecimal fixedPeriodAfterRatePercent,
                                             BigDecimal fullFixedRatePercent) {
        requireInRange(variableRiseAfterYears, years, "variableRiseAfterYears");
        requireInRange(fixedPeriodYears, years, "fixedPeriodYears");

        BigDecimal variableRiseRate = variableRatePercent.add(variableRisePoints);

        List<BigDecimal> fullFixed = singleStage(principal, fullFixedRatePercent, years, method);
        BigDecimal fullFixedTotal = sum(fullFixed);

        List<RateTypeComparison.Case> cases = List.of(
                singleCase(RateType.VARIABLE_FLAT, variableRatePercent,
                        singleStage(principal, variableRatePercent, years, method), principal, years,
                        fullFixedTotal),
                twoStageCase(RateType.VARIABLE_RISE, principal, years, method,
                        variableRatePercent, variableRiseRate, variableRiseAfterYears, fullFixedTotal),
                twoStageCase(RateType.FIXED_PERIOD, principal, years, method,
                        fixedPeriodRatePercent, fixedPeriodAfterRatePercent, fixedPeriodYears, fullFixedTotal),
                singleCase(RateType.FULL_FIXED, fullFixedRatePercent, fullFixed, principal, years,
                        fullFixedTotal));
        return new RateTypeComparison(cases);
    }

    private static RateTypeComparison.Case twoStageCase(RateType type,
                                                        BigDecimal principal,
                                                        int years,
                                                        RepaymentMethod method,
                                                        BigDecimal rateFirst,
                                                        BigDecimal rateAfter,
                                                        int switchYears,
                                                        BigDecimal fullFixedTotal) {
        int switchMonth = switchYears * MONTHS_PER_YEAR;
        RepaymentResult stage1 = RepaymentCalculator.calculate(principal, rateFirst, years, method, BigDecimal.ZERO);
        List<BigDecimal> payments = RateSwitchSchedule.calculate(stage1, rateAfter, years, method, switchYears).payments();

        BigDecimal total = sum(payments);
        return new RateTypeComparison.Case(
                type,
                rateFirst,
                rateAfter,
                switchYears,
                payments.get(0),
                payments.get(switchMonth - 1),
                payments.get(switchMonth),
                total,
                total.subtract(principal),
                total.subtract(fullFixedTotal),
                yearly(payments, years));
    }

    private static RateTypeComparison.Case singleCase(RateType type,
                                                      BigDecimal rate,
                                                      List<BigDecimal> payments,
                                                      BigDecimal principal,
                                                      int years,
                                                      BigDecimal fullFixedTotal) {
        BigDecimal total = sum(payments);
        return new RateTypeComparison.Case(
                type,
                rate,
                null,
                null,
                payments.get(0),
                null,
                null,
                total,
                total.subtract(principal),
                total.subtract(fullFixedTotal),
                yearly(payments, years));
    }

    private static List<BigDecimal> singleStage(BigDecimal principal,
                                                BigDecimal rate,
                                                int years,
                                                RepaymentMethod method) {
        return payments(RepaymentCalculator.calculate(principal, rate, years, method, BigDecimal.ZERO).schedule());
    }

    private static List<BigDecimal> payments(List<ScheduleRow> rows) {
        return rows.stream().map(ScheduleRow::payment).toList();
    }

    private static List<BigDecimal> yearly(List<BigDecimal> payments, int years) {
        List<BigDecimal> yearly = new ArrayList<>(years);
        for (int y = 0; y < years; y++) {
            yearly.add(sum(payments.subList(y * MONTHS_PER_YEAR, (y + 1) * MONTHS_PER_YEAR)));
        }
        return List.copyOf(yearly);
    }

    private static BigDecimal sum(List<BigDecimal> values) {
        return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static void requireInRange(int value, int years, String name) {
        if (value < 1 || value >= years) {
            throw new IllegalArgumentException(name + " must satisfy 1 <= " + name + " < years");
        }
    }
}
