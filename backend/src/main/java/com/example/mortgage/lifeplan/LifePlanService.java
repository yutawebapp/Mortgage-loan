package com.example.mortgage.lifeplan;

import com.example.mortgage.lifeplan.domain.LifePlanCalculator;
import com.example.mortgage.lifeplan.domain.LifePlanInput;
import com.example.mortgage.lifeplan.domain.LifePlanParameters;
import com.example.mortgage.lifeplan.domain.LifePlanResult;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/** Maps life-plan API requests to the pure domain calculator and back. */
@Service
public class LifePlanService {

    private final LifePlanParameterLoader parameterLoader;

    public LifePlanService(LifePlanParameterLoader parameterLoader) {
        this.parameterLoader = parameterLoader;
    }

    public LifePlanResponse simulate(LifePlanRequest request) {
        LifePlanParameters params = parameterLoader.load();
        LifePlanResult r = LifePlanCalculator.calculate(toInput(request), params);

        LifePlanResult.Summary s = r.summary();
        return new LifePlanResponse(
                r.years().stream()
                        .map(y -> new LifePlanResponse.Year(
                                y.age(),
                                y.income().longValueExact(),
                                y.livingCost().longValueExact(),
                                y.loanPayment().longValueExact(),
                                y.loanBalance().longValueExact(),
                                y.housingCost().longValueExact(),
                                y.educationCost().longValueExact(),
                                y.netCashFlow().longValueExact(),
                                y.savingsClosing().longValueExact()))
                        .toList(),
                new LifePlanResponse.Summary(
                        s.firstShortfallAge(),
                        s.minSavings().longValueExact(),
                        s.minSavingsAge(),
                        s.savingsAtRetirement().longValueExact(),
                        s.savingsAtEnd().longValueExact(),
                        s.loanPayoffAge(),
                        s.totalEducationCost().longValueExact(),
                        s.peakEducationCost().longValueExact(),
                        s.peakEducationAge(),
                        s.totalLoanPayment().longValueExact()),
                r.sources().stream()
                        .map(src -> new LifePlanResponse.Source(src.label(), src.url(), src.verifiedOn()))
                        .toList(),
                r.notes().stream().map(Enum::name).toList());
    }

    private static LifePlanInput toInput(LifePlanRequest q) {
        boolean loan = q.loanPrincipal() > 0;
        return new LifePlanInput(
                q.currentAge(),
                q.retireAge(),
                q.pensionStartAge(),
                q.lifeEndAge(),
                BigDecimal.valueOf(q.annualTakeHomeIncome()),
                q.incomeGrowthPercent(),
                BigDecimal.valueOf(q.retirementAnnualIncome()),
                BigDecimal.valueOf(q.monthlyLivingCost()),
                BigDecimal.valueOf(q.retirementMonthlyLivingCost()),
                BigDecimal.valueOf(q.savings()),
                q.savingsReturnPercent(),
                BigDecimal.valueOf(q.upfrontPayment()),
                BigDecimal.valueOf(q.loanPrincipal()),
                loan ? q.annualRatePercent() : BigDecimal.ZERO,
                loan ? q.years() : 0,
                q.method(),
                BigDecimal.valueOf(q.monthlyHousingCost()),
                BigDecimal.valueOf(q.annualHousingTax()),
                q.children().stream()
                        .map(c -> new LifePlanInput.Child(c.age(), c.schoolPlan(), c.university()))
                        .toList());
    }
}
