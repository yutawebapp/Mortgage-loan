package com.example.mortgage.lifeplan;

import java.time.LocalDate;

/** One education_costs row (DB row, mapped by LifePlanMapper.xml). */
public record EducationCostRow(
        Integer childAge,
        String schoolType,
        Long annualAmount,
        String sourceLabel,
        String sourceUrl,
        LocalDate verifiedOn) {
}
