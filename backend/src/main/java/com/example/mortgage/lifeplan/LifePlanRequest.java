package com.example.mortgage.lifeplan;

import com.example.mortgage.lifeplan.domain.SchoolPlan;
import com.example.mortgage.lifeplan.domain.UniversityChoice;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request body of POST /api/v1/simulations/life-plan. All money is whole yen in today's value.
 * Do not log instances of this class (contains user inputs).
 *
 * @param currentAge                  age now, 18..70 (required)
 * @param retireAge                   retirement age, 18..80, must be &gt; currentAge (null means 65)
 * @param pensionStartAge             age the pension starts, 50..80 (null means 65)
 * @param lifeEndAge                  last age of the projection, 18..100, must be &gt; retireAge (null means 95)
 * @param annualTakeHomeIncome        take-home income per year, 0..1,000,000,000 (required)
 * @param incomeGrowthPercent         yearly income growth before retirement, 0..5 (null means 0)
 * @param retirementAnnualIncome      pension and other income per year from pensionStartAge, 0..1,000,000,000 (null means 0)
 * @param monthlyLivingCost           living cost per month while working, 0..10,000,000 (required; excludes housing and education)
 * @param retirementMonthlyLivingCost living cost per month from retireAge, 0..10,000,000 (required)
 * @param savings                     savings now, 0..10,000,000,000 (required)
 * @param savingsReturnPercent        yearly return on a positive balance, 0..10 (null means 0)
 * @param upfrontPayment              one-off payment in the first year, 0..1,000,000,000 (null means 0)
 * @param loanPrincipal               housing loan amount, 0..1,000,000,000 (null or 0 means no loan)
 * @param annualRatePercent           loan rate, 0..20 (required when loanPrincipal &gt; 0)
 * @param years                       loan term, 1..50 (required when loanPrincipal &gt; 0)
 * @param method                      EQUAL_PAYMENT or EQUAL_PRINCIPAL (null means EQUAL_PAYMENT)
 * @param monthlyHousingCost          housing costs other than the loan per month, 0..10,000,000 (null means 0)
 * @param annualHousingTax            fixed asset tax, insurance etc. per year, 0..10,000,000 (null means 0)
 * @param children                    0..3 children (null means none)
 */
public record LifePlanRequest(
        @NotNull
        @Min(18)
        @Max(70)
        Integer currentAge,

        @Min(18)
        @Max(80)
        Integer retireAge,

        @Min(50)
        @Max(80)
        Integer pensionStartAge,

        @Min(18)
        @Max(100)
        Integer lifeEndAge,

        @NotNull
        @Min(0)
        @Max(1_000_000_000L)
        Long annualTakeHomeIncome,

        @DecimalMin("0")
        @DecimalMax("5")
        BigDecimal incomeGrowthPercent,

        @Min(0)
        @Max(1_000_000_000L)
        Long retirementAnnualIncome,

        @NotNull
        @Min(0)
        @Max(10_000_000L)
        Long monthlyLivingCost,

        @NotNull
        @Min(0)
        @Max(10_000_000L)
        Long retirementMonthlyLivingCost,

        @NotNull
        @Min(0)
        @Max(10_000_000_000L)
        Long savings,

        @DecimalMin("0")
        @DecimalMax("10")
        BigDecimal savingsReturnPercent,

        @Min(0)
        @Max(1_000_000_000L)
        Long upfrontPayment,

        @Min(0)
        @Max(1_000_000_000L)
        Long loanPrincipal,

        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @Min(1)
        @Max(50)
        Integer years,

        RepaymentMethod method,

        @Min(0)
        @Max(10_000_000L)
        Long monthlyHousingCost,

        @Min(0)
        @Max(10_000_000L)
        Long annualHousingTax,

        @Size(max = 3)
        List<@NotNull @Valid Child> children) {

    public LifePlanRequest {
        if (retireAge == null) {
            retireAge = 65;
        }
        if (pensionStartAge == null) {
            pensionStartAge = 65;
        }
        if (lifeEndAge == null) {
            lifeEndAge = 95;
        }
        if (incomeGrowthPercent == null) {
            incomeGrowthPercent = BigDecimal.ZERO;
        }
        if (retirementAnnualIncome == null) {
            retirementAnnualIncome = 0L;
        }
        if (savingsReturnPercent == null) {
            savingsReturnPercent = BigDecimal.ZERO;
        }
        if (upfrontPayment == null) {
            upfrontPayment = 0L;
        }
        if (loanPrincipal == null) {
            loanPrincipal = 0L;
        }
        if (method == null) {
            method = RepaymentMethod.EQUAL_PAYMENT;
        }
        if (monthlyHousingCost == null) {
            monthlyHousingCost = 0L;
        }
        if (annualHousingTax == null) {
            annualHousingTax = 0L;
        }
        if (children == null) {
            children = List.of();
        }
    }

    /** Loan rate and term are required when there is a loan. Skipped while loanPrincipal is invalid. */
    @AssertTrue(message = "annualRatePercent and years are required when loanPrincipal is greater than 0")
    public boolean isLoanFieldsPresent() {
        if (loanPrincipal == null || loanPrincipal <= 0) {
            return true;
        }
        return annualRatePercent != null && years != null;
    }

    /** retireAge must be greater than currentAge, and lifeEndAge greater than retireAge. */
    @AssertTrue(message = "retireAge must be greater than currentAge and lifeEndAge must be greater than retireAge")
    public boolean isAgeOrderValid() {
        if (currentAge == null || retireAge == null || lifeEndAge == null) {
            return true;
        }
        return currentAge < retireAge && retireAge < lifeEndAge;
    }

    /**
     * One child. age is the current age (0..21). A university route applies to ages 18..21; null means NONE.
     *
     * @param age         current age, 0..21
     * @param schoolPlan  school route (required)
     * @param university  NONE, NATIONAL or PRIVATE (null means NONE)
     */
    public record Child(
            @NotNull
            @Min(0)
            @Max(21)
            Integer age,

            @NotNull
            SchoolPlan schoolPlan,

            UniversityChoice university) {

        public Child {
            if (university == null) {
                university = UniversityChoice.NONE;
            }
        }
    }
}
