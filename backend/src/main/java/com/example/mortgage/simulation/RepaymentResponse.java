package com.example.mortgage.simulation;

import java.util.List;

/**
 * Response body of POST /api/v1/simulations/repayment. All amounts are whole yen.
 *
 * @param monthlyPayment first regular month's payment, excluding bonus
 * @param bonusPayment   first bonus payment (0 if none)
 * @param totalPayment   sum of all payments (including bonus)
 * @param totalInterest  sum of all interest
 * @param schedule       one row per month, month = 1..years*12
 * @param pairBreakdown each person's own payments when selfSharePercent was given; null otherwise
 */
public record RepaymentResponse(
        long monthlyPayment,
        long bonusPayment,
        long totalPayment,
        long totalInterest,
        List<Row> schedule,
        PairBreakdown pairBreakdown) {

    /**
     * Two-person split by 負担割合. Each person's loan is repaid separately (simplified model).
     *
     * @param self    the self borrower
     * @param partner the partner
     * @param notes   modelling notes (codes), e.g. PAIR_SHARE_PROVISIONAL
     */
    public record PairBreakdown(Person self, Person partner, List<String> notes) {
    }

    /**
     * One person's share. All amounts are whole yen.
     *
     * @param principal      this person's share of the loan principal
     * @param bonusAmount    this person's share of the bonus-repaid amount
     * @param monthlyPayment first regular month's payment, excluding bonus
     * @param bonusPayment   first bonus payment (0 if none)
     * @param totalPayment   sum of this person's payments (including bonus)
     * @param totalInterest  sum of this person's interest
     */
    public record Person(
            long principal,
            long bonusAmount,
            long monthlyPayment,
            long bonusPayment,
            long totalPayment,
            long totalInterest) {
    }

    /**
     * @param month        1-based month number
     * @param payment      total paid this month (including bonus)
     * @param bonusPayment bonus part of the payment (0 if not a bonus month)
     * @param principal    principal repaid this month
     * @param interest     interest paid this month
     * @param balance      remaining balance after this month's payment
     */
    public record Row(
            int month,
            long payment,
            long bonusPayment,
            long principal,
            long interest,
            long balance) {
    }
}
