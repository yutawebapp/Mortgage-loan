package com.example.mortgage.simulation;

import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps API requests to the pure domain calculator and back. */
@Service
public class SimulationService {

    public RepaymentResponse simulateRepayment(RepaymentRequest request) {
        RepaymentResult result = RepaymentCalculator.calculate(
                BigDecimal.valueOf(request.principal()),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                BigDecimal.valueOf(request.bonusAmount()));

        return new RepaymentResponse(
                result.monthlyPayment().longValueExact(),
                result.bonusPayment().longValueExact(),
                result.totalPayment().longValueExact(),
                result.totalInterest().longValueExact(),
                result.schedule().stream()
                        .map(row -> new RepaymentResponse.Row(
                                row.month(),
                                row.payment().longValueExact(),
                                row.bonusPayment().longValueExact(),
                                row.principal().longValueExact(),
                                row.interest().longValueExact(),
                                row.balance().longValueExact()))
                        .toList());
    }
}
