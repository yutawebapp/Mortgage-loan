package com.example.mortgage.eligibility;

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
 * @param annualIncome          gross annual income in yen, 1..1,000,000,000
 * @param otherAnnualRepayments total annual repayments of existing loans in yen, 0..1,000,000,000 (null means 0)
 * @param annualRatePercent     rate of the planned loan in percent, 0..20
 * @param years                 repayment term in years, 1..50
 * @param screeningRatePercent  screening rate in percent, 0..20 (null means 3.5)
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
        BigDecimal screeningRatePercent) {

    /** Default screening rate (percent) when the request omits it. */
    public static final BigDecimal DEFAULT_SCREENING_RATE_PERCENT = new BigDecimal("3.5");

    public EligibilityRequest {
        if (otherAnnualRepayments == null) {
            otherAnnualRepayments = 0L;
        }
        if (screeningRatePercent == null) {
            screeningRatePercent = DEFAULT_SCREENING_RATE_PERCENT;
        }
    }
}
