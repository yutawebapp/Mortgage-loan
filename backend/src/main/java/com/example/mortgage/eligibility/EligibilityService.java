package com.example.mortgage.eligibility;

import com.example.mortgage.eligibility.domain.EligibilityCalculator;
import com.example.mortgage.eligibility.domain.EligibilityResult;
import com.example.mortgage.eligibility.domain.EligibilityResult.Estimate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps eligibility API requests to the pure domain calculator and back. */
@Service
public class EligibilityService {

    public EligibilityResponse estimate(EligibilityRequest request) {
        EligibilityResult result = EligibilityCalculator.calculate(
                BigDecimal.valueOf(request.annualIncome()),
                BigDecimal.valueOf(request.otherAnnualRepayments()),
                request.screeningRatePercent(),
                request.annualRatePercent(),
                request.years());

        return new EligibilityResponse(
                result.burdenRatioLimitPercent(),
                result.maxAnnualRepayment().longValueExact(),
                result.availableAnnualRepayment().longValueExact(),
                result.availableMonthlyRepayment().longValueExact(),
                toResponse(result.atScreeningRate()),
                toResponse(result.atActualRate()));
    }

    private static EligibilityResponse.Estimate toResponse(Estimate e) {
        return new EligibilityResponse.Estimate(
                e.ratePercent(),
                e.maxPrincipal().longValueExact(),
                e.monthlyPayment().longValueExact());
    }
}
