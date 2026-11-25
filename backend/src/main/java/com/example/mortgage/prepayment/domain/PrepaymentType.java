package com.example.mortgage.prepayment.domain;

/** How a one-off prepayment changes the loan. */
public enum PrepaymentType {
    /** Keep the regular payment; the loan ends earlier. */
    SHORTEN_TERM,
    /** Keep the remaining number of months; the regular payment becomes smaller. */
    REDUCE_PAYMENT
}
