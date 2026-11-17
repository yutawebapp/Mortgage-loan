package com.example.mortgage.product;

import java.math.BigDecimal;
import java.time.LocalDate;

/** A product with its current rate. Used for list items and as the head of the detail response. */
public record ProductSummary(
        Long id,
        String institutionName,
        String productName,
        RateType rateType,
        Integer fixedPeriodYears,
        BigDecimal annualRatePercent,
        LocalDate rateEffectiveFrom,
        String rateSourceUrl) {
}
