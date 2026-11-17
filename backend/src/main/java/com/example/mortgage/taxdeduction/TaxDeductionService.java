package com.example.mortgage.taxdeduction;

import com.example.mortgage.taxdeduction.domain.ConditionCode;
import com.example.mortgage.taxdeduction.domain.DeductionRule;
import com.example.mortgage.taxdeduction.domain.TaxDeductionCalculator;
import com.example.mortgage.taxdeduction.domain.TaxDeductionInput;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.AppliedRule;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.Assumptions;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.Totals;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.YearRow;
import com.example.mortgage.taxdeduction.domain.TaxParameters;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/** Loads rules and tax parameters from the DB, runs the pure domain calculator, maps to the response. */
@Service
public class TaxDeductionService {

    private final TaxDeductionMapper taxDeductionMapper;
    private final TaxParameterLoader taxParameterLoader;

    public TaxDeductionService(TaxDeductionMapper taxDeductionMapper, TaxParameterLoader taxParameterLoader) {
        this.taxDeductionMapper = taxDeductionMapper;
        this.taxParameterLoader = taxParameterLoader;
    }

    public TaxDeductionResponse estimate(TaxDeductionRequest request) {
        ConditionCode conditionCode = request.legacyException() ? ConditionCode.EXEMPTION : ConditionCode.STANDARD;
        DeductionRule rule = taxDeductionMapper.findDeductionRule(
                request.housingType(), request.energyClass(), conditionCode, request.moveInYear());
        TaxParameters params = taxParameterLoader.load(request.moveInYear());

        TaxDeductionInput input = new TaxDeductionInput(
                BigDecimal.valueOf(request.principal()),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                BigDecimal.valueOf(request.annualIncome()),
                request.socialInsuranceRatePercent(),
                request.moveInYear(),
                request.moveInMonth(),
                request.childcareHousehold(),
                request.floorAreaOver50());

        return toResponse(TaxDeductionCalculator.calculate(input, rule, params));
    }

    private static TaxDeductionResponse toResponse(TaxDeductionResult result) {
        TaxDeductionResponse.Rule rule = result.rule() == null ? null : toRule(result.rule());
        if (!result.eligible()) {
            return new TaxDeductionResponse(false, result.ineligibleReason().name(), rule, List.of(), null, null);
        }
        return new TaxDeductionResponse(
                true,
                null,
                rule,
                result.years().stream().map(TaxDeductionService::toYear).toList(),
                toTotals(result.totals()),
                toAssumptions(result.assumptions()));
    }

    private static TaxDeductionResponse.Rule toRule(AppliedRule r) {
        return new TaxDeductionResponse.Rule(
                r.limitAmount().longValueExact(),
                r.deductionYears(),
                r.ratePercent(),
                r.childcareApplied(),
                r.conditionCode().name(),
                r.sourceUrl(),
                r.verifiedOn());
    }

    private static TaxDeductionResponse.Year toYear(YearRow y) {
        return new TaxDeductionResponse.Year(
                y.year(),
                y.ordinal(),
                y.annualPayment().longValueExact(),
                y.yearEndBalance().longValueExact(),
                y.deductionBase().longValueExact(),
                y.deductionCap().longValueExact(),
                y.incomeTaxBefore().longValueExact(),
                y.incomeTaxAfter().longValueExact(),
                y.residentTaxEstimate().longValueExact(),
                y.incomeTaxCredit().longValueExact(),
                y.residentTaxCredit().longValueExact(),
                y.totalDeduction().longValueExact(),
                y.unclaimed().longValueExact());
    }

    private static TaxDeductionResponse.Totals toTotals(Totals t) {
        return new TaxDeductionResponse.Totals(
                t.totalDeduction().longValueExact(),
                t.totalUnclaimed().longValueExact(),
                t.totalPayment().longValueExact(),
                t.netCost().longValueExact(),
                t.listedYears());
    }

    private static TaxDeductionResponse.Assumptions toAssumptions(Assumptions a) {
        return new TaxDeductionResponse.Assumptions(
                a.annualIncome().longValueExact(),
                a.socialInsuranceRatePercent(),
                a.estimatedTotalIncome().longValueExact(),
                a.estimatedIncomeTaxBase().longValueExact(),
                a.residentCapPerYear().longValueExact(),
                a.taxParameterVerifiedOn(),
                a.taxParameterSources(),
                a.notes());
    }
}
