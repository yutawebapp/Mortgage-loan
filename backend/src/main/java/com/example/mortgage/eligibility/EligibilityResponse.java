package com.example.mortgage.eligibility;

import com.example.mortgage.common.BorrowerMode;

import java.math.BigDecimal;
import java.util.List;

/**
 * Response body of POST /api/v1/simulations/eligibility. All amounts are whole yen.
 *
 * @param mode                      borrower mode of the request (echo)
 * @param burdenRatioLimitPercent   30 or 35; null for PAIR_LOAN (each person has their own, see persons)
 * @param maxAnnualRepayment        annual income x limit (before subtracting other loans); summed for PAIR_LOAN
 * @param availableAnnualRepayment  max(0, maxAnnualRepayment - other annual repayments); summed for PAIR_LOAN
 * @param availableMonthlyRepayment availableAnnualRepayment / 12, rounded down; summed for PAIR_LOAN
 * @param atScreeningRate           estimate at the screening rate; summed for PAIR_LOAN
 * @param atActualRate              estimate at the planned loan rate; summed for PAIR_LOAN
 * @param persons                   the two separate estimates (role A, B); non-null only for PAIR_LOAN
 * @param notes                     assumption codes: INCOME_COMBINED_PROVISIONAL, PARTNER_INCOME_RATIO_ASSUMED,
 *                                  EACH_PERSON_SCREENED_SEPARATELY; empty for SINGLE
 */
public record EligibilityResponse(
        BorrowerMode mode,
        Integer burdenRatioLimitPercent,
        long maxAnnualRepayment,
        long availableAnnualRepayment,
        long availableMonthlyRepayment,
        Estimate atScreeningRate,
        Estimate atActualRate,
        List<Person> persons,
        List<String> notes) {

    /**
     * @param ratePercent    annual rate in percent
     * @param maxPrincipal   borrowable principal (multiple of 10,000 yen)
     * @param monthlyPayment monthly payment of a loan of maxPrincipal at ratePercent
     */
    public record Estimate(BigDecimal ratePercent, long maxPrincipal, long monthlyPayment) {
    }

    /**
     * One borrower's own estimate in PAIR_LOAN.
     *
     * @param role                      "A" (main applicant) or "B" (partner)
     * @param burdenRatioLimitPercent   30 or 35, from this person's own income
     * @param availableMonthlyRepayment this person's available monthly repayment
     * @param atScreeningRate           this person's estimate at the screening rate
     * @param atActualRate             this person's estimate at the planned loan rate
     */
    public record Person(
            String role,
            int burdenRatioLimitPercent,
            long availableMonthlyRepayment,
            Estimate atScreeningRate,
            Estimate atActualRate) {
    }
}
