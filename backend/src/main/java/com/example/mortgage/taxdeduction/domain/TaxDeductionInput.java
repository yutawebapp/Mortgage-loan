package com.example.mortgage.taxdeduction.domain;

import com.example.mortgage.simulation.domain.RepaymentMethod;

import java.math.BigDecimal;

/**
 * Domain input. Do not log instances (contains user inputs).
 *
 * @param principal                  借入額 (yen)
 * @param annualRatePercent          annual rate in percent
 * @param years                      repayment term in years
 * @param method                     repayment method (no bonus)
 * @param annualIncome               額面年収 (yen); treated as salary income for the estimate
 * @param socialInsuranceRatePercent 社会保険料率 (percent of annualIncome)
 * @param moveInYear                 入居年 (= 借入実行年)
 * @param moveInMonth                借入実行月 (1..12); first repayment is the following month
 * @param childcareHousehold         子育て世帯等 (上乗せ利用の希望)
 * @param floorAreaOver50            床面積50㎡以上
 */
public record TaxDeductionInput(
        BigDecimal principal,
        BigDecimal annualRatePercent,
        int years,
        RepaymentMethod method,
        BigDecimal annualIncome,
        BigDecimal socialInsuranceRatePercent,
        int moveInYear,
        int moveInMonth,
        boolean childcareHousehold,
        boolean floorAreaOver50) {
}
