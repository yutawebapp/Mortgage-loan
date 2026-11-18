package com.example.mortgage.ratetype;

/** Fixed explanatory notes returned with every rate-type comparison. */
public enum RateTypeNote {
    /** All rates are the user's assumptions, not forecasts. */
    RATES_ARE_USER_ASSUMPTIONS,
    /** Rate changes are a simplified single re-amortization; 5-year rule and 125% rule are not modelled. */
    SIMPLIFIED_RATE_CHANGE_MODEL,
    /** Guarantee fees, handling fees and the difference in団信 (group credit life) coverage are not included. */
    FEES_AND_GUARANTEE_NOT_INCLUDED
}
