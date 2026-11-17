package com.example.mortgage.prepayment.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of a one-off prepayment simulation. All money values are BigDecimal with scale 0 (whole yen).
 *
 * @param appliedPrepayment amount actually applied (capped at the balance after that month's payment)
 * @param baseline          schedule without any prepayment
 * @param afterPrepayment   schedule with the prepayment applied
 * @param interestSaving    baseline.totalInterest - afterPrepayment.totalInterest
 * @param monthsShortened   baseline.months - afterPrepayment.months
 * @param schedule          afterPrepayment schedule, month = 1..afterPrepayment.months
 */
public record PrepaymentResult(
        BigDecimal appliedPrepayment,
        Baseline baseline,
        AfterPrepayment afterPrepayment,
        BigDecimal interestSaving,
        int monthsShortened,
        List<Row> schedule) {

    /**
     * @param months         number of monthly payments until payoff
     * @param monthlyPayment first month's payment
     * @param totalPayment   sum of regular payments (excluding any prepayment)
     * @param totalInterest  sum of interest
     */
    public record Baseline(int months, BigDecimal monthlyPayment, BigDecimal totalPayment, BigDecimal totalInterest) {
    }

    /**
     * @param months              months until payoff, including the first afterMonth months
     * @param monthlyPaymentBefore payment of the prepayment month
     * @param monthlyPaymentAfter  first payment after the prepayment (0 when fully paid off)
     * @param totalPayment        sum of regular payments (excluding any prepayment)
     * @param totalInterest       sum of interest
     */
    public record AfterPrepayment(
            int months,
            BigDecimal monthlyPaymentBefore,
            BigDecimal monthlyPaymentAfter,
            BigDecimal totalPayment,
            BigDecimal totalInterest) {
    }

    /**
     * @param month      1-based month number
     * @param payment    regular payment of this month
     * @param principal  principal part of the regular payment
     * @param interest   interest part of the regular payment
     * @param prepayment amount prepaid right after this month's payment (0 if none)
     * @param balance    balance after the payment and the prepayment
     */
    public record Row(int month, BigDecimal payment, BigDecimal principal, BigDecimal interest,
                      BigDecimal prepayment, BigDecimal balance) {
    }
}
