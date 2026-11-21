package com.example.mortgage.product;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ProductDetailResponse(
        Long id,
        String institutionName,
        String productName,
        RateType rateType,
        Integer fixedPeriodYears,
        BigDecimal annualRatePercent,
        LocalDate rateEffectiveFrom,
        String rateSourceUrl,
        List<ProductFee> fees,
        List<RateHistoryEntry> rateHistory) {
}
