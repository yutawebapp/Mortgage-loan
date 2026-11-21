package com.example.mortgage.lifeplan;

import org.apache.ibatis.annotations.Mapper;

import java.util.List;

/** SQL lives in mapper/LifePlanMapper.xml. Rows of the latest fiscal year only. */
@Mapper
public interface LifePlanMapper {

    /** Education cost rows (school type x child age 3..17) of the latest fiscal year. */
    List<EducationCostRow> findEducationCosts();

    /** University tuition rows (NATIONAL / PRIVATE) of the latest fiscal year. */
    List<UniversityCostRow> findUniversityCosts();
}
