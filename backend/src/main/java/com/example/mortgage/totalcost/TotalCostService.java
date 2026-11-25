package com.example.mortgage.totalcost;

import com.example.mortgage.totalcost.domain.TotalCostCalculator;
import com.example.mortgage.totalcost.domain.TotalCostResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/** Maps total-cost API requests to the pure domain calculator and back. */
@Service
public class TotalCostService {

    public TotalCostResponse simulate(TotalCostRequest request) {
        TotalCostResult r = TotalCostCalculator.calculate(
                BigDecimal.valueOf(request.propertyPrice()),
                BigDecimal.valueOf(request.downPayment()),
                request.closingCostRatePercent(),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                BigDecimal.valueOf(request.monthlyManagementFee()),
                BigDecimal.valueOf(request.monthlyRepairReserve()),
                BigDecimal.valueOf(request.annualPropertyTax()),
                BigDecimal.valueOf(request.annualInsurance()));

        return new TotalCostResponse(
                new TotalCostResponse.Initial(
                        r.downPayment().longValueExact(),
                        r.closingCost().longValueExact(),
                        r.initialCost().longValueExact()),
                r.loanPrincipal().longValueExact(),
                new TotalCostResponse.Totals(
                        r.totalLoanPayment().longValueExact(),
                        r.totalInterest().longValueExact(),
                        r.totalOwnershipCost().longValueExact(),
                        r.grandTotal().longValueExact(),
                        r.monthlyAverage().longValueExact(),
                        r.firstMonthLoanPayment().longValueExact()),
                r.years().stream()
                        .map(y -> new TotalCostResponse.Year(
                                y.year(),
                                y.loanPayment().longValueExact(),
                                y.interestPaid().longValueExact(),
                                y.principalPaid().longValueExact(),
                                y.yearEndBalance().longValueExact(),
                                y.ownershipCost().longValueExact(),
                                y.yearTotal().longValueExact(),
                                y.cumulativeOutlay().longValueExact()))
                        .toList(),
                r.notes().stream().map(Enum::name).toList());
    }
}
