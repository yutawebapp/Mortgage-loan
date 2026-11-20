package com.example.mortgage.lifeplan.domain;

import com.example.mortgage.common.RoundingPolicy;
import com.example.mortgage.lifeplan.domain.LifePlanInput.Child;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.EducationFee;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.Source;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.UniversityFee;
import com.example.mortgage.lifeplan.domain.LifePlanResult.Summary;
import com.example.mortgage.lifeplan.domain.LifePlanResult.YearRow;
import com.example.mortgage.simulation.domain.RepaymentCalculator;
import com.example.mortgage.simulation.domain.RepaymentResult.ScheduleRow;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Pure Java household cash-flow projection (ライフプラン). No Spring / DB dependencies.
 *
 * <p>All money is in today's yen; nothing is inflated. For year index j = 0..(lifeEndAge - currentAge),
 * age = currentAge + j:
 * <ul>
 *   <li>income = (age &lt; retireAge ? RoundingPolicy(annualTakeHomeIncome x (1 + g)^j) : 0)
 *       + (age &gt;= pensionStartAge ? retirementAnnualIncome : 0)</li>
 *   <li>livingCost = 12 x (age &lt; retireAge ? monthlyLivingCost : retirementMonthlyLivingCost)</li>
 *   <li>loanPayment / loanBalance from {@link RepaymentCalculator#singleLoanSchedule} (no bonus)</li>
 *   <li>housingCost = 12 x monthlyHousingCost + annualHousingTax, every year (also after the loan ends)</li>
 *   <li>educationCost = sum over children of the school cost at (childAge + j) for ages 3..17 and the
 *       university tuition for ages 18..21 (18 = first year, 19..21 = later years)</li>
 *   <li>netCashFlow = income - livingCost - loanPayment - housingCost - educationCost - (j == 0 ? upfront : 0)</li>
 *   <li>interest = opening &gt; 0 ? RoundingPolicy(opening x r) : 0, on the opening balance once a year;
 *       closing = opening + interest + netCashFlow; opening of year 0 = savings</li>
 * </ul>
 */
public final class LifePlanCalculator {

    /** School cost is defined for school-year ages 3 (幼稚園3歳) .. 17 (高3). */
    public static final int FIRST_SCHOOL_AGE = 3;
    public static final int LAST_SCHOOL_AGE = 17;
    /** University tuition is defined for ages 18 (first year) .. 21 (fourth year). */
    public static final int FIRST_UNIVERSITY_AGE = 18;
    public static final int LAST_UNIVERSITY_AGE = 21;

    private static final int MONTHS_PER_YEAR = 12;
    private static final BigDecimal MONTHS = BigDecimal.valueOf(MONTHS_PER_YEAR);

    private LifePlanCalculator() {
    }

    /**
     * @param input  projection inputs (ages already validated: currentAge &lt; retireAge &lt; lifeEndAge)
     * @param params education and university cost rows from the DB
     * @throws IllegalArgumentException when the age order is invalid
     */
    public static LifePlanResult calculate(LifePlanInput input, LifePlanParameters params) {
        if (!(input.currentAge() < input.retireAge() && input.retireAge() < input.lifeEndAge())) {
            throw new IllegalArgumentException("ages must satisfy currentAge < retireAge < lifeEndAge");
        }
        int horizon = input.lifeEndAge() - input.currentAge() + 1;
        boolean hasLoan = input.loanPrincipal().signum() > 0;
        int loanMonths = hasLoan ? input.years() * MONTHS_PER_YEAR : 0;
        List<ScheduleRow> schedule = hasLoan
                ? RepaymentCalculator.singleLoanSchedule(input.loanPrincipal(), input.annualRatePercent(),
                        loanMonths, input.method())
                : List.of();

        BigDecimal growth = BigDecimal.ONE.add(input.incomeGrowthPercent().movePointLeft(2));
        BigDecimal housingYearly = input.monthlyHousingCost().multiply(MONTHS).add(input.annualHousingTax());
        BigDecimal returnRate = input.savingsReturnPercent();

        Set<Source> usedSources = new LinkedHashSet<>();
        List<YearRow> rows = new ArrayList<>(horizon);
        BigDecimal opening = input.savings();

        for (int j = 0; j < horizon; j++) {
            int age = input.currentAge() + j;
            boolean working = age < input.retireAge();

            BigDecimal income = BigDecimal.ZERO;
            if (working) {
                income = RoundingPolicy.yen(input.annualTakeHomeIncome().multiply(growth.pow(j)));
            }
            if (age >= input.pensionStartAge()) {
                income = income.add(input.retirementAnnualIncome());
            }

            BigDecimal monthlyLiving = working ? input.monthlyLivingCost() : input.retirementMonthlyLivingCost();
            BigDecimal livingCost = monthlyLiving.multiply(MONTHS);

            BigDecimal loanPayment = BigDecimal.ZERO;
            BigDecimal loanBalance = BigDecimal.ZERO;
            int from = j * MONTHS_PER_YEAR;
            if (from < loanMonths) {
                int to = Math.min(from + MONTHS_PER_YEAR, loanMonths);
                for (int m = from; m < to; m++) {
                    loanPayment = loanPayment.add(schedule.get(m).payment());
                }
                loanBalance = schedule.get(to - 1).balance();
            }

            BigDecimal educationCost = BigDecimal.ZERO;
            for (Child child : input.children()) {
                int childAge = child.age() + j;
                if (childAge >= FIRST_SCHOOL_AGE && childAge <= LAST_SCHOOL_AGE) {
                    var type = child.schoolPlan().schoolTypeAt(childAge);
                    EducationFee fee = params.education().get(type).get(childAge);
                    educationCost = educationCost.add(BigDecimal.valueOf(fee.annualAmount()));
                    usedSources.add(fee.source());
                }
                if (child.university() != UniversityChoice.NONE
                        && childAge >= FIRST_UNIVERSITY_AGE && childAge <= LAST_UNIVERSITY_AGE) {
                    UniversityFee fee = params.university().get(child.university());
                    long amount = childAge == FIRST_UNIVERSITY_AGE ? fee.firstYearAmount() : fee.laterYearAmount();
                    educationCost = educationCost.add(BigDecimal.valueOf(amount));
                    usedSources.add(fee.source());
                }
            }

            BigDecimal upfront = j == 0 ? input.upfrontPayment() : BigDecimal.ZERO;
            BigDecimal netCashFlow = income.subtract(livingCost).subtract(loanPayment)
                    .subtract(housingYearly).subtract(educationCost).subtract(upfront);

            BigDecimal interest = opening.signum() > 0
                    ? RoundingPolicy.yen(opening.multiply(returnRate).movePointLeft(2))
                    : BigDecimal.ZERO;
            BigDecimal closing = opening.add(interest).add(netCashFlow);

            rows.add(new YearRow(age, income, livingCost, loanPayment, loanBalance, housingYearly,
                    educationCost, netCashFlow, closing));
            opening = closing;
        }

        return new LifePlanResult(rows, summarize(input, rows, hasLoan), List.copyOf(usedSources),
                List.of(LifePlanNote.values()));
    }

    private static Summary summarize(LifePlanInput input, List<YearRow> rows, boolean hasLoan) {
        Integer firstShortfallAge = null;
        YearRow minRow = rows.get(0);
        BigDecimal totalEducation = BigDecimal.ZERO;
        BigDecimal totalLoan = BigDecimal.ZERO;
        YearRow peak = null;
        for (YearRow r : rows) {
            if (firstShortfallAge == null && r.savingsClosing().signum() < 0) {
                firstShortfallAge = r.age();
            }
            if (r.savingsClosing().compareTo(minRow.savingsClosing()) < 0) {
                minRow = r;
            }
            totalEducation = totalEducation.add(r.educationCost());
            totalLoan = totalLoan.add(r.loanPayment());
            if (r.educationCost().signum() > 0
                    && (peak == null || r.educationCost().compareTo(peak.educationCost()) > 0)) {
                peak = r;
            }
        }
        YearRow retirementYearEnd = rows.get(input.retireAge() - 1 - input.currentAge());
        YearRow last = rows.get(rows.size() - 1);
        // Payoff age is reported only when it falls inside the projection (<= lifeEndAge); otherwise null.
        int payoffAge = input.currentAge() + input.years();
        boolean payoffInside = hasLoan && payoffAge <= input.lifeEndAge();
        return new Summary(
                firstShortfallAge,
                minRow.savingsClosing(),
                minRow.age(),
                retirementYearEnd.savingsClosing(),
                last.savingsClosing(),
                payoffInside ? payoffAge : null,
                totalEducation,
                peak == null ? BigDecimal.ZERO : peak.educationCost(),
                peak == null ? null : peak.age(),
                totalLoan);
    }
}
