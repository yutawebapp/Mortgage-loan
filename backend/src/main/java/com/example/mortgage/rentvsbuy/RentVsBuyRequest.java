package com.example.mortgage.rentvsbuy;

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
 * Request body of POST /api/v1/simulations/rent-vs-buy.
 * Do not log instances of this class (contains user inputs).
 * Every figure is a user assumption; no tax or legal figures are used. Defaults are neutral (zero).
 *
 * <p>Purchase side: propertyPrice, downPayment, closingCostRatePercent, annualRatePercent, years, method,
 * monthlyManagementFee, monthlyRepairReserve, annualPropertyTax, annualInsurance.
 * <p>Rent side: monthlyRent, rentGrowthPercent, renewalFeeMonths, renewalIntervalYears, rentInitialCost.
 * <p>Common: horizonYears, assetChangeRatePercent, saleCostRatePercent.
 */
public record RentVsBuyRequest(
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
        Long annualInsurance,

        @NotNull
        @Min(1)
        @Max(10_000_000L)
        Long monthlyRent,

        @DecimalMin("0")
        @DecimalMax("10")
        BigDecimal rentGrowthPercent,

        @DecimalMin("0")
        @DecimalMax("6")
        BigDecimal renewalFeeMonths,

        @Min(1)
        @Max(5)
        Integer renewalIntervalYears,

        @Min(0)
        @Max(100_000_000L)
        Long rentInitialCost,

        @NotNull
        @Min(1)
        @Max(50)
        Integer horizonYears,

        @DecimalMin("-10")
        @DecimalMax("10")
        BigDecimal assetChangeRatePercent,

        @DecimalMin("0")
        @DecimalMax("10")
        BigDecimal saleCostRatePercent) {

    public RentVsBuyRequest {
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
        if (rentGrowthPercent == null) {
            rentGrowthPercent = BigDecimal.ZERO;
        }
        if (renewalFeeMonths == null) {
            renewalFeeMonths = BigDecimal.ZERO;
        }
        if (renewalIntervalYears == null) {
            renewalIntervalYears = 2;
        }
        if (rentInitialCost == null) {
            rentInitialCost = 0L;
        }
        if (assetChangeRatePercent == null) {
            assetChangeRatePercent = BigDecimal.ZERO;
        }
        if (saleCostRatePercent == null) {
            saleCostRatePercent = BigDecimal.ZERO;
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
