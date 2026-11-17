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
 */
public record RepaymentResponse(
        long monthlyPayment,
        long bonusPayment,
        long totalPayment,
        long totalInterest,
        List<Row> schedule) {

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
