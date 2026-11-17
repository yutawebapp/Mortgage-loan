package com.example.mortgage.simulation.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java repayment calculator (no Spring / DB dependencies).
 *
 * <p>Model: the loan is split into two independent loans.
 * <ul>
 *   <li>Regular loan: principal - bonusAmount, monthly rate = annual / 12, n = years * 12.</li>
 *   <li>Bonus loan: bonusAmount, semi-annual rate = annual / 2, n = years * 2.
 *       Its payments fall in months 6, 12, 18, ... (month % 6 == 0).</li>
 * </ul>
 * In a bonus month the payment is the regular payment plus the bonus payment.
 *
 * <p>Rounding: every interest / payment / principal amount is rounded to whole yen with
 * {@link RoundingPolicy}. The final period of each loan pays off the remaining balance exactly,
 * so the ending balance is 0 and the sum of principal parts equals the principal.
 */
public final class RepaymentCalculator {

    private static final MathContext MC = new MathContext(60, RoundingMode.HALF_EVEN);
    private static final BigDecimal PERCENT = BigDecimal.valueOf(100);
    private static final int MONTHS_PER_YEAR = 12;
    private static final int BONUS_INTERVAL_MONTHS = 6;
    private static final int BONUS_PAYMENTS_PER_YEAR = MONTHS_PER_YEAR / BONUS_INTERVAL_MONTHS; // 2

    private RepaymentCalculator() {
    }

    /**
     * @param principal         loan amount in yen (>= 0)
     * @param annualRatePercent annual rate in percent, e.g. 1.2 means 1.2%
     * @param years             loan term in years (>= 1)
     * @param method            repayment method
     * @param bonusAmount       part of principal repaid by bonus payments (0 <= bonus <= principal)
     */
    public static RepaymentResult calculate(BigDecimal principal,
                                            BigDecimal annualRatePercent,
                                            int years,
                                            RepaymentMethod method,
                                            BigDecimal bonusAmount) {
        int regularMonths = years * MONTHS_PER_YEAR;
        int bonusPeriods = years * BONUS_PAYMENTS_PER_YEAR;

        List<Loan> regular = generate(principal.subtract(bonusAmount),
                annualRatePercent, MONTHS_PER_YEAR, regularMonths, method);
        List<Loan> bonus = bonusAmount.signum() == 0
                ? List.of()
                : generate(bonusAmount, annualRatePercent, BONUS_PAYMENTS_PER_YEAR, bonusPeriods, method);

        List<ScheduleRow> schedule = new ArrayList<>(regularMonths);
        BigDecimal totalPayment = BigDecimal.ZERO;
        BigDecimal totalInterest = BigDecimal.ZERO;
        BigDecimal bonusBalance = bonusAmount;

        for (int month = 1; month <= regularMonths; month++) {
            Loan reg = regular.get(month - 1);
            Loan bon = (month % BONUS_INTERVAL_MONTHS == 0 && !bonus.isEmpty())
                    ? bonus.get(month / BONUS_INTERVAL_MONTHS - 1)
                    : null;

            BigDecimal bonusPayment = BigDecimal.ZERO;
            BigDecimal bonusPrincipal = BigDecimal.ZERO;
            BigDecimal bonusInterest = BigDecimal.ZERO;
            if (bon != null) {
                bonusPayment = bon.payment();
                bonusPrincipal = bon.principal();
                bonusInterest = bon.interest();
                bonusBalance = bon.balance();
            }

            BigDecimal payment = reg.payment().add(bonusPayment);
            BigDecimal interest = reg.interest().add(bonusInterest);
            totalPayment = totalPayment.add(payment);
            totalInterest = totalInterest.add(interest);

            schedule.add(new ScheduleRow(
                    month,
                    payment,
                    bonusPayment,
                    reg.principal().add(bonusPrincipal),
                    interest,
                    reg.balance().add(bonusBalance)));
        }

        return new RepaymentResult(
                regular.get(0).payment(),
                bonus.isEmpty() ? BigDecimal.ZERO : bonus.get(0).payment(),
                totalPayment,
                totalInterest,
                schedule);
    }

    /** One period of a single loan. All amounts are whole yen. */
    private record Loan(BigDecimal payment, BigDecimal principal, BigDecimal interest, BigDecimal balance) {
    }

    /**
     * Generates the period-by-period schedule of a single loan.
     *
     * <p>Interest is computed as balance * annualPercent / (100 * periodsPerYear). Multiplying first and
     * dividing by an exact integer keeps terminating results exact, so a value like 14648.5 rounds
     * half-up to 14649 instead of being pushed below .5 by a truncated rate.
     *
     * @param principal        loan amount (whole yen, >= 0)
     * @param annualPercent    annual rate in percent (1.2 means 1.2%)
     * @param periodsPerYear   12 for monthly, 2 for semi-annual
     * @param n                number of periods (>= 1)
     */
    private static List<Loan> generate(BigDecimal principal, BigDecimal annualPercent, int periodsPerYear,
                                       int n, RepaymentMethod method) {
        BigDecimal divisor = PERCENT.multiply(BigDecimal.valueOf(periodsPerYear));
        BigDecimal periodRate = annualPercent.divide(divisor, MC);
        BigDecimal fixedPayment = method == RepaymentMethod.EQUAL_PAYMENT
                ? RoundingPolicy.yen(annuityPayment(principal, periodRate, n))
                : BigDecimal.ZERO;

        // EQUAL_PRINCIPAL: principal parts are floor(P/n) with the first (P mod n) periods getting +1,
        // so the parts are non-increasing and sum exactly to P.
        BigDecimal[] divMod = principal.divideAndRemainder(BigDecimal.valueOf(n));
        BigDecimal basePrincipal = divMod[0];
        int extraPeriods = divMod[1].intValueExact();

        List<Loan> loans = new ArrayList<>(n);
        BigDecimal balance = principal;
        for (int k = 1; k <= n; k++) {
            BigDecimal interest = RoundingPolicy.yen(balance.multiply(annualPercent).divide(divisor, MC));
            BigDecimal principalPart;
            if (k == n) {
                // Final period pays off whatever is left (absorbs any rounding).
                principalPart = balance;
            } else if (method == RepaymentMethod.EQUAL_PAYMENT) {
                // Principal = fixed payment - interest; clamp so principal is never negative.
                principalPart = fixedPayment.subtract(interest).max(BigDecimal.ZERO).min(balance);
            } else {
                principalPart = k <= extraPeriods ? basePrincipal.add(BigDecimal.ONE) : basePrincipal;
            }
            balance = balance.subtract(principalPart);
            BigDecimal payment = interest.add(principalPart);
            loans.add(new Loan(payment, principalPart, interest, balance));
        }
        return loans;
    }

    /** Level payment P*r*A/(A-1) with A=(1+r)^n; r=0 gives P/n. Not rounded. */
    private static BigDecimal annuityPayment(BigDecimal principal, BigDecimal periodRate, int n) {
        if (periodRate.signum() == 0) {
            return principal.divide(BigDecimal.valueOf(n), MC);
        }
        BigDecimal growth = BigDecimal.ONE.add(periodRate).pow(n, MC);
        return principal.multiply(periodRate).multiply(growth).divide(growth.subtract(BigDecimal.ONE), MC);
    }
}
