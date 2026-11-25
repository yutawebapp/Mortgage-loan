package com.example.mortgage.eligibility.domain;

import com.example.mortgage.eligibility.domain.EligibilityResult.Estimate;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Pure Java borrowing-capacity (借入可能額 / 審査目安) calculator. No Spring / DB dependencies.
 *
 * <p>Rules (all rule constants are defined in this class only):
 * <ol>
 *   <li>Burden ratio limit: annualIncome &lt; {@value #INCOME_THRESHOLD} yen → {@value #LIMIT_BELOW_THRESHOLD_PERCENT}%,
 *       otherwise {@value #LIMIT_AT_OR_ABOVE_THRESHOLD_PERCENT}%.</li>
 *   <li>maxAnnualRepayment = annualIncome x limit (rounded down to whole yen).</li>
 *   <li>availableAnnualRepayment = max(0, maxAnnualRepayment - otherAnnualRepayments).</li>
 *   <li>availableMonthlyRepayment = availableAnnualRepayment / 12, rounded down to whole yen.</li>
 *   <li>Borrowable principal for a rate r (annual %, monthly r = rate / 12 / 100) and n = years x 12 months,
 *       from the equal-payment formula P = M x (1 - (1+r)^-n) / r (r = 0 gives M x n),
 *       rounded <b>down</b> to a multiple of {@value #LOAN_UNIT} yen (conservative).</li>
 *   <li>monthlyPayment of each estimate = equal-payment monthly payment of that principal at that rate,
 *       computed by {@link RepaymentCalculator} (bonus 0). If it would exceed availableMonthlyRepayment
 *       because of yen rounding, the principal is reduced one {@value #LOAN_UNIT} step at a time until it fits.</li>
 * </ol>
 * Rounding is always DOWN ({@link #CONSERVATIVE_ROUNDING}) for these estimates; it is not the
 * rounding of {@code RoundingPolicy} (which is used for schedule amounts).
 */
public final class EligibilityCalculator {

    /** Annual income (yen) below which the lower burden ratio applies. */
    public static final long INCOME_THRESHOLD = 4_000_000L;
    /** Burden ratio limit (percent) when annualIncome &lt; INCOME_THRESHOLD. */
    public static final int LIMIT_BELOW_THRESHOLD_PERCENT = 30;
    /** Burden ratio limit (percent) when annualIncome &gt;= INCOME_THRESHOLD. */
    public static final int LIMIT_AT_OR_ABOVE_THRESHOLD_PERCENT = 35;
    /** Borrowable principal is rounded down to a multiple of this amount (yen). */
    public static final long LOAN_UNIT = 10_000L;
    /** Rounding used for every yen amount in this estimate. */
    public static final RoundingMode CONSERVATIVE_ROUNDING = RoundingMode.DOWN;

    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);
    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal MONTHS = BigDecimal.valueOf(MONTHS_PER_YEAR);
    private static final BigDecimal UNIT = BigDecimal.valueOf(LOAN_UNIT);
    private static final MathContext MC = new MathContext(60, RoundingMode.HALF_EVEN);

    private EligibilityCalculator() {
    }

    /** Burden ratio limit in percent for the given annual income. */
    public static int burdenRatioLimitPercent(BigDecimal annualIncome) {
        return annualIncome.compareTo(BigDecimal.valueOf(INCOME_THRESHOLD)) < 0
                ? LIMIT_BELOW_THRESHOLD_PERCENT
                : LIMIT_AT_OR_ABOVE_THRESHOLD_PERCENT;
    }

    /**
     * @param annualIncome             gross annual income in yen (> 0)
     * @param otherAnnualRepayments    existing loans' annual repayments in yen (>= 0)
     * @param screeningRatePercent     screening rate in percent (>= 0)
     * @param actualRatePercent        planned loan rate in percent (>= 0)
     * @param years                    repayment term in years (>= 1)
     */
    public static EligibilityResult calculate(BigDecimal annualIncome,
                                              BigDecimal otherAnnualRepayments,
                                              BigDecimal screeningRatePercent,
                                              BigDecimal actualRatePercent,
                                              int years) {
        int limit = burdenRatioLimitPercent(annualIncome);
        BigDecimal maxAnnual = annualIncome.multiply(BigDecimal.valueOf(limit))
                .divide(PERCENT, 0, CONSERVATIVE_ROUNDING);
        BigDecimal availableAnnual = maxAnnual.subtract(otherAnnualRepayments).max(BigDecimal.ZERO);
        BigDecimal availableMonthly = availableAnnual.divide(MONTHS, 0, CONSERVATIVE_ROUNDING);

        return new EligibilityResult(
                limit,
                maxAnnual,
                availableAnnual,
                availableMonthly,
                estimate(availableMonthly, screeningRatePercent, years),
                estimate(availableMonthly, actualRatePercent, years));
    }

    private static Estimate estimate(BigDecimal monthlyBudget, BigDecimal ratePercent, int years) {
        BigDecimal principal = maxPrincipal(monthlyBudget, ratePercent, years);
        BigDecimal payment = paymentOf(principal, ratePercent, years);
        // Yen rounding of the payment could in theory push it past the budget; step the principal down.
        while (payment.compareTo(monthlyBudget) > 0 && principal.signum() > 0) {
            principal = principal.subtract(UNIT);
            payment = paymentOf(principal, ratePercent, years);
        }
        return new Estimate(ratePercent, principal, payment);
    }

    /** Borrowable principal for a monthly budget, rounded down to LOAN_UNIT. */
    static BigDecimal maxPrincipal(BigDecimal monthlyBudget, BigDecimal ratePercent, int years) {
        if (monthlyBudget.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        int n = years * MONTHS_PER_YEAR;
        BigDecimal r = ratePercent.divide(PERCENT.multiply(MONTHS), MC);
        BigDecimal raw;
        if (r.signum() == 0) {
            raw = monthlyBudget.multiply(BigDecimal.valueOf(n));
        } else {
            BigDecimal growth = BigDecimal.ONE.add(r).pow(n, MC);
            raw = monthlyBudget.multiply(growth.subtract(BigDecimal.ONE))
                    .divide(r.multiply(growth), MC);
        }
        return raw.divide(UNIT, 0, CONSERVATIVE_ROUNDING).multiply(UNIT);
    }

    private static BigDecimal paymentOf(BigDecimal principal, BigDecimal ratePercent, int years) {
        if (principal.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return RepaymentCalculator.calculate(principal, ratePercent, years,
                        RepaymentMethod.EQUAL_PAYMENT, BigDecimal.ZERO)
                .monthlyPayment();
    }
}
