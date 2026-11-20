package com.example.mortgage.lifeplan.domain;

import java.time.LocalDate;
import java.util.Map;

/**
 * Cost parameters loaded from the DB (education_costs / university_costs). No cost numbers live in code.
 *
 * @param education  annual school cost per school type, keyed by school-year age (3..17)
 * @param university tuition per university type (NATIONAL / PRIVATE)
 */
public record LifePlanParameters(
        Map<SchoolType, Map<Integer, EducationFee>> education,
        Map<UniversityChoice, UniversityFee> university) {

    /** One DB source row: label, URL and the date it was verified. */
    public record Source(String label, String url, LocalDate verifiedOn) {
    }

    /** Annual school cost for one (school type, age) row. */
    public record EducationFee(long annualAmount, Source source) {
    }

    /** Tuition for one university type: first year (age 18) and each later year (ages 19..21). */
    public record UniversityFee(long firstYearAmount, long laterYearAmount, Source source) {
    }
}
