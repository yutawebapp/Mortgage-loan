package com.example.mortgage.taxdeduction.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Tax parameters for one tax year (loaded from DB; see TaxParameterLoader).
 *
 * <p>Bracket lists are ordered ascending by upperLimit. A bracket applies to value v when
 * upperLimit == null or v <= upperLimit, and yields v * ratePercent / 100 + amount.
 * BASIC_DEDUCTION has no bracket above 23,500,000 (lookup returns null there; the calculator treats it as 0).
 *
 * @param salaryDeduction             給与所得控除 brackets
 * @param basicDeduction              所得税の基礎控除 brackets (keyed by 合計所得金額)
 * @param incomeTax                   所得税 速算表 brackets (keyed by 課税総所得金額, floored to 1,000 yen)
 * @param reconstructionRatePercent   復興特別所得税 rate (display only)
 * @param residentTaxRatePercent      個人住民税 所得割 rate
 * @param residentBasicDeduction      個人住民税 基礎控除
 * @param residentAdjustmentDeduction 調整控除 (fixed assumption)
 * @param residentCreditRatePercent   住宅ローン控除の住民税側上限の率 (×所得税の課税総所得金額)
 * @param residentCreditCap           住宅ローン控除の住民税側上限の最高額
 * @param verifiedOn                  earliest verified_on among the loaded rows
 * @param sourceUrls                  distinct source URLs of the loaded rows
 */
public record TaxParameters(
        List<Bracket> salaryDeduction,
        List<Bracket> basicDeduction,
        List<Bracket> incomeTax,
        BigDecimal reconstructionRatePercent,
        BigDecimal residentTaxRatePercent,
        BigDecimal residentBasicDeduction,
        BigDecimal residentAdjustmentDeduction,
        BigDecimal residentCreditRatePercent,
        BigDecimal residentCreditCap,
        BigDecimal incomeLimit,
        BigDecimal area40sIncomeLimit,
        LocalDate verifiedOn,
        List<String> sourceUrls) {

    /** @param upperLimit inclusive upper bound, null = unbounded */
    public record Bracket(BigDecimal upperLimit, BigDecimal ratePercent, BigDecimal amount) {
    }
}
