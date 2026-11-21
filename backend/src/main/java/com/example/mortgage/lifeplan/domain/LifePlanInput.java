package com.example.mortgage.lifeplan.domain;

import com.example.mortgage.simulation.domain.RepaymentMethod;

import java.math.BigDecimal;
import java.util.List;

/**
 * Pure input of the life-plan calculator. All money is whole yen in today's value.
 *
 * @param currentAge                 age now (year index 0)
 * @param retireAge                  age at which earned income and working living costs stop
 * @param pensionStartAge            age from which retirementAnnualIncome is received
 * @param lifeEndAge                 last age in the projection (inclusive)
 * @param annualTakeHomeIncome       take-home income per year before retirement (today's yen)
 * @param incomeGrowthPercent        yearly growth of annualTakeHomeIncome, percent (before retirement)
 * @param retirementAnnualIncome     pension and other income per year from pensionStartAge
 * @param monthlyLivingCost          working-age living cost per month (excludes housing and education)
 * @param retirementMonthlyLivingCost living cost per month from retireAge
 * @param savings                    savings now
 * @param savingsReturnPercent       yearly return on a positive opening balance, percent
 * @param upfrontPayment             one-off payment in year 0 (down payment, closing costs, etc.)
 * @param loanPrincipal              housing loan amount (0 = no loan)
 * @param annualRatePercent          loan rate, percent (used only when loanPrincipal &gt; 0)
 * @param years                      loan term in years (used only when loanPrincipal &gt; 0)
 * @param method                     loan repayment method
 * @param monthlyHousingCost         housing costs other than the loan, per month (management, repair reserve)
 * @param annualHousingTax           housing costs per year (fixed asset tax, insurance)
 * @param children                   children (may be empty)
 */
public record LifePlanInput(
        int currentAge,
        int retireAge,
        int pensionStartAge,
        int lifeEndAge,
        BigDecimal annualTakeHomeIncome,
        BigDecimal incomeGrowthPercent,
        BigDecimal retirementAnnualIncome,
        BigDecimal monthlyLivingCost,
        BigDecimal retirementMonthlyLivingCost,
        BigDecimal savings,
        BigDecimal savingsReturnPercent,
        BigDecimal upfrontPayment,
        BigDecimal loanPrincipal,
        BigDecimal annualRatePercent,
        int years,
        RepaymentMethod method,
        BigDecimal monthlyHousingCost,
        BigDecimal annualHousingTax,
        List<Child> children) {

    /**
     * One child. {@code age} is the current age (0..21); the child's age in year j is age + j.
     *
     * @param schoolPlan school route for ages 3..17
     * @param university university route for ages 18..21 (NONE = no university costs)
     */
    public record Child(int age, SchoolPlan schoolPlan, UniversityChoice university) {
    }
}
