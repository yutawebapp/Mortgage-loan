package com.example.mortgage.ratetype;

import com.example.mortgage.ratetype.RateTypeResponse.Case;
import com.example.mortgage.ratetype.domain.RateTypeCalculator;
import com.example.mortgage.ratetype.domain.RateTypeComparison;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/** Maps rate-type API requests to the pure domain calculator and back. */
@Service
public class RateTypeService {

    private static final List<RateTypeNote> NOTES = List.of(
            RateTypeNote.RATES_ARE_USER_ASSUMPTIONS,
            RateTypeNote.SIMPLIFIED_RATE_CHANGE_MODEL,
            RateTypeNote.FEES_AND_GUARANTEE_NOT_INCLUDED);

    public RateTypeResponse simulate(RateTypeRequest request) {
        RateTypeComparison result = RateTypeCalculator.compare(
                BigDecimal.valueOf(request.principal()),
                request.years(),
                request.method(),
                request.variableRatePercent(),
                request.variableRiseAfterYears(),
                request.variableRisePoints(),
                request.fixedPeriodYears(),
                request.fixedPeriodRatePercent(),
                request.fixedPeriodAfterRatePercent(),
                request.fullFixedRatePercent());

        return new RateTypeResponse(
                result.cases().stream().map(RateTypeService::toResponse).toList(),
                NOTES);
    }

    private static Case toResponse(RateTypeComparison.Case c) {
        return new Case(
                c.type(),
                c.rateFirstPercent(),
                c.rateAfterPercent(),
                c.switchAfterYears(),
                c.firstMonthlyPayment().longValueExact(),
                nullableLong(c.monthlyPaymentBeforeSwitch()),
                nullableLong(c.monthlyPaymentAfterSwitch()),
                c.totalPayment().longValueExact(),
                c.totalInterest().longValueExact(),
                c.totalPaymentDiffFromFullFixed().longValueExact(),
                c.yearlyPayments().stream().map(BigDecimal::longValueExact).toList());
    }

    private static Long nullableLong(BigDecimal value) {
        return value == null ? null : value.longValueExact();
    }
}
