package com.example.mortgage.product;

import java.math.BigDecimal;

/** A fee of a product. Exactly one of amount (yen) or ratePercent is expected to be set. */
public record ProductFee(
        String feeType,
        String label,
        BigDecimal amount,
        BigDecimal ratePercent) {
}
