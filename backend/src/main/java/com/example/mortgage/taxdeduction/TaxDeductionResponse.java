package com.example.mortgage.taxdeduction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/tax-deduction. All amounts are whole yen.
 * When eligible is false: years is empty and totals / assumptions are null. rule is null when no rule matched.
 *
 * @param eligible         whether the deduction applies under the pre-checks
 * @param ineligibleReason reason code when not eligible, else null
 * @param rule             applied deduction rule, or null
 * @param years            one entry per listed deduction year
 * @param totals           totals over the listed years, or null
 * @param assumptions      estimate assumptions, or null
 */
public record TaxDeductionResponse(
        boolean eligible,
        String ineligibleReason,
        Rule rule,
        List<Year> years,
        Totals totals,
        Assumptions assumptions) {

    /**
     * @param limitAmount      applied borrowing limit (after childcare choice)
     * @param deductionYears   控除期間
     * @param ratePercent      控除率 (percent)
     * @param childcareApplied whether the 子育て上乗せ limit was applied
     * @param conditionCode    STANDARD or EXEMPTION
     * @param sourceUrl        source of the rule
     * @param verifiedOn       date the rule was verified
     */
    public record Rule(
            long limitAmount,
            int deductionYears,
            BigDecimal ratePercent,
            boolean childcareApplied,
            String conditionCode,
            String sourceUrl,
            LocalDate verifiedOn) {
    }

    /**
     * @param year                 calendar year (12/31 reference)
     * @param ordinal              1-based deduction year
     * @param annualPayment        repayments made in this calendar year
     * @param yearEndBalance       balance at 12/31
     * @param deductionBase        min(yearEndBalance, limit)
     * @param deductionCap         控除枠 (floored to 100 yen)
     * @param incomeTaxBefore      所得税 before credit (incl. reconstruction tax), floored to 100 yen
     * @param incomeTaxAfter       所得税 after this year's credit, floored to 100 yen
     * @param residentTaxEstimate  住民税 所得割 estimate
     * @param incomeTaxCredit      控除 against 所得税
     * @param residentTaxCredit    控除 against 住民税 (from the remainder)
     * @param totalDeduction       incomeTaxCredit + residentTaxCredit
     * @param unclaimed            控除しきれない額
     */
    public record Year(
            int year,
            int ordinal,
            long annualPayment,
            long yearEndBalance,
            long deductionBase,
            long deductionCap,
            long incomeTaxBefore,
            long incomeTaxAfter,
            long residentTaxEstimate,
            long incomeTaxCredit,
            long residentTaxCredit,
            long totalDeduction,
            long unclaimed) {
    }

    /**
     * @param totalDeduction total deduction over listed years
     * @param totalUnclaimed total unclaimed over listed years
     * @param totalPayment   repayments over listed years
     * @param netCost        totalPayment - totalDeduction
     * @param listedYears    number of listed years
     */
    public record Totals(
            long totalDeduction,
            long totalUnclaimed,
            long totalPayment,
            long netCost,
            int listedYears) {
    }

    /**
     * @param annualIncome               額面年収 (input)
     * @param socialInsuranceRatePercent 社会保険料率 (input or default)
     * @param estimatedTotalIncome       合計所得金額 estimate (salary income)
     * @param estimatedIncomeTaxBase     所得税 before credit (excl. reconstruction tax)
     * @param residentCapPerYear         住民税側の控除上限 per year
     * @param taxParameterVerifiedOn     verification date of the tax parameters
     * @param taxParameterSources        source URLs of the tax parameters
     * @param notes                      assumption codes
     */
    public record Assumptions(
            long annualIncome,
            BigDecimal socialInsuranceRatePercent,
            long estimatedTotalIncome,
            long estimatedIncomeTaxBase,
            long residentCapPerYear,
            LocalDate taxParameterVerifiedOn,
            List<String> taxParameterSources,
            List<String> notes) {
    }
}
