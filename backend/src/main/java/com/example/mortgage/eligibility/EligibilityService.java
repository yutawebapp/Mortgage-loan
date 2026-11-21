package com.example.mortgage.eligibility;

import com.example.mortgage.eligibility.domain.EligibilityResult;
import com.example.mortgage.eligibility.domain.EligibilityResult.Estimate;
import com.example.mortgage.eligibility.domain.JointEligibilityCalculator;
import com.example.mortgage.eligibility.domain.JointEligibilityCalculator.Combined;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.IntStream;

/** Maps eligibility API requests to the pure domain calculator and back. */
@Service
public class EligibilityService {

    private static final List<String> ROLES = List.of("A", "B");

    public EligibilityResponse estimate(EligibilityRequest request) {
        // Partner fields are only read for non-SINGLE modes (validated as present there).
        boolean hasPartner = request.mode().hasPartner();
        Combined result = JointEligibilityCalculator.calculate(
                request.mode(),
                BigDecimal.valueOf(request.annualIncome()),
                BigDecimal.valueOf(request.otherAnnualRepayments()),
                hasPartner ? BigDecimal.valueOf(request.partnerAnnualIncome()) : BigDecimal.ZERO,
                BigDecimal.valueOf(request.partnerOtherAnnualRepayments()),
                request.partnerIncomeCountPercent(),
                request.screeningRatePercent(),
                request.annualRatePercent(),
                request.years());

        return new EligibilityResponse(
                result.mode(),
                result.burdenRatioLimitPercent(),
                result.maxAnnualRepayment().longValueExact(),
                result.availableAnnualRepayment().longValueExact(),
                result.availableMonthlyRepayment().longValueExact(),
                toResponse(result.atScreeningRate()),
                toResponse(result.atActualRate()),
                toPersons(result.persons()),
                result.notes().stream().map(Enum::name).toList());
    }

    private static List<EligibilityResponse.Person> toPersons(List<EligibilityResult> persons) {
        if (persons == null) {
            return null;
        }
        return IntStream.range(0, persons.size())
                .mapToObj(i -> {
                    EligibilityResult p = persons.get(i);
                    return new EligibilityResponse.Person(
                            ROLES.get(i),
                            p.burdenRatioLimitPercent(),
                            p.availableMonthlyRepayment().longValueExact(),
                            toResponse(p.atScreeningRate()),
                            toResponse(p.atActualRate()));
                })
                .toList();
    }

    private static EligibilityResponse.Estimate toResponse(Estimate e) {
        return new EligibilityResponse.Estimate(
                e.ratePercent(),
                e.maxPrincipal().longValueExact(),
                e.monthlyPayment().longValueExact());
    }
}
