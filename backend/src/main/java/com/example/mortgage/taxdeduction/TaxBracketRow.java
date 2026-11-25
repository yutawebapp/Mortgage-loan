package com.example.mortgage.taxdeduction;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One tax_brackets row for a tax year (DB row, mapped by TaxDeductionMapper.xml). */
public record TaxBracketRow(
        String tableCode,
        BigDecimal upperLimit,
        BigDecimal ratePercent,
        BigDecimal amount,
        String sourceUrl,
        LocalDate verifiedOn) {
}
