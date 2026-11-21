package com.example.mortgage.ratescenario;

import com.example.mortgage.ratescenario.RateScenarioResponse.ScenarioResult;
import com.example.mortgage.ratescenario.domain.RateRiseComparison;
import com.example.mortgage.ratescenario.domain.RateRiseCalculator;
import com.example.mortgage.ratescenario.domain.RateRiseScenario;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps rate-scenario API requests to the pure domain calculator and back. */
@Service
public class RateScenarioService {

    public RateScenarioResponse simulate(RateScenarioRequest request) {
        RateRiseComparison result = RateRiseCalculator.compare(
                BigDecimal.valueOf(request.principal()),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                request.riseAfterYears(),
                request.risePoints());

        return new RateScenarioResponse(
                toResponse(result.baseline()),
                result.scenarios().stream().map(RateScenarioService::toResponse).toList());
    }

    private static ScenarioResult toResponse(RateRiseScenario s) {
        return new ScenarioResult(
                s.risePoints(),
                s.rateAfterPercent(),
                s.monthlyPaymentBefore().longValueExact(),
                s.monthlyPaymentAfter().longValueExact(),
                s.monthlyPaymentIncrease().longValueExact(),
                s.totalPayment().longValueExact(),
                s.totalInterest().longValueExact(),
                s.extraInterestVsBaseline().longValueExact(),
                s.monthlyPayments().stream().map(BigDecimal::longValueExact).toList());
    }
}
