package com.example.mortgage.refinance;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/refinance.
 * Do not log instances of this class (contains user inputs).
 *
 * @param remainingBalance          current outstanding balance in yen, 1..1,000,000,000
 * @param currentAnnualRatePercent  current loan annual rate in percent, 0..20
 * @param remainingYears            remaining term of the current loan in years, 1..50
 * @param newAnnualRatePercent      refinanced loan annual rate in percent, 0..20
 * @param newYears                  refinanced loan term in years, 1..50
 * @param method                    EQUAL_PAYMENT or EQUAL_PRINCIPAL (applies to both loans)
 * @param refinanceCosts            up-front costs in yen, 0..100,000,000 (null means 0)
 */
public record RefinanceRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long remainingBalance,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal currentAnnualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer remainingYears,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal newAnnualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer newYears,

        @NotNull
        RepaymentMethod method,

        @Min(0)
        @Max(100_000_000L)
        Long refinanceCosts) {

    public RefinanceRequest {
        if (refinanceCosts == null) {
            refinanceCosts = 0L;
        }
    }
}
