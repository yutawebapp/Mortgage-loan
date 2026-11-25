package com.example.mortgage.budget;

import com.example.mortgage.budget.domain.BudgetCalculator;
import com.example.mortgage.budget.domain.BudgetResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Maps budget API requests to the pure domain calculator and back. */
@Service
public class BudgetService {

    public BudgetResponse estimate(BudgetRequest request) {
        BudgetResult result = BudgetCalculator.calculate(
                BigDecimal.valueOf(request.downPayment()),
                BigDecimal.valueOf(request.desiredMonthlyPayment()),
                request.annualRatePercent(),
                request.years(),
                request.closingCostRatePercent(),
                request.annualIncome() == null ? null : BigDecimal.valueOf(request.annualIncome()));

        return new BudgetResponse(
                result.maxPropertyPrice().longValueExact(),
                result.maxLoanAmount().longValueExact(),
                result.downPayment().longValueExact(),
                result.totalBudget().longValueExact(),
                result.closingCosts().longValueExact(),
                result.closingCostRatePercent(),
                result.monthlyPayment().longValueExact(),
                result.loanExceedsPrice(),
                result.burdenRatioPercent());
    }
}
