package com.example.mortgage.refinance;

import com.example.mortgage.refinance.domain.RefinanceComparator;
import com.example.mortgage.refinance.domain.RefinanceComparison;
import com.example.mortgage.refinance.domain.RefinanceComparison.LoanSummary;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps refinance API requests to the pure domain comparator and back. */
@Service
public class RefinanceService {

    public RefinanceResponse diagnose(RefinanceRequest request) {
        RefinanceComparison result = RefinanceComparator.compare(
                BigDecimal.valueOf(request.remainingBalance()),
                request.currentAnnualRatePercent(),
                request.remainingYears(),
                request.newAnnualRatePercent(),
                request.newYears(),
                request.method(),
                BigDecimal.valueOf(request.refinanceCosts()));

        return new RefinanceResponse(
                toResponse(result.current()),
                toResponse(result.refinanced()),
                result.refinanceCosts().longValueExact(),
                result.monthlySaving().longValueExact(),
                result.totalSaving().longValueExact(),
                result.breakEvenMonth(),
                result.cumulativeSaving().stream()
                        .map(s -> new RefinanceResponse.CumulativeSaving(s.month(), s.net().longValueExact()))
                        .toList());
    }

    private static RefinanceResponse.LoanSummary toResponse(LoanSummary s) {
        return new RefinanceResponse.LoanSummary(
                s.monthlyPayment().longValueExact(),
                s.totalPayment().longValueExact(),
                s.totalInterest().longValueExact());
    }
}
