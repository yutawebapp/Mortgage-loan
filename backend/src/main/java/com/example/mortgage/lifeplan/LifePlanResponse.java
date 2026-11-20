package com.example.mortgage.lifeplan;

import java.time.LocalDate;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/life-plan. Amounts are whole yen in today's value (no inflation).
 * These are 目安 (estimates) of household cash flow; they are not a judgement of the plan.
 *
 * @param years   one row per age from currentAge to lifeEndAge (inclusive)
 * @param summary summary figures (see field docs)
 * @param sources DB source rows whose costs were used (education and/or university)
 * @param notes   modelling notes (codes); all are always returned
 */
public record LifePlanResponse(
        List<Year> years,
        Summary summary,
        List<Source> sources,
        List<String> notes) {

    /**
     * @param age            age in this year (school-year age for children's costs)
     * @param income         earned income + retirement income
     * @param livingCost     living cost for the year
     * @param loanPayment    loan payments in the year
     * @param loanBalance    loan balance at the end of the year
     * @param housingCost    housing costs other than the loan
     * @param educationCost  school + university costs of all children
     * @param netCashFlow    income - living - loan - housing - education - upfront (year 1 only)
     * @param savingsClosing savings at the end of the year
     */
    public record Year(
            int age,
            long income,
            long livingCost,
            long loanPayment,
            long loanBalance,
            long housingCost,
            long educationCost,
            long netCashFlow,
            long savingsClosing) {
    }

    /**
     * @param firstShortfallAge   first age with savings below 0, null if never
     * @param minSavings          lowest savings at the end of a year
     * @param minSavingsAge       age of the first occurrence of minSavings
     * @param savingsAtRetirement savings at the end of the year before retireAge
     * @param savingsAtEnd        savings at the end of lifeEndAge
     * @param loanPayoffAge       currentAge + loan years, null without a loan
     * @param totalEducationCost  education costs summed over the projection
     * @param peakEducationCost   largest education cost in one year (0 if none)
     * @param peakEducationAge    age of that year, null if there is no education cost
     * @param totalLoanPayment    loan payments summed over the projection
     */
    public record Summary(
            Integer firstShortfallAge,
            long minSavings,
            Integer minSavingsAge,
            long savingsAtRetirement,
            long savingsAtEnd,
            Integer loanPayoffAge,
            long totalEducationCost,
            long peakEducationCost,
            Integer peakEducationAge,
            long totalLoanPayment) {
    }

    /** One DB source row used for education or university costs. verifiedOn = date the DB row was checked. */
    public record Source(String label, String url, LocalDate verifiedOn) {
    }
}
