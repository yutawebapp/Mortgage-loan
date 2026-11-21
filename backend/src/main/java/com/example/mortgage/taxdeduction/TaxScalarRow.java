package com.example.mortgage.taxdeduction;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One tax_scalar_parameters row for a tax year (DB row, mapped by TaxDeductionMapper.xml). */
public record TaxScalarRow(
        String paramKey,
        BigDecimal paramValue,
        String sourceUrl,
        LocalDate verifiedOn) {
}
