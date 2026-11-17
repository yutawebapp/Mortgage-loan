package com.example.mortgage.taxdeduction.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentResult;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.AppliedRule;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.Assumptions;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.TaxEstimate;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.Totals;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.YearRow;
import com.example.mortgage.taxdeduction.domain.TaxParameters.Bracket;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Pure Java housing loan tax deduction estimate (no Spring / DB). All rules and tax parameters are passed in.
 *
 * <p>Model (simplified, see notes in {@link #NOTE_*} codes):
 * <ul>
 *   <li>Loan: {@link RepaymentCalculator} with no bonus. Calendar year Y = moveInYear + k (k = 0..deductionYears-1).
 *       Payments made by 12/31 of Y: paid(k) = (12 - moveInMonth) + 12k, capped at years*12.</li>
 *   <li>Per year cap = floor100(min(yearEndBalance, limit) * rate / 100). Listing stops after the year in which
 *       the loan is fully repaid.</li>
 *   <li>Tax estimate (same every year): single, no dependants, social insurance at the given rate, basic deduction
 *       only. Credit order: 所得税 first, then the unclaimed remainder against 住民税 (capped).</li>
 * </ul>
 */
public final class TaxDeductionCalculator {

    static final String NOTE_INCOME_ESTIMATE = "INCOME_ESTIMATE";
    static final String NOTE_SINGLE_NO_DEPENDANTS = "SINGLE_NO_DEPENDANTS";
    static final String NOTE_LAW_ASSUMED = "LAW_2026_ASSUMED_FOR_ALL_YEARS";
    static final String NOTE_ADJUSTMENT_DEDUCTION_ASSUMED = "ADJUSTMENT_DEDUCTION_ASSUMED";
    static final String NOTE_PREPAYMENT_NOT_CONSIDERED = "PREPAYMENT_NOT_CONSIDERED";
    static final String NOTE_SALARY_DEDUCTION_APPROXIMATE = "SALARY_DEDUCTION_APPROXIMATE";

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1000);
    private static final int MIN_LOAN_YEARS = 10;
    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal INCOME_LIMIT = BigDecimal.valueOf(20_000_000L);
    private static final BigDecimal AREA_40S_INCOME_LIMIT = BigDecimal.valueOf(10_000_000L);
    /** Salary-deduction formula below this income is an approximation of 別表第五. */
    private static final BigDecimal SALARY_TABLE_EXACT_FROM = BigDecimal.valueOf(6_600_000L);

    private TaxDeductionCalculator() {
    }

    public static TaxDeductionResult calculate(TaxDeductionInput in, DeductionRule rule, TaxParameters params) {
        if (rule == null) {
            return ineligible(IneligibleReason.NOT_ELIGIBLE_BY_RULE, null, null);
        }
        boolean childcareApplied = in.childcareHousehold() && in.floorAreaOver50();
        BigDecimal limit = childcareApplied ? rule.limitAmountChildcare() : rule.limitAmount();
        AppliedRule applied = new AppliedRule(limit, rule.deductionYears(), rule.ratePercent(),
                childcareApplied, rule.conditionCode(), rule.sourceUrl(), rule.verifiedOn());

        if (in.years() < MIN_LOAN_YEARS) {
            return ineligible(IneligibleReason.LOAN_TERM_UNDER_10Y, applied, null);
        }

        TaxEstimate est = estimateTax(in, params);
        if (est.salaryIncome().compareTo(INCOME_LIMIT) > 0) {
            return ineligible(IneligibleReason.INCOME_OVER_20M, applied, est);
        }
        if (!in.floorAreaOver50() && est.salaryIncome().compareTo(AREA_40S_INCOME_LIMIT) > 0) {
            return ineligible(IneligibleReason.AREA_40S_INCOME_OVER_LIMIT, applied, est);
        }

        List<YearRow> rows = yearRows(in, rule, limit, est, params);
        Totals totals = totals(rows);
        Assumptions assumptions = assumptions(in, est, params);
        return new TaxDeductionResult(true, null, applied, rows, totals, assumptions, est);
    }

    // ---------------------------------------------------------------- loan & deduction per year

    private static List<YearRow> yearRows(TaxDeductionInput in, DeductionRule rule, BigDecimal limit,
                                          TaxEstimate est, TaxParameters params) {
        RepaymentResult loan = RepaymentCalculator.calculate(
                in.principal(), in.annualRatePercent(), in.years(), in.method(), BigDecimal.ZERO);
        List<ScheduleRow> schedule = loan.schedule();
        int totalMonths = in.years() * MONTHS_PER_YEAR;

        BigDecimal baseIncomeTax = est.incomeTaxBase();
        BigDecimal residentTax = est.residentTax();
        BigDecimal residentCap = est.residentCreditCap();

        List<YearRow> rows = new ArrayList<>();
        int prevPaid = 0;
        for (int k = 0; k < rule.deductionYears(); k++) {
            if (prevPaid >= totalMonths) {
                break; // loan already fully repaid before this calendar year
            }
            int paid = Math.min(totalMonths, (MONTHS_PER_YEAR - in.moveInMonth()) + MONTHS_PER_YEAR * k);
            BigDecimal balance = paid == 0 ? in.principal() : schedule.get(paid - 1).balance();
            BigDecimal annualPayment = BigDecimal.ZERO;
            for (int i = prevPaid; i < paid; i++) {
                annualPayment = annualPayment.add(schedule.get(i).payment());
            }

            BigDecimal base = balance.min(limit);
            BigDecimal cap = floorHundred(base.multiply(rule.ratePercent()).divide(HUNDRED));

            BigDecimal incomeTaxCredit = cap.min(baseIncomeTax);
            BigDecimal remaining = cap.subtract(incomeTaxCredit);
            BigDecimal residentCredit = remaining.min(residentCap).min(residentTax);
            BigDecimal unclaimed = remaining.subtract(residentCredit);
            BigDecimal total = incomeTaxCredit.add(residentCredit);

            rows.add(new YearRow(
                    in.moveInYear() + k,
                    k + 1,
                    yen(annualPayment),
                    yen(balance),
                    yen(base),
                    cap,
                    incomeTaxWithReconstruction(baseIncomeTax, params),
                    incomeTaxWithReconstruction(baseIncomeTax.subtract(incomeTaxCredit), params),
                    yen(residentTax),
                    yen(incomeTaxCredit),
                    yen(residentCredit),
                    yen(total),
                    yen(unclaimed)));
            prevPaid = paid;
        }
        return rows;
    }

    /** Display value: amount * (100 + reconstruction rate) / 100, floored to 100 yen. */
    private static BigDecimal incomeTaxWithReconstruction(BigDecimal amount, TaxParameters params) {
        return floorHundred(amount.multiply(HUNDRED.add(params.reconstructionRatePercent())).divide(HUNDRED));
    }

    private static Totals totals(List<YearRow> rows) {
        BigDecimal deduction = BigDecimal.ZERO;
        BigDecimal unclaimed = BigDecimal.ZERO;
        BigDecimal payment = BigDecimal.ZERO;
        for (YearRow r : rows) {
            deduction = deduction.add(r.totalDeduction());
            unclaimed = unclaimed.add(r.unclaimed());
            payment = payment.add(r.annualPayment());
        }
        return new Totals(yen(deduction), yen(unclaimed), yen(payment),
                yen(payment.subtract(deduction)), rows.size());
    }

    // ---------------------------------------------------------------- tax estimate

    static TaxEstimate estimateTax(TaxDeductionInput in, TaxParameters params) {
        BigDecimal income = in.annualIncome();

        Bracket salaryBracket = lookup(params.salaryDeduction(), income);
        if (salaryBracket == null) {
            throw new IllegalStateException("salary deduction table has no matching bracket");
        }
        BigDecimal salaryDeduction = floorYen(apply(income, salaryBracket));
        BigDecimal salaryIncome = income.subtract(salaryDeduction);

        BigDecimal socialInsurance = floorYen(income.multiply(in.socialInsuranceRatePercent()).divide(HUNDRED));

        Bracket basicBracket = lookup(params.basicDeduction(), salaryIncome);
        BigDecimal basicDeduction = basicBracket == null ? BigDecimal.ZERO : floorYen(apply(salaryIncome, basicBracket));

        BigDecimal taxableIncomeTax = floorThousand(
                salaryIncome.subtract(socialInsurance).subtract(basicDeduction).max(BigDecimal.ZERO));
        BigDecimal incomeTaxBase = BigDecimal.ZERO;
        if (taxableIncomeTax.signum() > 0) {
            Bracket it = lookup(params.incomeTax(), taxableIncomeTax);
            if (it == null) {
                throw new IllegalStateException("income tax table has no matching bracket");
            }
            incomeTaxBase = floorYen(apply(taxableIncomeTax, it)).max(BigDecimal.ZERO);
        }

        BigDecimal taxableResident = floorThousand(salaryIncome.subtract(socialInsurance)
                .subtract(params.residentBasicDeduction()).max(BigDecimal.ZERO));
        BigDecimal residentTax = floorYen(taxableResident.multiply(params.residentTaxRatePercent()).divide(HUNDRED))
                .subtract(params.residentAdjustmentDeduction())
                .max(BigDecimal.ZERO);

        BigDecimal residentCreditCap = floorYen(taxableIncomeTax.multiply(params.residentCreditRatePercent())
                .divide(HUNDRED)).min(params.residentCreditCap());

        return new TaxEstimate(salaryDeduction, salaryIncome, socialInsurance, basicDeduction,
                taxableIncomeTax, incomeTaxBase, taxableResident, residentTax, residentCreditCap);
    }

    private static Assumptions assumptions(TaxDeductionInput in, TaxEstimate est, TaxParameters params) {
        List<String> notes = new ArrayList<>(List.of(
                NOTE_INCOME_ESTIMATE,
                NOTE_SINGLE_NO_DEPENDANTS,
                NOTE_LAW_ASSUMED,
                NOTE_ADJUSTMENT_DEDUCTION_ASSUMED,
                NOTE_PREPAYMENT_NOT_CONSIDERED));
        if (in.annualIncome().compareTo(SALARY_TABLE_EXACT_FROM) < 0) {
            notes.add(NOTE_SALARY_DEDUCTION_APPROXIMATE);
        }
        return new Assumptions(
                yen(in.annualIncome()),
                in.socialInsuranceRatePercent(),
                yen(est.salaryIncome()),
                yen(est.incomeTaxBase()),
                yen(est.residentCreditCap()),
                params.verifiedOn(),
                List.copyOf(params.sourceUrls()),
                List.copyOf(notes));
    }

    private static TaxDeductionResult ineligible(IneligibleReason reason, AppliedRule rule, TaxEstimate est) {
        return new TaxDeductionResult(false, reason, rule, List.of(), null, null, est);
    }

    // ---------------------------------------------------------------- helpers

    /** First bracket with upperLimit == null or value <= upperLimit; null if none. */
    static Bracket lookup(List<Bracket> brackets, BigDecimal value) {
        for (Bracket b : brackets) {
            if (b.upperLimit() == null || value.compareTo(b.upperLimit()) <= 0) {
                return b;
            }
        }
        return null;
    }

    /** value * rate / 100 + amount (not rounded). */
    private static BigDecimal apply(BigDecimal value, Bracket b) {
        return value.multiply(b.ratePercent()).divide(HUNDRED).add(b.amount());
    }

    private static BigDecimal floorYen(BigDecimal v) {
        return v.setScale(0, RoundingMode.FLOOR);
    }

    private static BigDecimal floorThousand(BigDecimal v) {
        return v.divide(THOUSAND).setScale(0, RoundingMode.FLOOR).multiply(THOUSAND);
    }

    private static BigDecimal floorHundred(BigDecimal v) {
        return v.divide(HUNDRED).setScale(0, RoundingMode.FLOOR).multiply(HUNDRED);
    }

    private static BigDecimal yen(BigDecimal v) {
        return RoundingPolicy.yen(v);
    }
}
