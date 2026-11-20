package com.example.mortgage.lifeplan.domain;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of the life-plan projection. Money is BigDecimal with scale 0 (whole yen, today's value).
 *
 * @param years   one row per age from currentAge to lifeEndAge (inclusive)
 * @param summary summary figures
 * @param sources DB source rows whose costs were actually charged in the projection
 * @param notes   modelling notes (always all of {@link LifePlanNote})
 */
public record LifePlanResult(
        List<YearRow> years,
        Summary summary,
        List<LifePlanParameters.Source> sources,
        List<LifePlanNote> notes) {

    /**
     * One year of the cash-flow projection.
     *
     * @param age           age in this year
     * @param income        earned income (before retireAge) + retirement income (from pensionStartAge)
     * @param livingCost    12 x monthly living cost
     * @param loanPayment   loan payments in this year
     * @param loanBalance   loan balance at the end of this year
     * @param housingCost   12 x monthlyHousingCost + annualHousingTax
     * @param educationCost school + university costs of all children in this year
     * @param netCashFlow   income - livingCost - loanPayment - housingCost - educationCost - upfront
     * @param savingsClosing savings at the end of this year
     */
    public record YearRow(
            int age,
            BigDecimal income,
            BigDecimal livingCost,
            BigDecimal loanPayment,
            BigDecimal loanBalance,
            BigDecimal housingCost,
            BigDecimal educationCost,
            BigDecimal netCashFlow,
            BigDecimal savingsClosing) {
    }

    /**
     * @param firstShortfallAge    first age whose closing savings are below 0, or null
     * @param minSavings           lowest closing savings over the projection
     * @param minSavingsAge        age of the first occurrence of minSavings
     * @param savingsAtRetirement  closing savings at age retireAge - 1
     * @param savingsAtEnd         closing savings at lifeEndAge
     * @param loanPayoffAge        currentAge + years when there is a loan and that age is <= lifeEndAge, else null
     * @param totalEducationCost   sum of educationCost over the projection
     * @param peakEducationCost    largest educationCost in one year (0 when none)
     * @param peakEducationAge     age of the first year with peakEducationCost, null when there is no education cost
     * @param totalLoanPayment     sum of loanPayment over the projection
     */
    public record Summary(
            Integer firstShortfallAge,
            BigDecimal minSavings,
            Integer minSavingsAge,
            BigDecimal savingsAtRetirement,
            BigDecimal savingsAtEnd,
            Integer loanPayoffAge,
            BigDecimal totalEducationCost,
            BigDecimal peakEducationCost,
            Integer peakEducationAge,
            BigDecimal totalLoanPayment) {
    }
}
