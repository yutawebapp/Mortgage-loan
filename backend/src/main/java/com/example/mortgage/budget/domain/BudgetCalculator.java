package com.example.mortgage.budget.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.eligibility.domain.EligibilityCalculator;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

/**
 * Pure Java purchase-budget calculator (購入予算の逆算). No Spring / DB dependencies.
 *
 * <p>Rules (all rule constants are defined in this class only):
 * <ol>
 *   <li>maxLoanAmount: the equal-payment principal whose monthly payment at annualRatePercent over
 *       years x 12 months equals desiredMonthlyPayment (P = M x (1 - (1+r)^-n) / r; r = 0 gives M x n),
 *       rounded <b>down</b> to a multiple of {@value #LOAN_UNIT} yen.</li>
 *   <li>totalBudget = maxLoanAmount + downPayment.</li>
 *   <li>maxPropertyPrice = totalBudget / (1 + closingCostRatePercent / 100), rounded <b>down</b> to a
 *       multiple of {@value #PRICE_UNIT} yen. Assumption: closing costs (諸費用) are paid out of the same
 *       total budget, i.e. totalBudget = price + closing costs.</li>
 *   <li>closingCosts = maxPropertyPrice x closingCostRatePercent / 100, rounded HALF_UP to whole yen
 *       ({@link RoundingPolicy}).</li>
 *   <li>monthlyPayment = month-1 equal payment of maxLoanAmount, computed by {@link RepaymentCalculator}
 *       (bonus 0); 0 when maxLoanAmount is 0.</li>
 *   <li>loanExceedsPrice = maxLoanAmount &gt; maxPropertyPrice.</li>
 *   <li>burdenRatioPercent = monthlyPayment x 12 / annualIncome x 100, rounded HALF_UP to 1 decimal;
 *       null when annualIncome is not given.</li>
 * </ol>
 * Invariants: monthlyPayment &lt;= desiredMonthlyPayment, and maxPropertyPrice + closingCosts &lt;= totalBudget
 * (price + closingCosts &lt;= price x (1 + rate/100) + 0.5 &lt;= totalBudget + 0.5, and the left side is an integer).
 */
public final class BudgetCalculator {

    /** Default closing cost rate (percent of property price) when the request omits it. */
    public static final BigDecimal DEFAULT_CLOSING_COST_RATE_PERCENT = new BigDecimal("10.0");
    /** Maximum loan amount is rounded down to a multiple of this amount (yen). */
    public static final long LOAN_UNIT = 10_000L;
    /** Maximum property price is rounded down to a multiple of this amount (yen). */
    public static final long PRICE_UNIT = 10_000L;

    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);
    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal MONTHS = BigDecimal.valueOf(MONTHS_PER_YEAR);
    private static final BigDecimal LOAN_UNIT_BD = BigDecimal.valueOf(LOAN_UNIT);
    private static final BigDecimal PRICE_UNIT_BD = BigDecimal.valueOf(PRICE_UNIT);
    private static final MathContext MC = new MathContext(60, RoundingMode.HALF_EVEN);

    private BudgetCalculator() {
    }

    /**
     * @param downPayment              down payment in yen (>= 0)
     * @param desiredMonthlyPayment    desired monthly payment in yen (>= 1)
     * @param annualRatePercent        annual rate in percent (>= 0)
     * @param years                    repayment term in years (>= 1)
     * @param closingCostRatePercent   closing cost rate in percent of property price (>= 0)
     * @param annualIncome             gross annual income in yen (> 0), or null when not given
     */
    public static BudgetResult calculate(BigDecimal downPayment,
                                         BigDecimal desiredMonthlyPayment,
                                         BigDecimal annualRatePercent,
                                         int years,
                                         BigDecimal closingCostRatePercent,
                                         BigDecimal annualIncome) {
        BigDecimal maxLoan = maxLoanAmount(desiredMonthlyPayment, annualRatePercent, years);
        BigDecimal totalBudget = maxLoan.add(downPayment);
        BigDecimal maxPrice = maxPropertyPrice(totalBudget, closingCostRatePercent);
        BigDecimal closingCosts = RoundingPolicy.yen(
                maxPrice.multiply(closingCostRatePercent).divide(PERCENT, MC));
        BigDecimal payment = monthlyPaymentOf(maxLoan, annualRatePercent, years);
        BigDecimal burden = annualIncome == null
                ? null
                : payment.multiply(MONTHS).multiply(PERCENT)
                        .divide(annualIncome, 1, RoundingMode.HALF_UP);

        return new BudgetResult(
                maxPrice,
                maxLoan,
                downPayment,
                totalBudget,
                closingCosts,
                closingCostRatePercent,
                payment,
                maxLoan.compareTo(maxPrice) > 0,
                burden);
    }

    /** Equal-payment principal for a monthly payment, rounded down to LOAN_UNIT. */
    static BigDecimal maxLoanAmount(BigDecimal monthlyPayment, BigDecimal annualRatePercent, int years) {
        int n = years * MONTHS_PER_YEAR;
        BigDecimal r = annualRatePercent.divide(PERCENT.multiply(MONTHS), MC);
        BigDecimal raw;
        if (r.signum() == 0) {
            raw = monthlyPayment.multiply(BigDecimal.valueOf(n));
        } else {
            BigDecimal growth = BigDecimal.ONE.add(r).pow(n, MC);
            raw = monthlyPayment.multiply(growth.subtract(BigDecimal.ONE))
                    .divide(r.multiply(growth), MC);
        }
        return raw.divide(LOAN_UNIT_BD, 0, EligibilityCalculator.CONSERVATIVE_ROUNDING).multiply(LOAN_UNIT_BD);
    }

    /** totalBudget / (1 + rate / 100), rounded down to PRICE_UNIT. */
    static BigDecimal maxPropertyPrice(BigDecimal totalBudget, BigDecimal closingCostRatePercent) {
        BigDecimal raw = totalBudget.multiply(PERCENT)
                .divide(PERCENT.add(closingCostRatePercent), MC);
        return raw.divide(PRICE_UNIT_BD, 0, EligibilityCalculator.CONSERVATIVE_ROUNDING).multiply(PRICE_UNIT_BD);
    }

    private static BigDecimal monthlyPaymentOf(BigDecimal loan, BigDecimal annualRatePercent, int years) {
        if (loan.signum() <= 0) {
            return BigDecimal.ZERO;
        }
        return RepaymentCalculator.calculate(loan, annualRatePercent, years,
                        RepaymentMethod.EQUAL_PAYMENT, BigDecimal.ZERO)
                .monthlyPayment();
    }
}
