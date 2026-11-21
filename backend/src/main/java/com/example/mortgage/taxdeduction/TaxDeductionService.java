package com.example.mortgage.taxdeduction;

import com.example.mortgage.common.BorrowerMode;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;

/**
 * Loads rules and tax parameters from the DB, runs the pure domain calculator, maps to the response.
 *
 * <p>Two-person modes (PAIR_LOAN / JOINT_DEBT): the loan is split by shareAPercent (principal A = HALF_UP),
 * and the same calculator is run once per person with that person's income, social-insurance rate and
 * childcare flag. Household figures are sums over the eligible persons.
 */
@Service
public class TaxDeductionService {

    /** 国税庁 質疑応答事例: 連帯債務の負担割合と控除対象借入金 (per-person deductible loan = share of principal). */
    static final String SOURCE_QA_JOINT_DEBT_SHARE = "https://www.nta.go.jp/law/shitsugi/shotoku/06/36.htm";
    /** 国税庁 タックスアンサー No.1213: 床面積要件は建物全体で判定 (not multiplied by the share). */
    static final String SOURCE_TAXANSWER_1213 = "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1213.htm";

    static final String NOTE_SHARE_EQUALS_OWNERSHIP = "PAIR_OR_JOINT_SHARE_EQUALS_OWNERSHIP";
    static final String NOTE_LIMIT_APPLIED_PER_PERSON = "LIMIT_APPLIED_PER_PERSON";
    static final String NOTE_PARTNER_NOT_DEBTOR_NO_DEDUCTION = "PARTNER_NOT_DEBTOR_NO_DEDUCTION";
    static final String NOTE_HOUSEHOLD_FLAGS_PER_PERSON = "HOUSEHOLD_FLAGS_PER_PERSON";

    private static final String ROLE_A = "A";
    private static final String ROLE_B = "B";

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

        if (request.isSplitLoan()) {
            return estimateSplit(request, rule, params);
        }

