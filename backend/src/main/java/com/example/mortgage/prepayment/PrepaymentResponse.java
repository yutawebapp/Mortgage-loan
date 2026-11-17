package com.example.mortgage.prepayment;

import java.util.List;

/**
 * Response body of POST /api/v1/simulations/prepayment. All amounts are whole yen.
 *
 * @param appliedPrepayment amount actually applied (equals the balance when fully paid off)
 * @param baseline          schedule without prepayment
 * @param afterPrepayment   schedule with prepayment
 * @param interestSaving    baseline.totalInterest - afterPrepayment.totalInterest
 * @param monthsShortened   baseline.months - afterPrepayment.months
 * @param schedule          afterPrepayment schedule, one row per month until payoff
 */
public record PrepaymentResponse(
        long appliedPrepayment,
        Baseline baseline,
        AfterPrepayment afterPrepayment,
        long interestSaving,
        int monthsShortened,
        List<Row> schedule) {

    /**
     * @param months         months until payoff
     * @param monthlyPayment first month's payment
     * @param totalPayment   sum of regular payments
     * @param totalInterest  sum of interest
     */
    public record Baseline(int months, long monthlyPayment, long totalPayment, long totalInterest) {
    }

    /**
     * @param months               months until payoff, including the months before the prepayment
     * @param monthlyPaymentBefore payment of the prepayment month
     * @param monthlyPaymentAfter  first payment after the prepayment (0 when fully paid off)
     * @param totalPayment         sum of regular payments (excluding the prepayment)
     * @param totalInterest        sum of interest
     */
    public record AfterPrepayment(int months, long monthlyPaymentBefore, long monthlyPaymentAfter,
                                  long totalPayment, long totalInterest) {
    }

    /**
     * @param month      1-based month number
     * @param payment    regular payment of this month
     * @param principal  principal part of the regular payment
     * @param interest   interest part of the regular payment
     * @param prepayment amount prepaid after this month's payment (0 if none)
     * @param balance    balance after the payment and the prepayment
     */
    public record Row(int month, long payment, long principal, long interest, long prepayment, long balance) {
    }
}
