package com.example.mortgage.common;

/**
 * How the loan is taken by one or two people. Shared by the eligibility and tax-deduction features.
 *
 * <ul>
 *   <li>{@link #SINGLE}: one borrower.</li>
 *   <li>{@link #PAIR_LOAN}: ペアローン. Two separate loans, one per person.</li>
 *   <li>{@link #JOINT_DEBT}: 収入合算(連帯債務). One loan that both people owe.</li>
 *   <li>{@link #JOINT_GUARANTEE}: 収入合算(連帯保証). One loan owed by the main borrower only;
 *       the partner is a guarantor (counts toward screening income, is not a debtor).</li>
 * </ul>
 */
public enum BorrowerMode {
    SINGLE,
    PAIR_LOAN,
    JOINT_DEBT,
    JOINT_GUARANTEE;

    /** True when a partner's data is needed in the request. */
    public boolean hasPartner() {
        return this != SINGLE;
    }
}
