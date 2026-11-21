package com.example.mortgage.totalcost;

import com.example.mortgage.budget.domain.BudgetCalculator;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.totalcost.domain.TotalCostCalculator;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/total-cost.
 * Do not log instances of this class (contains user inputs).
 * Every cost is a user input; no tax or legal figures are used.
 *
 * @param propertyPrice          property price in yen, 1..1,000,000,000
 * @param downPayment            down payment in yen, 0..1,000,000,000 (null means 0)
 * @param closingCostRatePercent closing costs as percent of property price, 0..30 (null means 10.0)
 * @param annualRatePercent      annual rate in percent, 0..20
 * @param years                  repayment term in years, 1..50
 * @param method                 EQUAL_PAYMENT or EQUAL_PRINCIPAL
 * @param monthlyManagementFee   management fee per month in yen, 0..1,000,000 (null means 0)
 * @param monthlyRepairReserve   repair reserve per month in yen, 0..1,000,000 (null means 0)
 * @param annualPropertyTax      fixed asset tax + city planning tax per year in yen, 0..10,000,000 (null means 0)
 * @param annualInsurance        fire / earthquake insurance per year in yen (annualized), 0..10,000,000 (null means 0)
 */
public record TotalCostRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long propertyPrice,

        @Min(0)
        @Max(1_000_000_000L)
        Long downPayment,

        @DecimalMin("0")
        @DecimalMax("30")
        BigDecimal closingCostRatePercent,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer years,

        @NotNull
        RepaymentMethod method,

        @Min(0)
        @Max(1_000_000L)
        Long monthlyManagementFee,

        @Min(0)
        @Max(1_000_000L)
        Long monthlyRepairReserve,

        @Min(0)
        @Max(10_000_000L)
        Long annualPropertyTax,

        @Min(0)
        @Max(10_000_000L)
        Long annualInsurance) {

    public TotalCostRequest {
        if (downPayment == null) {
            downPayment = 0L;
        }
        if (closingCostRatePercent == null) {
            closingCostRatePercent = BudgetCalculator.DEFAULT_CLOSING_COST_RATE_PERCENT;
        }
        if (monthlyManagementFee == null) {
            monthlyManagementFee = 0L;
        }
        if (monthlyRepairReserve == null) {
            monthlyRepairReserve = 0L;
        }
        if (annualPropertyTax == null) {
            annualPropertyTax = 0L;
        }
        if (annualInsurance == null) {
            annualInsurance = 0L;
        }
    }

    /**
     * The down payment must leave a positive loan: propertyPrice + closingCost - downPayment &gt; 0.
     * Skipped (true) while a field it depends on is missing or invalid; those fields report their own errors.
     */
    @AssertTrue(message = "must be less than propertyPrice + closing costs")
    public boolean isLoanPrincipalPositive() {
        if (propertyPrice == null || downPayment == null || closingCostRatePercent == null) {
            return true;
        }
        BigDecimal price = BigDecimal.valueOf(propertyPrice);
        BigDecimal closing = TotalCostCalculator.closingCost(price, closingCostRatePercent);
        return TotalCostCalculator.loanPrincipal(price, BigDecimal.valueOf(downPayment), closing).signum() > 0;
    }
}
