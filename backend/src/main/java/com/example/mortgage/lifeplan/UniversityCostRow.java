package com.example.mortgage.lifeplan;

import java.time.LocalDate;

/** One university_costs row (DB row, mapped by LifePlanMapper.xml). */
public record UniversityCostRow(
        String universityType,
        Long firstYearAmount,
        Long laterYearAmount,
        String sourceLabel,
        String sourceUrl,
        LocalDate verifiedOn) {
}
