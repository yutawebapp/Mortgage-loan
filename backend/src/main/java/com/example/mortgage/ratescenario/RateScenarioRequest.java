package com.example.mortgage.ratescenario;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Request body of POST /api/v1/simulations/rate-scenarios.
 * Do not log instances of this class (contains user inputs).
 *
 * @param principal         loan amount in yen, 1..1,000,000,000
 * @param annualRatePercent starting annual rate in percent, 0..20
 * @param years             loan term in years, 2..50
 * @param method            EQUAL_PAYMENT or EQUAL_PRINCIPAL
 * @param riseAfterYears    the rate rises after this many years, 1..years-1
 * @param risePoints        rate steps in percentage points, 1..5 entries, each 0 < x <= 10,
 *                          start rate + x <= 20 (null means [0.5, 1.0, 2.0])
 */
public record RateScenarioRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long principal,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(2)
        @Max(50)
        Integer years,

        @NotNull
        RepaymentMethod method,

        @NotNull
        @Min(1)
        Integer riseAfterYears,

        @Size(min = 1, max = 5)
        List<@NotNull @DecimalMin(value = "0", inclusive = false) @DecimalMax("10") BigDecimal> risePoints) {

    public static final List<BigDecimal> DEFAULT_RISE_POINTS = List.of(
            new BigDecimal("0.5"), new BigDecimal("1.0"), new BigDecimal("2.0"));

    public RateScenarioRequest {
        if (risePoints == null) {
            risePoints = DEFAULT_RISE_POINTS;
        }
    }

    /** riseAfterYears must be before the end of the loan (at least one year remains after the rise). */
    @AssertTrue(message = "must be less than years")
    public boolean isRiseAfterYearsWithinTerm() {
        return riseAfterYears == null || years == null || riseAfterYears < years;
    }

    /** The starting rate plus every rise step must not exceed 20%. */
    @AssertTrue(message = "annualRatePercent plus each risePoints value must be less than or equal to 20")
    public boolean isRatesAfterRiseWithinLimit() {
        if (annualRatePercent == null || risePoints == null) {
            return true;
        }
        BigDecimal limit = BigDecimal.valueOf(20);
        return risePoints.stream()
                .filter(Objects::nonNull)
                .allMatch(rise -> annualRatePercent.add(rise).compareTo(limit) <= 0);
    }
}
