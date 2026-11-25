package com.example.mortgage.simulation.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of a repayment calculation. All money values are BigDecimal with scale 0 (whole yen).
 *
 * @param monthlyPayment first regular month's payment, excluding bonus
 * @param bonusPayment   first bonus payment (0 when there is no bonus)
 * @param totalPayment   sum of all payments in the schedule (including bonus)
 * @param totalInterest  sum of all interest in the schedule
 * @param schedule       month-by-month schedule, month = 1..years*12
 */
public record RepaymentResult(
        BigDecimal monthlyPayment,
        BigDecimal bonusPayment,
        BigDecimal totalPayment,
        BigDecimal totalInterest,
        List<ScheduleRow> schedule) {

    /**
     * One month of the schedule.
     *
     * @param month        1-based month number
     * @param payment      total paid this month (regular + bonus)
     * @param bonusPayment bonus part of the payment (0 if not a bonus month)
     * @param principal    principal repaid this month
     * @param interest     interest paid this month
     * @param balance      remaining balance after this month's payment
     */
    public record ScheduleRow(
            int month,
            BigDecimal payment,
            BigDecimal bonusPayment,
            BigDecimal principal,
            BigDecimal interest,
            BigDecimal balance) {
    }
}
