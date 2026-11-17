package com.example.mortgage.simulation;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/repayment.
 * Do not log instances of this class (contains user inputs).
 *
 * @param principal         loan amount in yen, 1..1,000,000,000
 * @param annualRatePercent annual rate in percent (1.2 means 1.2%), 0..20
 * @param years             loan term in years, 1..50
 * @param method            EQUAL_PAYMENT or EQUAL_PRINCIPAL
 * @param bonusAmount       yen repaid by bonus payments, 0..principal (null means 0)
 */
public record RepaymentRequest(
        @NotNull
        @Min(1)
        @Max(1_000_000_000L)
        Long principal,

        @NotNull
        @DecimalMin("0")
        @DecimalMax("20")
        BigDecimal annualRatePercent,

        @NotNull
        @Min(1)
        @Max(50)
        Integer years,

        @NotNull
        RepaymentMethod method,

        @Min(0)
        Long bonusAmount) {

    public RepaymentRequest {
        if (bonusAmount == null) {
            bonusAmount = 0L;
        }
    }

    /** Bonus repayment must not exceed the loan amount. */
    @AssertTrue(message = "must be less than or equal to principal")
    public boolean isBonusAmountWithinPrincipal() {
        return principal == null || bonusAmount == null || bonusAmount <= principal;
    }
}
