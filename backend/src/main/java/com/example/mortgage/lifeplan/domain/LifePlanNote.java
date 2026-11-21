package com.example.mortgage.lifeplan.domain;

/** Modelling notes returned with every life-plan result. All of them are always included. */
public enum LifePlanNote {
    /** Every amount is in today's yen; no inflation, no change in prices or wages is modelled. */
    TODAYS_YEN_NO_INFLATION,
    /** Income, living costs, housing costs and savings are the user's own inputs. */
    INCOME_AND_COSTS_ARE_USER_INPUTS,
    /** Education costs are national averages (令和5年度), not an individual's actual costs. */
    EDUCATION_AVERAGES_NOT_INDIVIDUAL,
    /** University costs are tuition (and entrance fee in year 1) only; living and commuting costs are excluded. */
    UNIVERSITY_TUITION_ONLY,
    /** Each year is an even, simplified cash-flow year; no bonus, tax, or pension calculation. */
    SIMPLIFIED_EVEN_YEARLY_MODEL,
    /** Child ages are the age in the school year (see the response). */
    AGES_ARE_SCHOOL_YEAR_AGES,
    /** Pension / retirement income is a user-entered annual amount, not estimated. */
    PENSION_AMOUNT_IS_USER_INPUT
}
