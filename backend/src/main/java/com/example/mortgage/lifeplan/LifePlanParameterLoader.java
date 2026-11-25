package com.example.mortgage.lifeplan;

import com.example.mortgage.lifeplan.domain.LifePlanCalculator;
import com.example.mortgage.lifeplan.domain.LifePlanParameters;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.EducationFee;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.Source;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.UniversityFee;
import com.example.mortgage.lifeplan.domain.SchoolType;
import com.example.mortgage.lifeplan.domain.UniversityChoice;
import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.Map;

/** Loads the education and university cost parameters from the DB and converts them to the domain record. */
@Component
public class LifePlanParameterLoader {

    private final LifePlanMapper mapper;

    public LifePlanParameterLoader(LifePlanMapper mapper) {
        this.mapper = mapper;
    }

    /**
     * @throws IllegalStateException when the DB has no complete cost table
     */
    public LifePlanParameters load() {
        Map<SchoolType, Map<Integer, EducationFee>> education = new EnumMap<>(SchoolType.class);
        for (EducationCostRow r : mapper.findEducationCosts()) {
            Source source = new Source(r.sourceLabel(), r.sourceUrl(), r.verifiedOn());
            education.computeIfAbsent(SchoolType.valueOf(r.schoolType()), t -> new HashMap<>())
                    .put(r.childAge(), new EducationFee(r.annualAmount(), source));
        }

        Map<UniversityChoice, UniversityFee> university = new EnumMap<>(UniversityChoice.class);
        for (UniversityCostRow r : mapper.findUniversityCosts()) {
            Source source = new Source(r.sourceLabel(), r.sourceUrl(), r.verifiedOn());
            university.put(UniversityChoice.valueOf(r.universityType()),
                    new UniversityFee(r.firstYearAmount(), r.laterYearAmount(), source));
        }

        requireComplete(education, university);
        return new LifePlanParameters(education, university);
    }

    private static void requireComplete(Map<SchoolType, Map<Integer, EducationFee>> education,
                                        Map<UniversityChoice, UniversityFee> university) {
        for (SchoolType type : SchoolType.values()) {
            Map<Integer, EducationFee> byAge = education.get(type);
            for (int age = LifePlanCalculator.FIRST_SCHOOL_AGE; age <= LifePlanCalculator.LAST_SCHOOL_AGE; age++) {
                if (byAge == null || !byAge.containsKey(age)) {
                    throw new IllegalStateException("education cost missing for " + type + " age " + age);
                }
            }
        }
        for (UniversityChoice choice : new UniversityChoice[] {UniversityChoice.NATIONAL, UniversityChoice.PRIVATE}) {
            if (!university.containsKey(choice)) {
                throw new IllegalStateException("university cost missing for " + choice);
            }
        }
    }
}
