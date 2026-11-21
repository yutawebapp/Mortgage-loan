package com.example.mortgage.rentvsbuy;

import com.example.mortgage.rentvsbuy.domain.RentVsBuyCalculator;
import com.example.mortgage.rentvsbuy.domain.RentVsBuyResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps rent-vs-buy API requests to the pure domain calculator and back. */
@Service
public class RentVsBuyService {

    public RentVsBuyResponse simulate(RentVsBuyRequest request) {
        RentVsBuyResult r = RentVsBuyCalculator.calculate(new RentVsBuyCalculator.Inputs(
                BigDecimal.valueOf(request.propertyPrice()),
                BigDecimal.valueOf(request.downPayment()),
                request.closingCostRatePercent(),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                BigDecimal.valueOf(request.monthlyManagementFee()),
                BigDecimal.valueOf(request.monthlyRepairReserve()),
                BigDecimal.valueOf(request.annualPropertyTax()),
                BigDecimal.valueOf(request.annualInsurance()),
                BigDecimal.valueOf(request.monthlyRent()),
                request.rentGrowthPercent(),
                request.renewalFeeMonths(),
                request.renewalIntervalYears(),
                BigDecimal.valueOf(request.rentInitialCost()),
                request.horizonYears(),
                request.assetChangeRatePercent(),
                request.saleCostRatePercent()));

        RentVsBuyResult.Summary s = r.summary();
        return new RentVsBuyResponse(
                r.loanPrincipal().longValueExact(),
                r.closingCost().longValueExact(),
                r.years().stream()
                        .map(y -> new RentVsBuyResponse.Year(
                                y.year(),
                                y.purchaseYearOutlay().longValueExact(),
                                y.purchaseCumulative().longValueExact(),
                                y.loanBalance().longValueExact(),
                                y.assetValue().longValueExact(),
                                y.purchaseNetCost().longValueExact(),
                                y.rentYearOutlay().longValueExact(),
                                y.rentCumulative().longValueExact()))
                        .toList(),
                new RentVsBuyResponse.Summary(
                        s.crossoverYearCumulative(),
                        s.crossoverYearNet(),
                        s.purchaseCumulativeAtEnd().longValueExact(),
                        s.purchaseNetAtEnd().longValueExact(),
                        s.rentCumulativeAtEnd().longValueExact()),
                r.sensitivity().stream()
                        .map(x -> new RentVsBuyResponse.Sensitivity(
                                plain(x.assetChangeRatePercent()),
                                x.crossoverYearNet(),
                                x.purchaseNetAtEnd().longValueExact()))
                        .toList(),
                r.notes().stream().map(Enum::name).toList());
    }

    /** Avoids exponent notation (e.g. "1E+1") in the JSON output for rate values. */
    private static BigDecimal plain(BigDecimal value) {
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }
}
