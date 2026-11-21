package com.example.mortgage.product;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One historical rate row of a product. */
public record RateHistoryEntry(
        BigDecimal annualRatePercent,
        LocalDate effectiveFrom,
        String sourceUrl) {
}
