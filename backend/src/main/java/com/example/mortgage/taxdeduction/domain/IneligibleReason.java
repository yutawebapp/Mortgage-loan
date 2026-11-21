package com.example.mortgage.taxdeduction.domain;

/** Why the deduction does not apply. Returned as a code; never thrown. */
public enum IneligibleReason {
    /** No deduction rule row matches housing type / energy class / condition / move-in year. */
    NOT_ELIGIBLE_BY_RULE,
    /** Repayment period shorter than 10 years. */
    LOAN_TERM_UNDER_10Y,
    /** Estimated 合計所得金額 above 20,000,000 yen. */
    INCOME_OVER_20M,
    /** Floor area below 50 sqm while estimated 合計所得金額 above 10,000,000 yen. */
    AREA_40S_INCOME_OVER_LIMIT,
    AREA_UNDER_40,
    AREA_UNCONFIRMED
}
