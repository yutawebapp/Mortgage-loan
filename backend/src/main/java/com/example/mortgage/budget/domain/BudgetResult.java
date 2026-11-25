package com.example.mortgage.budget.domain;

import java.math.BigDecimal;

/**
 * Result of the purchase-budget reverse estimate. Money values are whole yen (scale 0).
 *
 * @param maxPropertyPrice    maximum property price, multiple of 10,000 yen
 * @param maxLoanAmount       maximum loan amount, multiple of 10,000 yen
 * @param downPayment         down payment as given (yen)
 * @param totalBudget         maxLoanAmount + downPayment
 * @param closingCosts        closing costs of maxPropertyPrice at closingCostRatePercent (HALF_UP)
 * @param closingCostRatePercent closing cost rate in percent of property price
 * @param monthlyPayment      month-1 payment of maxLoanAmount (equal payment, no bonus)
 * @param loanExceedsPrice    true when maxLoanAmount is greater than maxPropertyPrice
 * @param burdenRatioPercent  monthlyPayment x 12 / annualIncome x 100, 1 decimal (HALF_UP); null without income
 */
public record BudgetResult(
        BigDecimal maxPropertyPrice,
        BigDecimal maxLoanAmount,
        BigDecimal downPayment,
        BigDecimal totalBudget,
        BigDecimal closingCosts,
        BigDecimal closingCostRatePercent,
        BigDecimal monthlyPayment,
        boolean loanExceedsPrice,
        BigDecimal burdenRatioPercent) {
}
