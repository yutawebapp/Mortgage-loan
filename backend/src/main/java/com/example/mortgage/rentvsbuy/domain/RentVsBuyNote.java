package com.example.mortgage.rentvsbuy.domain;

/** Modelling notes returned with every rent-vs-buy result (what the figures do NOT say). */
public enum RentVsBuyNote {
    /** The property's future value is a user assumption, not a forecast. */
    ASSET_VALUE_IS_ASSUMPTION,
    /** Money not spent on purchase is not assumed to be invested (no return on the difference). */
    NO_INVESTMENT_RETURN_ON_DIFFERENCE,
    /** Housing loan tax deduction (住宅ローン控除) is not included. */
    TAX_DEDUCTION_NOT_INCLUDED,
    /** Rent and purchase are assumed to be comparable homes; this is not guaranteed. */
    SAME_HOME_CONDITIONS_NOT_ASSURED,
    /** Ownership costs (management, repairs, tax, insurance) continue after the loan term. */
    OWNERSHIP_COSTS_CONTINUE_AFTER_LOAN,
    /** Closing costs are paid out of the same total budget as the price (same as /budget). */
    CLOSING_COSTS_FINANCED_FROM_BUDGET
}
