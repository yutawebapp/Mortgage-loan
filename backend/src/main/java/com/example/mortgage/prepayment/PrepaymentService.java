package com.example.mortgage.prepayment;

import com.example.mortgage.prepayment.domain.PrepaymentCalculator;
import com.example.mortgage.prepayment.domain.PrepaymentResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps prepayment API requests to the pure domain calculator and back. */
@Service
public class PrepaymentService {

    public PrepaymentResponse simulate(PrepaymentRequest request) {
        PrepaymentResult result = PrepaymentCalculator.simulate(
                BigDecimal.valueOf(request.principal()),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                request.prepaymentAfterMonth(),
                BigDecimal.valueOf(request.prepaymentAmount()),
                request.prepaymentType());

        PrepaymentResult.Baseline b = result.baseline();
        PrepaymentResult.AfterPrepayment a = result.afterPrepayment();
        return new PrepaymentResponse(
                result.appliedPrepayment().longValueExact(),
                new PrepaymentResponse.Baseline(
                        b.months(),
                        b.monthlyPayment().longValueExact(),
                        b.totalPayment().longValueExact(),
                        b.totalInterest().longValueExact()),
                new PrepaymentResponse.AfterPrepayment(
                        a.months(),
                        a.monthlyPaymentBefore().longValueExact(),
                        a.monthlyPaymentAfter().longValueExact(),
                        a.totalPayment().longValueExact(),
                        a.totalInterest().longValueExact()),
                result.interestSaving().longValueExact(),
                result.monthsShortened(),
                result.schedule().stream()
                        .map(row -> new PrepaymentResponse.Row(
                                row.month(),
                                row.payment().longValueExact(),
                                row.principal().longValueExact(),
                                row.interest().longValueExact(),
                                row.prepayment().longValueExact(),
                                row.balance().longValueExact()))
                        .toList());
    }
}
