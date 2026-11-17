package com.example.mortgage.budget;

import java.math.BigDecimal;

/**
 * Response body of POST /api/v1/simulations/budget. Amounts are whole yen; this is a 目安 (estimate), not a guarantee.
 *
 * @param maxPropertyPrice        maximum property price (multiple of 10,000 yen)
 * @param maxLoanAmount           maximum loan amount (multiple of 10,000 yen)
 * @param downPayment             down payment
 * @param totalBudget             maxLoanAmount + downPayment
 * @param closingCosts            closing costs of maxPropertyPrice
 * @param closingCostRatePercent  closing cost rate in percent used
 * @param monthlyPayment          month-1 payment of maxLoanAmount (&lt;= desired monthly payment)
 * @param loanExceedsPrice        true when maxLoanAmount is greater than maxPropertyPrice
 * @param burdenRatioPercent      monthlyPayment x 12 / annualIncome, 1 decimal; null when annualIncome not given
 */
public record BudgetResponse(
        long maxPropertyPrice,
        long maxLoanAmount,
        long downPayment,
        long totalBudget,
        long closingCosts,
        BigDecimal closingCostRatePercent,
        long monthlyPayment,
        boolean loanExceedsPrice,
        BigDecimal burdenRatioPercent) {
}
