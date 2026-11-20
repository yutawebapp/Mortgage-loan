package com.example.mortgage.lifeplan.domain;

/**
 * School route per child (school_type per stage). Ages are school-year ages: 3 = 幼稚園3歳, 6 = 小1,
 * 12 = 中1, 15 = 高1, 17 = 高3.
 */
public enum SchoolPlan {
    /** All stages public (公立). */
    ALL_PUBLIC,
    /** High school (ages 15..17) private, earlier stages public. */
    PRIVATE_HIGH,
    /** Junior high and high school (ages 12..17) private, kindergarten and elementary public. */
    PRIVATE_JUNIOR_AND_HIGH,
    /** All stages private (ages 3..17). */
    ALL_PRIVATE;

    /** School type used for a school-year age in 3..17. */
    public SchoolType schoolTypeAt(int age) {
        return switch (this) {
            case ALL_PUBLIC -> SchoolType.PUBLIC;
            case PRIVATE_HIGH -> age >= 15 ? SchoolType.PRIVATE : SchoolType.PUBLIC;
            case PRIVATE_JUNIOR_AND_HIGH -> age >= 12 ? SchoolType.PRIVATE : SchoolType.PUBLIC;
            case ALL_PRIVATE -> SchoolType.PRIVATE;
        };
    }
}
