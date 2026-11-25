package com.example.mortgage.totalcost.domain;

/** Modelling notes returned with every total-cost result (what is NOT included in the figures). */
public enum TotalCostNote {
    /** Ownership costs are entered as constant yen amounts per year (no inflation or tax change). */
    OWNERSHIP_COST_CONSTANT,
    /** Resale value / land value of the property is not modelled. */
    NO_RESALE_VALUE,
    /** Ownership costs after the loan term (years) are not included. */
    COSTS_AFTER_LOAN_TERM_EXCLUDED,
    /** Housing loan tax deduction (住宅ローン控除) is not included. */
    TAX_DEDUCTION_NOT_INCLUDED,
    /**
     * Closing costs are paid out of the same total budget as the property price (downPayment + loan =
     * propertyPrice + closingCost), so they are NOT added to the cash outlay again. Same assumption as /budget.
     */
    CLOSING_COSTS_FINANCED_FROM_BUDGET
}
