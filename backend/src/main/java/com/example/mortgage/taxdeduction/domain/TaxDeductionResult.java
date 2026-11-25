package com.example.mortgage.taxdeduction.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Result of the tax deduction estimate. Money values are whole yen (scale 0).
 *
 * @param eligible          false when any pre-check failed (then years is empty, totals/assumptions null)
 * @param ineligibleReason  reason when not eligible, else null
 * @param rule              applied rule (null when no rule row matched)
 * @param years             one row per listed deduction year
 * @param totals            null when not eligible
 * @param assumptions       null when not eligible
 * @param taxEstimate       intermediate tax figures; null when the tax estimate was not computed
 */
public record TaxDeductionResult(
        boolean eligible,
        IneligibleReason ineligibleReason,
        AppliedRule rule,
        List<YearRow> years,
        Totals totals,
        Assumptions assumptions,
        TaxEstimate taxEstimate) {

    /**
     * @param limitAmount       applied borrowing limit (after childcare choice)
     * @param childcareApplied  whether the 子育て上乗せ limit was applied
     */
    public record AppliedRule(
            BigDecimal limitAmount,
            int deductionYears,
            BigDecimal ratePercent,
            boolean childcareApplied,
            ConditionCode conditionCode,
            String sourceUrl,
            LocalDate verifiedOn) {
    }

    /**
     * @param ordinal               1-based index of the deduction year
     * @param annualPayment         repayments made during calendar year {@code year}
     * @param yearEndBalance        balance at 12/31 of {@code year}
     * @param deductionBase         min(yearEndBalance, limit)
     * @param deductionCap          floor100(deductionBase * ratePercent / 100)
     * @param incomeTaxBefore       floor100(所得税 before credit, incl. reconstruction tax)
     * @param incomeTaxAfter        floor100(所得税 after this year's credit, incl. reconstruction tax)
     * @param residentTaxEstimate   estimated 個人住民税 所得割
     * @param incomeTaxCredit       credit against 所得税
     * @param residentTaxCredit     credit against 個人住民税 (from the unclaimed remainder)
     * @param totalDeduction        incomeTaxCredit + residentTaxCredit
     * @param unclaimed             deductionCap - totalDeduction
     */
    public record YearRow(
            int year,
            int ordinal,
            BigDecimal annualPayment,
            BigDecimal yearEndBalance,
            BigDecimal deductionBase,
            BigDecimal deductionCap,
            BigDecimal incomeTaxBefore,
            BigDecimal incomeTaxAfter,
            BigDecimal residentTaxEstimate,
            BigDecimal incomeTaxCredit,
            BigDecimal residentTaxCredit,
            BigDecimal totalDeduction,
            BigDecimal unclaimed) {
    }

    /**
     * @param totalDeduction  sum of totalDeduction over listed years
     * @param totalUnclaimed  sum of unclaimed over listed years
     * @param totalPayment    sum of annualPayment over listed years
     * @param netCost         totalPayment - totalDeduction
     * @param listedYears     number of listed deduction years
     */
    public record Totals(
            BigDecimal totalDeduction,
            BigDecimal totalUnclaimed,
            BigDecimal totalPayment,
            BigDecimal netCost,
            int listedYears) {
    }

    /**
     * @param estimatedTotalIncome  合計所得金額 estimate (= salary income here)
     * @param estimatedIncomeTaxBase 所得税 before credit (excl. reconstruction tax), same every year
     * @param residentCapPerYear    住民税側の控除上限 per year
     */
    public record Assumptions(
            BigDecimal annualIncome,
            BigDecimal socialInsuranceRatePercent,
            BigDecimal estimatedTotalIncome,
            BigDecimal estimatedIncomeTaxBase,
            BigDecimal residentCapPerYear,
            LocalDate taxParameterVerifiedOn,
            List<String> taxParameterSources,
            List<String> notes) {
    }

    /**
     * Intermediate tax figures (yen).
     *
     * @param salaryDeduction      給与所得控除
     * @param salaryIncome         給与所得 = annualIncome - salaryDeduction
     * @param socialInsurance      社会保険料 (floor(annualIncome * rate))
     * @param basicDeduction       所得税の基礎控除
     * @param taxableIncomeTax     所得税の課税総所得金額 (floored to 1,000)
     * @param incomeTaxBase        所得税 before reconstruction tax
     * @param taxableResident      住民税の課税所得 (floored to 1,000)
     * @param residentTax          住民税 所得割 after 調整控除
     * @param residentCreditCap    住民税側の控除上限
     */
    public record TaxEstimate(
            BigDecimal salaryDeduction,
            BigDecimal salaryIncome,
            BigDecimal socialInsurance,
            BigDecimal basicDeduction,
            BigDecimal taxableIncomeTax,
            BigDecimal incomeTaxBase,
            BigDecimal taxableResident,
            BigDecimal residentTax,
            BigDecimal residentCreditCap) {
    }
}
