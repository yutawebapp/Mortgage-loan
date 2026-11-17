package com.example.mortgage.prepayment;

import com.example.mortgage.prepayment.domain.PrepaymentType;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Request body of POST /api/v1/simulations/prepayment.
 * Do not log instances of this class (contains user inputs).
 *
 * @param principal            loan amount in yen, 1..1,000,000,000
 * @param annualRatePercent    annual rate in percent (1.2 means 1.2%), 0..20
 * @param years                loan term in years, 1..50
 * @param method               EQUAL_PAYMENT or EQUAL_PRINCIPAL (no bonus support)
 * @param prepaymentAfterMonth prepayment is made right after this month's payment, 1..years*12-1
 * @param prepaymentAmount     prepayment in yen, >= 1 (capped at the remaining balance = full payoff)
 * @param prepaymentType       SHORTEN_TERM or REDUCE_PAYMENT
 */
public record PrepaymentRequest(
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

        @NotNull
        @Min(1)
        Integer prepaymentAfterMonth,

        @NotNull
        @Min(1)
        Long prepaymentAmount,

        @NotNull
        PrepaymentType prepaymentType) {

    /** The prepayment month must be before the final month of the loan. */
    @AssertTrue(message = "must be less than years * 12")
    public boolean isPrepaymentAfterMonthWithinTerm() {
        return years == null || prepaymentAfterMonth == null || prepaymentAfterMonth < years * 12;
    }
}
