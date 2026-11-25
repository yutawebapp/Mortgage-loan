package com.example.mortgage.taxdeduction.domain;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * One row of the deduction rule table (loaded from DB). Integer (boxed) fields because MyBatis record
 * constructor mapping resolves boxed types only.
 *
 * @param limitAmount           借入限度額 (yen)
 * @param limitAmountChildcare  借入限度額 with 子育て世帯等の上乗せ (yen)
 * @param deductionYears        控除期間 (years)
 * @param ratePercent           控除率 (percent, 0.7 means 0.7%)
 */
public record DeductionRule(
        HousingType housingType,
        EnergyClass energyClass,
        ConditionCode conditionCode,
        Integer moveInYearFrom,
        Integer moveInYearTo,
        BigDecimal limitAmount,
        BigDecimal limitAmountChildcare,
        Integer deductionYears,
        BigDecimal ratePercent,
        String sourceUrl,
        LocalDate verifiedOn) {
}