        // SINGLE, and JOINT_GUARANTEE (the guarantor is not a debtor, so only the main borrower claims).
        TaxDeductionResult result = TaxDeductionCalculator.calculate(
                personInput(request, request.principal(), request.annualIncome(),
                        request.socialInsuranceRatePercent(), request.childcareHousehold()),
                rule, params);
        TaxDeductionResponse base = toResponse(result, request.mode(), null);
        if (request.mode() != BorrowerMode.JOINT_GUARANTEE || base.assumptions() == null) {
            return base;
        }
        return withExtraNotes(base, List.of(NOTE_PARTNER_NOT_DEBTOR_NO_DEDUCTION));
    }

    private static TaxDeductionResponse estimateSplit(TaxDeductionRequest request, DeductionRule rule,
                                                      TaxParameters params) {
        long principalA = TaxDeductionRequest.principalOfA(request.principal(), request.shareAPercent());
        long principalB = request.principal() - principalA;

        TaxDeductionResult resA = TaxDeductionCalculator.calculate(
                personInput(request, principalA, request.annualIncome(),
                        request.socialInsuranceRatePercent(), request.childcareHousehold()),
                rule, params);
        TaxDeductionResult resB = TaxDeductionCalculator.calculate(
                personInput(request, principalB, request.partnerAnnualIncome(),
                        request.partnerSocialInsuranceRatePercent(), request.partnerChildcareHousehold()),
                rule, params);

        TaxDeductionResponse.Person personA = toPerson(ROLE_A, principalA, resA);
        TaxDeductionResponse.Person personB = toPerson(ROLE_B, principalB, resB);

        boolean eligible = resA.eligible() || resB.eligible();
        List<TaxDeductionResponse.Year> years = eligible
                ? mergeYears(List.of(personA.years(), personB.years()))
                : List.of();
        TaxDeductionResponse.Totals totals = eligible ? totalsOf(years) : null;

        // Assumptions: person A's (its income, rate, estimate); falls back to B's when A is not estimated.
        TaxDeductionResult basis = resA.assumptions() != null ? resA : resB;
        TaxDeductionResponse.Assumptions assumptions = null;
        if (basis.assumptions() != null) {
            assumptions = toAssumptions(basis.assumptions());
            Set<String> notes = new LinkedHashSet<>();
            addNotes(notes, resA.assumptions());
            addNotes(notes, resB.assumptions());
            notes.add(NOTE_SHARE_EQUALS_OWNERSHIP);
            notes.add(NOTE_LIMIT_APPLIED_PER_PERSON);
            notes.add(NOTE_HOUSEHOLD_FLAGS_PER_PERSON);
            Set<String> sources = new LinkedHashSet<>(assumptions.taxParameterSources());
            sources.add(SOURCE_QA_JOINT_DEBT_SHARE);
            sources.add(SOURCE_TAXANSWER_1213);
            assumptions = new TaxDeductionResponse.Assumptions(
                    assumptions.annualIncome(),
                    assumptions.socialInsuranceRatePercent(),
                    assumptions.estimatedTotalIncome(),
                    assumptions.estimatedIncomeTaxBase(),
                    assumptions.residentCapPerYear(),
                    assumptions.taxParameterVerifiedOn(),
                    List.copyOf(sources),
                    List.copyOf(notes));
        }

        return new TaxDeductionResponse(
                eligible,
                eligible ? null : resA.ineligibleReason().name(),
                resA.rule() == null ? null : toRule(resA.rule()),
                years,
                totals,
                assumptions,
                request.mode(),
                List.of(personA, personB));
    }

    private static TaxDeductionInput personInput(TaxDeductionRequest request, long principal, long annualIncome,
                                                 BigDecimal socialInsuranceRatePercent, boolean childcare) {
        return new TaxDeductionInput(
                BigDecimal.valueOf(principal),
                request.annualRatePercent(),
                request.years(),
                request.method(),
                BigDecimal.valueOf(annualIncome),
                socialInsuranceRatePercent,
                request.moveInYear(),
                request.moveInMonth(),
                childcare,
                request.floorAreaOver50());
    }

    private static TaxDeductionResponse toResponse(TaxDeductionResult result, BorrowerMode mode,
                                                   List<TaxDeductionResponse.Person> persons) {
        TaxDeductionResponse.Rule rule = result.rule() == null ? null : toRule(result.rule());
        if (!result.eligible()) {
            return new TaxDeductionResponse(false, result.ineligibleReason().name(), rule, List.of(), null, null,
                    mode, persons);
        }
        return new TaxDeductionResponse(
                true,
                null,
                rule,
                result.years().stream().map(TaxDeductionService::toYear).toList(),
                toTotals(result.totals()),
                toAssumptions(result.assumptions()),
                mode,
                persons);
    }

    private static TaxDeductionResponse.Person toPerson(String role, long principal, TaxDeductionResult result) {
        Long limit = result.rule() == null ? null : result.rule().limitAmount().longValueExact();
        if (!result.eligible()) {
            return new TaxDeductionResponse.Person(role, principal, limit, false,
                    result.ineligibleReason().name(), List.of(), null);
        }
        return new TaxDeductionResponse.Person(role, principal, limit, true, null,
                result.years().stream().map(TaxDeductionService::toYear).toList(),
                toTotals(result.totals()));
    }

    /** Per calendar year sum of the given persons' rows (every amount summed; year and ordinal kept). */
    private static List<TaxDeductionResponse.Year> mergeYears(List<List<TaxDeductionResponse.Year>> perPerson) {
        TreeMap<Integer, TaxDeductionResponse.Year> merged = new TreeMap<>();
        for (List<TaxDeductionResponse.Year> rows : perPerson) {
            for (TaxDeductionResponse.Year y : rows) {
                merged.merge(y.year(), y, TaxDeductionService::addYear);
            }
        }
        return List.copyOf(merged.values());
    }

    private static TaxDeductionResponse.Year addYear(TaxDeductionResponse.Year a, TaxDeductionResponse.Year b) {
        return new TaxDeductionResponse.Year(
                a.year(),
                a.ordinal(),
                a.annualPayment() + b.annualPayment(),
                a.yearEndBalance() + b.yearEndBalance(),
                a.deductionBase() + b.deductionBase(),
                a.deductionCap() + b.deductionCap(),
                a.incomeTaxBefore() + b.incomeTaxBefore(),
                a.incomeTaxAfter() + b.incomeTaxAfter(),
                a.residentTaxEstimate() + b.residentTaxEstimate(),
                a.incomeTaxCredit() + b.incomeTaxCredit(),
                a.residentTaxCredit() + b.residentTaxCredit(),
                a.totalDeduction() + b.totalDeduction(),
                a.unclaimed() + b.unclaimed());
    }

    private static TaxDeductionResponse.Totals totalsOf(List<TaxDeductionResponse.Year> years) {
        long deduction = 0;
        long unclaimed = 0;
        long payment = 0;
        for (TaxDeductionResponse.Year y : years) {
            deduction += y.totalDeduction();
            unclaimed += y.unclaimed();
            payment += y.annualPayment();
        }
        return new TaxDeductionResponse.Totals(deduction, unclaimed, payment, payment - deduction, years.size());
    }

    private static void addNotes(Set<String> notes, Assumptions a) {
        if (a != null) {
            notes.addAll(a.notes());
        }
    }

    /** Returns a copy of the response with extra assumption notes appended (de-duplicated). */
    private static TaxDeductionResponse withExtraNotes(TaxDeductionResponse base, List<String> notes) {
        TaxDeductionResponse.Assumptions a = base.assumptions();
        Set<String> newNotes = new LinkedHashSet<>(a.notes());
        newNotes.addAll(notes);
        TaxDeductionResponse.Assumptions updated = new TaxDeductionResponse.Assumptions(
                a.annualIncome(),
                a.socialInsuranceRatePercent(),
                a.estimatedTotalIncome(),
                a.estimatedIncomeTaxBase(),
                a.residentCapPerYear(),
                a.taxParameterVerifiedOn(),
                a.taxParameterSources(),
                List.copyOf(newNotes));
        return new TaxDeductionResponse(base.eligible(), base.ineligibleReason(), base.rule(), base.years(),
                base.totals(), updated, base.mode(), base.persons());
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
