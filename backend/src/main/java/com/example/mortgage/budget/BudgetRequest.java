package com.example.mortgage.budget;

import com.example.mortgage.budget.domain.BudgetCalculator;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/budget.
 * Do not log instances of this class (contains user inputs).
 *
 * @param downPayment             down payment in yen, 0..1,000,000,000 (null means 0)
 * @param desiredMonthlyPayment   desired monthly payment in yen, 1..10,000,000
 * @param annualRatePercent       annual rate in percent, 0..20
 * @param years                   repayment term in years, 1..50
 * @param closingCostRatePercent  closing costs as percent of property price, 0..30 (null means 10.0)
 * @param annualIncome            gross annual income in yen, 1..1,000,000,000 (optional; only for burden ratio)
 */
public record BudgetRequest(
        @Min(0)
        @Max(1_000_000_000L)
        Long downPayment,

        @NotNull
        @Min(1)
        @Max(10_000_000L)
        Long desiredMonthlyPayment,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer years,

        @DecimalMin("0")
        @DecimalMax("30")
        BigDecimal closingCostRatePercent,

        @Min(1)
        @Max(1_000_000_000L)
        Long annualIncome) {

    public BudgetRequest {
        if (downPayment == null) {
            downPayment = 0L;
        }
        if (closingCostRatePercent == null) {
            closingCostRatePercent = BudgetCalculator.DEFAULT_CLOSING_COST_RATE_PERCENT;
        }
    }
}
