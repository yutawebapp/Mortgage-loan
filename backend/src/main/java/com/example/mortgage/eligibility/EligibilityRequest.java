package com.example.mortgage.eligibility;

import com.example.mortgage.common.BorrowerMode;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/eligibility.
 * Do not log instances of this class (contains user inputs).
 *
 * @param annualIncome                 gross annual income in yen, 1..1,000,000,000 (borrower A)
 * @param otherAnnualRepayments        total annual repayments of existing loans in yen, 0..1,000,000,000 (A; null means 0)
 * @param annualRatePercent            rate of the planned loan in percent, 0..20
 * @param years                        repayment term in years, 1..50
 * @param screeningRatePercent         screening rate in percent, 0..20 (null means 3.5)
 * @param mode                         SINGLE / PAIR_LOAN / JOINT_DEBT / JOINT_GUARANTEE (null means SINGLE)
 * @param partnerAnnualIncome          borrower B's gross annual income in yen, 1..1,000,000,000;
 *                                     required when mode is not SINGLE, ignored for SINGLE
 * @param partnerOtherAnnualRepayments B's existing annual loan repayments in yen, 0..1,000,000,000 (null means 0)
 * @param partnerIncomeCountPercent    share of B's income counted for JOINT_GUARANTEE, 0..100 (null means 50).
 *                                     Provisional assumption: lenders differ.
 */
public record EligibilityRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long annualIncome,

        @Min(0)
        @Max(1_000_000_000L)
        Long otherAnnualRepayments,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer years,

        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal screeningRatePercent,

        BorrowerMode mode,

        @Min(1)
        @Max(1_000_000_000L)
        Long partnerAnnualIncome,

        @Min(0)
        @Max(1_000_000_000L)
        Long partnerOtherAnnualRepayments,

        @Min(0)
        @Max(100)
        Integer partnerIncomeCountPercent) {

    /** Default screening rate (percent) when the request omits it. */
    public static final BigDecimal DEFAULT_SCREENING_RATE_PERCENT = new BigDecimal("3.5");
    /** Default share (percent) of the partner's income counted for JOINT_GUARANTEE. Provisional. */
    public static final int DEFAULT_PARTNER_INCOME_COUNT_PERCENT = 50;

    public EligibilityRequest {
        if (otherAnnualRepayments == null) {
            otherAnnualRepayments = 0L;
        }
        if (screeningRatePercent == null) {
            screeningRatePercent = DEFAULT_SCREENING_RATE_PERCENT;
        }
        if (mode == null) {
            mode = BorrowerMode.SINGLE;
        }
        if (partnerOtherAnnualRepayments == null) {
            partnerOtherAnnualRepayments = 0L;
        }
        if (partnerIncomeCountPercent == null) {
            partnerIncomeCountPercent = DEFAULT_PARTNER_INCOME_COUNT_PERCENT;
        }
    }

    /** The partner's income is required for every mode except SINGLE. */
    @AssertTrue(message = "partnerAnnualIncome is required unless mode is SINGLE")
    public boolean isPartnerIncomeProvidedWhenNeeded() {
        return mode == BorrowerMode.SINGLE || partnerAnnualIncome != null;
    }
}
