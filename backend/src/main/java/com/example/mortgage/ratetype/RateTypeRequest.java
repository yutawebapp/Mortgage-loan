package com.example.mortgage.ratetype;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/rate-types.
 * Do not log instances of this class (contains user inputs).
 * Every rate is a user-entered assumption; no market data or forecast is used.
 *
 * @param principal                   loan amount in yen, 1..1,000,000,000
 * @param years                       loan term in years, 2..50
 * @param method                      EQUAL_PAYMENT or EQUAL_PRINCIPAL (no bonus)
 * @param variableRatePercent         variable rate in percent, 0..20
 * @param variableRiseAfterYears      the variable rate rises after this many years, 1..years-1
 * @param variableRisePoints          rise in percentage points, >0..10, variableRatePercent + this <= 20
 * @param fixedPeriodYears            fixed period in years, 1..years-1
 * @param fixedPeriodRatePercent      rate during the fixed period in percent, 0..20
 * @param fixedPeriodAfterRatePercent rate after the fixed period in percent, 0..20 (may be lower or higher)
 * @param fullFixedRatePercent        full-term fixed rate in percent, 0..20
 */
public record RateTypeRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long principal,

        @NotNull
        @Min(2)
        @Max(50)
        Integer years,

        @NotNull
        RepaymentMethod method,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal variableRatePercent,

        @NotNull
        @Min(1)
        Integer variableRiseAfterYears,

        @NotNull
        @DecimalMin(value = "0", inclusive = false)
        @DecimalMax("10")
        BigDecimal variableRisePoints,

        @NotNull
        @Min(1)
        Integer fixedPeriodYears,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal fixedPeriodRatePercent,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal fixedPeriodAfterRatePercent,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal fullFixedRatePercent) {

    /** The variable rise must happen before the end of the loan (at least one year remains after it). */
    @AssertTrue(message = "must be less than years")
    public boolean isVariableRiseAfterYearsWithinTerm() {
        return variableRiseAfterYears == null || years == null || variableRiseAfterYears < years;
    }

    /** The fixed period must end before the end of the loan (at least one year remains after it). */
    @AssertTrue(message = "must be less than years")
    public boolean isFixedPeriodYearsWithinTerm() {
        return fixedPeriodYears == null || years == null || fixedPeriodYears < years;
    }

    /** The variable rate after the rise must not exceed 20%. */
    @AssertTrue(message = "variableRatePercent plus variableRisePoints must be less than or equal to 20")
    public boolean isVariableRateAfterRiseWithinLimit() {
        if (variableRatePercent == null || variableRisePoints == null) {
            return true;
        }
        return variableRatePercent.add(variableRisePoints).compareTo(BigDecimal.valueOf(20)) <= 0;
    }
}
