package com.example.mortgage.prepayment.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;
import com.example.mortgage.prepayment.domain.PrepaymentResult.AfterPrepayment;
import com.example.mortgage.prepayment.domain.PrepaymentResult.Baseline;
import com.example.mortgage.prepayment.domain.PrepaymentResult.Row;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java one-off prepayment simulator (no Spring / DB dependencies).
 *
 * <p>The baseline is the normal schedule from {@link RepaymentCalculator} (no bonus). The prepayment is made
 * right after the regular payment of month {@code afterMonth}. It is capped at the balance left after that
 * payment; a cap means full payoff.
 * <ul>
 *   <li>{@link PrepaymentType#SHORTEN_TERM}: the regular payment is kept (EQUAL_PAYMENT: same amount;
 *       EQUAL_PRINCIPAL: same principal part per month) and the loan ends earlier.</li>
 *   <li>{@link PrepaymentType#REDUCE_PAYMENT}: the remaining number of months is kept and the payment is
 *       recomputed from the reduced balance.</li>
 * </ul>
 * Amortization steps are delegated to {@link RepaymentCalculator}; rounding follows {@link RoundingPolicy}.
 */
public final class PrepaymentCalculator {

    private static final int MONTHS_PER_YEAR = 12;

    private PrepaymentCalculator() {
    }

    /**
     * @param principal         loan amount in yen (>= 1)
     * @param annualPercent     annual rate in percent, e.g. 1.2 means 1.2%
     * @param years             loan term in years (>= 1)
     * @param method            EQUAL_PAYMENT or EQUAL_PRINCIPAL
     * @param afterMonth        prepayment is made after this month's payment (1 <= afterMonth < years * 12)
     * @param amount            requested prepayment in yen (>= 1)
     * @param type              SHORTEN_TERM or REDUCE_PAYMENT
     */
    public static PrepaymentResult simulate(BigDecimal principal,
                                            BigDecimal annualPercent,
                                            int years,
                                            RepaymentMethod method,
                                            int afterMonth,
                                            BigDecimal amount,
                                            PrepaymentType type) {
        int termMonths = years * MONTHS_PER_YEAR;
        if (afterMonth < 1 || afterMonth >= termMonths) {
            throw new IllegalArgumentException("afterMonth must be in 1..years*12-1");
        }
        if (amount.signum() <= 0) {
            throw new IllegalArgumentException("amount must be positive");
        }

        RepaymentResult base = RepaymentCalculator.calculate(principal, annualPercent, years, method,
                BigDecimal.ZERO);
        List<ScheduleRow> baseRows = base.schedule();

        ScheduleRow pivot = baseRows.get(afterMonth - 1);
        BigDecimal applied = amount.min(pivot.balance());
        BigDecimal balance = pivot.balance().subtract(applied);

        List<Row> rows = new ArrayList<>(termMonths);
        for (int m = 1; m <= afterMonth; m++) {
            ScheduleRow b = baseRows.get(m - 1);
            rows.add(new Row(m, b.payment(), b.principal(), b.interest(), BigDecimal.ZERO, b.balance()));
        }
        rows.set(afterMonth - 1, new Row(afterMonth, pivot.payment(), pivot.principal(), pivot.interest(),
                applied, balance));

        BigDecimal monthlyPaymentAfter = BigDecimal.ZERO;
        if (balance.signum() > 0) {
            List<Row> tail = type == PrepaymentType.SHORTEN_TERM
                    ? shortenTail(balance, annualPercent, method, afterMonth, termMonths, base, baseRows)
                    : reduceTail(balance, annualPercent, method, afterMonth, termMonths);
            rows.addAll(tail);
            monthlyPaymentAfter = tail.get(0).payment();
        }

        BigDecimal afterTotalPayment = BigDecimal.ZERO;
        BigDecimal afterTotalInterest = BigDecimal.ZERO;
        for (Row row : rows) {
            afterTotalPayment = afterTotalPayment.add(row.payment());
            afterTotalInterest = afterTotalInterest.add(row.interest());
        }

        int afterMonths = rows.size();
        int baselineMonths = baseRows.size();
        Baseline baseline = new Baseline(baselineMonths, base.monthlyPayment(),
                base.totalPayment(), base.totalInterest());
        AfterPrepayment after = new AfterPrepayment(afterMonths, pivot.payment(), monthlyPaymentAfter,
                afterTotalPayment, afterTotalInterest);

        return new PrepaymentResult(
                applied,
                baseline,
                after,
                base.totalInterest().subtract(afterTotalInterest),
                baselineMonths - afterMonths,
                List.copyOf(rows));
    }

    /**
     * Keeps the regular payment (or principal part) of the baseline and runs until the balance is cleared.
     * Final month (or any month reaching the term) pays off whatever is left.
     */
    private static List<Row> shortenTail(BigDecimal balance,
                                         BigDecimal annualPercent,
                                         RepaymentMethod method,
                                         int afterMonth,
                                         int termMonths,
                                         RepaymentResult base,
                                         List<ScheduleRow> baseRows) {
        List<ScheduleRow> rest = RepaymentCalculator.runOffMonthly(balance, annualPercent, afterMonth + 1,
                termMonths, method, base.monthlyPayment(), m -> baseRows.get(m - 1).principal());
        List<Row> tail = new ArrayList<>(rest.size());
        for (ScheduleRow r : rest) {
            tail.add(new Row(r.month(), r.payment(), r.principal(), r.interest(), BigDecimal.ZERO, r.balance()));
        }
        return tail;
    }

    /** Keeps the remaining number of months and recomputes the payment from the reduced balance. */
    private static List<Row> reduceTail(BigDecimal balance,
                                        BigDecimal annualPercent,
                                        RepaymentMethod method,
                                        int afterMonth,
                                        int termMonths) {
        List<ScheduleRow> rest = RepaymentCalculator.singleLoanSchedule(
                balance, annualPercent, termMonths - afterMonth, method);
        List<Row> tail = new ArrayList<>(rest.size());
        for (ScheduleRow r : rest) {
            tail.add(new Row(afterMonth + r.month(), r.payment(), r.principal(), r.interest(),
                    BigDecimal.ZERO, r.balance()));
        }
        return tail;
    }
}
