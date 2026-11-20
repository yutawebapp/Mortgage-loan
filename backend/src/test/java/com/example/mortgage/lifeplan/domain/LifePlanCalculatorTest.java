package com.example.mortgage.lifeplan.domain;

import com.example.mortgage.lifeplan.domain.LifePlanInput.Child;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.EducationFee;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.Source;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.UniversityFee;
import com.example.mortgage.lifeplan.domain.LifePlanResult.Summary;
import com.example.mortgage.lifeplan.domain.LifePlanResult.YearRow;
import com.example.mortgage.simulation.domain.RepaymentMethod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Expected values come from tmp/lifeplan_expected.py (exact Fraction arithmetic, written independently of
 * this code; output in tmp/lifeplan_expected.json). They were NOT produced by LifePlanCalculator.
 * Seed numbers below are typed from 文部科学省 令和5年度子供の学習費調査 表2 and the university sources.
 */
class LifePlanCalculatorTest {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private static final Source EDU = new Source("学習費調査", "https://www.mext.go.jp/content/20260116-mxt_chousa01-000039333_3.pdf",
            LocalDate.of(2026, 11, 19));
    private static final Source NATIONAL = new Source("国立", "https://www.mext.go.jp/content/20251226-mxt_sigakujo-000046463_4.pdf",
            LocalDate.of(2026, 11, 19));
    private static final Source PRIVATE_UNI = new Source("私立", "https://www.mext.go.jp/a_menu/koutou/shinkou/07021403/1412031_00006.htm",
            LocalDate.of(2026, 11, 19));

    private static final Map<Integer, Long> PUBLIC_SEED = Map.ofEntries(
            Map.entry(3, 149591L), Map.entry(4, 166969L), Map.entry(5, 215617L), Map.entry(6, 395394L),
            Map.entry(7, 297710L), Map.entry(8, 318916L), Map.entry(9, 359778L), Map.entry(10, 392755L),
            Map.entry(11, 432708L), Map.entry(12, 545239L), Map.entry(13, 473569L), Map.entry(14, 607325L),
            Map.entry(15, 700240L), Map.entry(16, 580958L), Map.entry(17, 503697L));
    private static final Map<Integer, Long> PRIVATE_SEED = Map.ofEntries(
            Map.entry(3, 335350L), Map.entry(4, 323783L), Map.entry(5, 378954L), Map.entry(6, 2165693L),
            Map.entry(7, 1493663L), Map.entry(8, 1548734L), Map.entry(9, 1638939L), Map.entry(10, 1736557L),
            Map.entry(11, 1874114L), Map.entry(12, 1869839L), Map.entry(13, 1281980L), Map.entry(14, 1519770L),
            Map.entry(15, 1392712L), Map.entry(16, 1150924L), Map.entry(17, 977725L));

    private static LifePlanParameters params() {
        Map<SchoolType, Map<Integer, EducationFee>> education = new EnumMap<>(SchoolType.class);
        education.put(SchoolType.PUBLIC, new HashMap<>());
        education.put(SchoolType.PRIVATE, new HashMap<>());
        PUBLIC_SEED.forEach((age, amt) -> education.get(SchoolType.PUBLIC).put(age, new EducationFee(amt, EDU)));
        PRIVATE_SEED.forEach((age, amt) -> education.get(SchoolType.PRIVATE).put(age, new EducationFee(amt, EDU)));
        Map<UniversityChoice, UniversityFee> university = new EnumMap<>(UniversityChoice.class);
        university.put(UniversityChoice.NATIONAL, new UniversityFee(817_800, 535_800, NATIONAL));
        university.put(UniversityChoice.PRIVATE, new UniversityFee(1_507_647, 1_170_909, PRIVATE_UNI));
        return new LifePlanParameters(education, university);
    }

    /** Builder for the scenarios: everything defaults to 0 / no loan / no children. */
    private static final class Spec {
        private int cur = 35;
        private int retire = 65;
        private int pension = 65;
        private int end = 95;
        private long income;
        private long growthPct;
        private long retIncome;
        private long living;
        private long retLiving;
        private long savings;
        private long returnPct;
        private long upfront;
        private long loan;
        private BigDecimal ratePct = ZERO;
        private int years;
        private RepaymentMethod method = RepaymentMethod.EQUAL_PAYMENT;
        private long housing;
        private long tax;
        private final List<Child> children = new ArrayList<>();

        Spec ages(int cur, int retire, int end) { this.cur = cur; this.retire = retire; this.end = end; return this; }
        Spec pension(int pension, long retIncome) { this.pension = pension; this.retIncome = retIncome; return this; }
        Spec income(long income, long growthPct) { this.income = income; this.growthPct = growthPct; return this; }
        Spec living(long living, long retLiving) { this.living = living; this.retLiving = retLiving; return this; }
        Spec savings(long savings, long returnPct) { this.savings = savings; this.returnPct = returnPct; return this; }
        Spec upfront(long upfront) { this.upfront = upfront; return this; }
        Spec loan(long principal, String ratePct, int years, RepaymentMethod method) {
            this.loan = principal; this.ratePct = new BigDecimal(ratePct); this.years = years; this.method = method; return this;
        }
        Spec housing(long monthly, long tax) { this.housing = monthly; this.tax = tax; return this; }
        Spec child(int age, SchoolPlan plan, UniversityChoice uni) { children.add(new Child(age, plan, uni)); return this; }

        LifePlanInput build() {
            return new LifePlanInput(cur, retire, pension, end,
                    BigDecimal.valueOf(income), BigDecimal.valueOf(growthPct), BigDecimal.valueOf(retIncome),
                    BigDecimal.valueOf(living), BigDecimal.valueOf(retLiving),
                    BigDecimal.valueOf(savings), BigDecimal.valueOf(returnPct), BigDecimal.valueOf(upfront),
                    BigDecimal.valueOf(loan), ratePct, years, method,
                    BigDecimal.valueOf(housing), BigDecimal.valueOf(tax), List.copyOf(children));
        }
    }

    private static LifePlanResult run(Spec spec) {
        return runInput(spec.build());
    }

    private static LifePlanResult runInput(LifePlanInput input) {
        return LifePlanCalculator.calculate(input, params());
    }

    private static void assertRow(YearRow r, int age, long income, long living, long loanPayment, long loanBalance,
                                  long housing, long education, long net, long closing) {
        assertThat(r.age()).as("age").isEqualTo(age);
        assertThat(r.income()).as("income @%d", age).isEqualByComparingTo(BigDecimal.valueOf(income));
        assertThat(r.livingCost()).as("living @%d", age).isEqualByComparingTo(BigDecimal.valueOf(living));
        assertThat(r.loanPayment()).as("loanPayment @%d", age).isEqualByComparingTo(BigDecimal.valueOf(loanPayment));
        assertThat(r.loanBalance()).as("loanBalance @%d", age).isEqualByComparingTo(BigDecimal.valueOf(loanBalance));
        assertThat(r.housingCost()).as("housing @%d", age).isEqualByComparingTo(BigDecimal.valueOf(housing));
        assertThat(r.educationCost()).as("education @%d", age).isEqualByComparingTo(BigDecimal.valueOf(education));
        assertThat(r.netCashFlow()).as("net @%d", age).isEqualByComparingTo(BigDecimal.valueOf(net));
        assertThat(r.savingsClosing()).as("closing @%d", age).isEqualByComparingTo(BigDecimal.valueOf(closing));
    }

    /** firstShortfallAge, minSavings, minSavingsAge, savingsAtRetirement, savingsAtEnd, loanPayoffAge,
     *  totalEducationCost, peakEducationCost, peakEducationAge, totalLoanPayment. */
    private static void assertSummary(Summary s, Integer firstShortfall, long minSavings, int minAge,
                                      long atRetirement, long atEnd, Integer payoff, long totalEdu,
                                      long peakEdu, Integer peakAge, long totalLoan) {
        assertThat(s.firstShortfallAge()).as("firstShortfallAge").isEqualTo(firstShortfall);
        assertThat(s.minSavings()).as("minSavings").isEqualByComparingTo(BigDecimal.valueOf(minSavings));
        assertThat(s.minSavingsAge()).as("minSavingsAge").isEqualTo(minAge);
        assertThat(s.savingsAtRetirement()).as("savingsAtRetirement").isEqualByComparingTo(BigDecimal.valueOf(atRetirement));
        assertThat(s.savingsAtEnd()).as("savingsAtEnd").isEqualByComparingTo(BigDecimal.valueOf(atEnd));
        assertThat(s.loanPayoffAge()).as("loanPayoffAge").isEqualTo(payoff);
        assertThat(s.totalEducationCost()).as("totalEducationCost").isEqualByComparingTo(BigDecimal.valueOf(totalEdu));
        assertThat(s.peakEducationCost()).as("peakEducationCost").isEqualByComparingTo(BigDecimal.valueOf(peakEdu));
        assertThat(s.peakEducationAge()).as("peakEducationAge").isEqualTo(peakAge);
        assertThat(s.totalLoanPayment()).as("totalLoanPayment").isEqualByComparingTo(BigDecimal.valueOf(totalLoan));
    }

    private static LifePlanResult.YearRow row(LifePlanResult r, int index) {
        return r.years().get(index);
    }

    @Test
    void noChildrenNoLoan_everyRowByHand() {
        // income 6M to age 41, retire at 42, living 200k/220k per month, savings 5M, no return.
        LifePlanResult r = run(new Spec().ages(40, 42, 43).income(6_000_000, 0).living(200_000, 220_000)
                .savings(5_000_000, 0));

        assertThat(r.years()).hasSize(4);
        assertRow(row(r, 0), 40, 6_000_000, 2_400_000, 0, 0, 0, 0, 3_600_000, 8_600_000);
        assertRow(row(r, 1), 41, 6_000_000, 2_400_000, 0, 0, 0, 0, 3_600_000, 12_200_000);
        assertRow(row(r, 2), 42, 0, 2_640_000, 0, 0, 0, 0, -2_640_000, 9_560_000);
        assertRow(row(r, 3), 43, 0, 2_640_000, 0, 0, 0, 0, -2_640_000, 6_920_000);
        assertSummary(r.summary(), null, 6_920_000, 43, 12_200_000, 6_920_000, null, 0, 0, null, 0);
        assertThat(r.sources()).isEmpty();
        assertThat(r.notes()).containsExactly(LifePlanNote.values());
    }

    @Test
    void sample_loanEqualPayment_schoolAndPrivateUniversity_summaryAndRows() {
        // 35 / retire 65 / pension 65 / end 95, income 6M, pension 2.4M, housing 25k/month + 120k tax,
        // loan 40M 1.2% 35y EQUAL_PAYMENT, one child aged 3 (ALL_PUBLIC, PRIVATE university).
        LifePlanResult r = run(new Spec().ages(35, 65, 95).income(6_000_000, 0).pension(65, 2_400_000)
                .living(200_000, 220_000).savings(5_000_000, 0)
                .loan(40_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT)
                .housing(25_000, 120_000)
                .child(3, SchoolPlan.ALL_PUBLIC, UniversityChoice.PRIVATE));

        assertThat(r.years()).hasSize(61);
        assertRow(row(r, 0), 35, 6_000_000, 2_400_000, 1_400_172, 39_074_751, 420_000, 149_591, 1_630_237, 6_630_237);
        assertRow(row(r, 15), 50, 6_000_000, 2_400_000, 1_400_172, 23_777_807, 420_000, 1_507_647, 272_181, 25_829_135);
        assertRow(row(r, 16), 51, 6_000_000, 2_400_000, 1_400_172, 22_656_818, 420_000, 1_170_909, 608_919, 26_438_054);
        assertRow(row(r, 60), 95, 2_400_000, 2_640_000, 0, 0, 420_000, 0, -660_000, 19_773_174);
        assertSummary(r.summary(), null, 6_630_237, 35, 47_234_000, 19_773_174, 70, 11_160_840,
                1_507_647, 50, 49_005_986);
        assertThat(r.sources()).containsExactly(EDU, PRIVATE_UNI);
    }

    @Test
    void loanPrincipalLongerThanHorizon_payoffAfterLifeEnd() {
        // 20M 2.0% 35y EQUAL_PRINCIPAL; horizon 60..70 (11 years). Loan continues beyond lifeEnd.
        LifePlanResult r = run(new Spec().ages(60, 65, 70).income(6_000_000, 0).living(200_000, 220_000)
                .savings(5_000_000, 0).loan(20_000_000, "2.0", 35, RepaymentMethod.EQUAL_PRINCIPAL));

        assertRow(row(r, 0), 60, 6_000_000, 2_400_000, 966_202, 19_428_560, 0, 0, 2_633_798, 7_633_798);
        assertRow(row(r, 1), 61, 6_000_000, 2_400_000, 954_769, 18_857_124, 0, 0, 2_645_231, 10_279_029);
        assertRow(row(r, 10), 70, 0, 2_640_000, 851_904, 13_714_272, 0, 0, -3_491_904, -2_839_535);
        assertSummary(r.summary(), 70, -2_839_535, 70, 18_283_317, -2_839_535, 95, 0, 0, null, 9_999_535);
    }

    @Test
    void loanPaymentShorterThanHorizon_housingContinuesAfterPayoff() {
        // 10M 0.5% 5y EQUAL_PAYMENT, retire 41, end 42; housing 25k/month + 120k tax every year.
        LifePlanResult r = run(new Spec().ages(35, 41, 42).income(6_000_000, 0).living(200_000, 220_000)
                .savings(5_000_000, 0).loan(10_000_000, "0.5", 5, RepaymentMethod.EQUAL_PAYMENT)
                .housing(25_000, 120_000));

        assertRow(row(r, 0), 35, 6_000_000, 2_400_000, 2_025_516, 8_019_950, 420_000, 0, 1_154_484, 6_154_484);
        assertRow(row(r, 4), 39, 6_000_000, 2_400_000, 2_025_542, 0, 420_000, 0, 1_154_458, 10_772_394);
        assertRow(row(r, 5), 40, 6_000_000, 2_400_000, 0, 0, 420_000, 0, 3_180_000, 13_952_394);
        assertRow(row(r, 7), 42, 0, 2_640_000, 0, 0, 420_000, 0, -3_060_000, 7_832_394);
        assertSummary(r.summary(), null, 6_154_484, 35, 13_952_394, 7_832_394, 40, 0, 0, null, 10_127_606);
    }

    /** Each school plan with children aged 3, 10 and 16 (horizon 30..70). */
    @Test
    void allPublic_threeChildren() {
        LifePlanResult r = runInput(threeChildren(SchoolPlan.ALL_PUBLIC));
        assertSummary(r.summary(), null, 7_476_696, 30, 119_538_388, 103_698_388, null, 11_461_612,
                1_123_304, 30, 0);
    }

    @Test
    void privateHigh_threeChildren() {
        LifePlanResult r = runInput(threeChildren(SchoolPlan.PRIVATE_HIGH));
        assertSummary(r.summary(), null, 6_906_730, 30, 115_021_462, 99_181_462, null, 15_978_538,
                1_711_628, 35, 0);
    }

    @Test
    void privateJuniorAndHigh_threeChildren() {
        LifePlanResult r = runInput(threeChildren(SchoolPlan.PRIVATE_JUNIOR_AND_HIGH));
        assertSummary(r.summary(), null, 6_906_730, 30, 108_930_550, 93_090_550, null, 22_069_450,
                2_085_456, 32, 0);
    }

    @Test
    void allPrivate_threeChildren() {
        LifePlanResult r = runInput(threeChildren(SchoolPlan.ALL_PRIVATE));
        assertSummary(r.summary(), null, 5_377_169, 30, 97_378_993, 81_538_993, null, 33_621_007,
                3_447_673, 33, 0);
        assertRow(row(r, 0), 30, 6_000_000, 2_400_000, 0, 0, 0, 3_222_831, 377_169, 5_377_169);
        assertRow(row(r, 5), 35, 6_000_000, 2_400_000, 0, 0, 0, 2_941_446, 658_554, 8_550_202);
    }

    /** University: 15-year-old NATIONAL (first year at 18 = j 3), 20-year-old PRIVATE (later years only). */
    @Test
    void universityNationalAt15_privateAt20() {
        LifePlanResult r = run(new Spec().ages(30, 35, 40).income(6_000_000, 0).living(200_000, 220_000)
                .savings(5_000_000, 0)
                .child(15, SchoolPlan.ALL_PUBLIC, UniversityChoice.NATIONAL)
                .child(20, SchoolPlan.ALL_PUBLIC, UniversityChoice.PRIVATE));

        assertRow(row(r, 0), 30, 6_000_000, 2_400_000, 0, 0, 0, 1_871_149, 1_728_851, 6_728_851);
        assertRow(row(r, 1), 31, 6_000_000, 2_400_000, 0, 0, 0, 1_751_867, 1_848_133, 8_576_984);
        assertRow(row(r, 2), 32, 6_000_000, 2_400_000, 0, 0, 0, 503_697, 3_096_303, 11_673_287);
        assertRow(row(r, 3), 33, 6_000_000, 2_400_000, 0, 0, 0, 817_800, 2_782_200, 14_455_487);
        assertRow(row(r, 4), 34, 6_000_000, 2_400_000, 0, 0, 0, 535_800, 3_064_200, 17_519_687);
        assertRow(row(r, 5), 35, 0, 2_640_000, 0, 0, 0, 535_800, -3_175_800, 14_343_887);
        assertRow(row(r, 7), 37, 0, 2_640_000, 0, 0, 0, 0, -2_640_000, 8_528_087);
        assertSummary(r.summary(), null, 608_087, 40, 17_519_687, 608_087, null, 6_551_913, 1_871_149, 30, 0);
        assertThat(r.sources()).containsExactlyInAnyOrder(EDU, NATIONAL, PRIVATE_UNI);
    }

    /** 18-year-old PRIVATE (4 years) plus a 3-year-old PRIVATE university later in the horizon. */
    @Test
    void universityPrivateAt18_overlappingWithSchoolCost() {
        LifePlanResult r = run(new Spec().ages(30, 40, 52).income(6_000_000, 0).living(200_000, 220_000)
                .savings(5_000_000, 0)
                .child(18, SchoolPlan.ALL_PUBLIC, UniversityChoice.PRIVATE)
                .child(3, SchoolPlan.ALL_PUBLIC, UniversityChoice.PRIVATE));
        assertRow(row(r, 0), 30, 6_000_000, 2_400_000, 0, 0, 0, 1_657_238, 1_942_762, 6_942_762);
        assertSummary(r.summary(), 49, -9_501_214, 52, 32_704_949, -9_501_214, null, 16_181_214, 1_657_238, 30, 0);
    }

    /** Peak education year is the one where all three children are in school (age 38). */
    @Test
    void overlappingChildren_peakEducationYear() {
        LifePlanResult r = run(new Spec().ages(35, 65, 70).income(8_000_000, 0).living(200_000, 220_000)
                .savings(10_000_000, 0)
                .child(3, SchoolPlan.ALL_PRIVATE, UniversityChoice.PRIVATE)
                .child(7, SchoolPlan.PRIVATE_HIGH, UniversityChoice.NATIONAL)
                .child(12, SchoolPlan.PRIVATE_JUNIOR_AND_HIGH, UniversityChoice.NONE));
        assertRow(row(r, 3), 38, 8_000_000, 2_400_000, 0, 0, 0, 3_951_160, 1_648_840, 21_762_760);
        assertSummary(r.summary(), null, 13_097_101, 35, 135_723_378, 119_883_378, null, 42_276_622,
                3_951_160, 38, 0);
        assertThat(r.sources()).containsExactly(EDU, NATIONAL, PRIVATE_UNI);
    }

    /** Income grows 2% a year before retirement; savings earn 1% on a positive opening balance. */
    @Test
    void incomeGrowthAndSavingsReturn() {
        LifePlanResult r = run(new Spec().ages(30, 40, 45).income(5_000_000, 2).living(150_000, 200_000)
                .savings(2_000_000, 1));
        assertRow(row(r, 0), 30, 5_000_000, 1_800_000, 0, 0, 0, 0, 3_200_000, 5_220_000);
        assertRow(row(r, 1), 31, 5_100_000, 1_800_000, 0, 0, 0, 0, 3_300_000, 8_572_200);
        assertRow(row(r, 2), 32, 5_202_000, 1_800_000, 0, 0, 0, 0, 3_402_000, 12_059_922);
        assertRow(row(r, 15), 45, 0, 2_400_000, 0, 0, 0, 0, -2_400_000, 28_294_039);
        assertSummary(r.summary(), null, 5_220_000, 30, 40_563_409, 28_294_039, null, 0, 0, null, 0);
    }

    @Test
    void savingsGoNegative_firstShortfallAge() {
        LifePlanResult r = run(new Spec().ages(40, 44, 47).income(3_000_000, 0).living(300_000, 300_000)
                .savings(1_000_000, 0));
        assertRow(row(r, 1), 41, 3_000_000, 3_600_000, 0, 0, 0, 0, -600_000, -200_000);
        assertRow(row(r, 4), 44, 0, 3_600_000, 0, 0, 0, 0, -3_600_000, -5_000_000);
        assertSummary(r.summary(), 41, -15_800_000, 47, -1_400_000, -15_800_000, null, 0, 0, null, 0);
    }

    @Test
    void savingsNeverNegative_noShortfall() {
        LifePlanResult r = run(new Spec().ages(40, 44, 47).income(3_000_000, 0).living(300_000, 300_000)
                .savings(20_000_000, 0));
        assertSummary(r.summary(), null, 3_200_000, 47, 17_600_000, 3_200_000, null, 0, 0, null, 0);
    }

    /** Retire at 62, pension from 65: ages 62..64 have no income at all. */
    @Test
    void retireBeforePensionStart_gapWithNoIncome() {
        LifePlanResult r = run(new Spec().ages(60, 62, 70).pension(65, 1_500_000)
                .income(5_000_000, 0).living(250_000, 200_000).savings(10_000_000, 0));
        assertRow(row(r, 2), 62, 0, 2_400_000, 0, 0, 0, 0, -2_400_000, 11_600_000);
        assertRow(row(r, 4), 64, 0, 2_400_000, 0, 0, 0, 0, -2_400_000, 6_800_000);
        assertRow(row(r, 5), 65, 1_500_000, 2_400_000, 0, 0, 0, 0, -900_000, 5_900_000);
        assertSummary(r.summary(), null, 1_400_000, 70, 14_000_000, 1_400_000, null, 0, 0, null, 0);
    }

    @Test
    void upfrontPayment_paidInYearZeroOnly() {
        LifePlanResult r = run(new Spec().ages(35, 40, 42).income(6_000_000, 0).living(200_000, 200_000)
                .savings(5_000_000, 0).upfront(3_000_000));
        assertRow(row(r, 0), 35, 6_000_000, 2_400_000, 0, 0, 0, 0, 600_000, 5_600_000);
        assertRow(row(r, 1), 36, 6_000_000, 2_400_000, 0, 0, 0, 0, 3_600_000, 9_200_000);
        assertSummary(r.summary(), null, 5_600_000, 35, 20_000_000, 12_800_000, null, 0, 0, null, 0);
    }

    @Test
    void invalidAgeOrder_isRejected() {
        assertThatThrownBy(() -> run(new Spec().ages(40, 40, 50)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    /** Children aged 3, 10 and 16 with the same school plan; horizon 30..70, no university. */
    private static LifePlanInput threeChildren(SchoolPlan plan) {
        return new Spec().ages(30, 65, 70).income(6_000_000, 0).living(200_000, 220_000).savings(5_000_000, 0)
                .child(3, plan, UniversityChoice.NONE)
                .child(10, plan, UniversityChoice.NONE)
                .child(16, plan, UniversityChoice.NONE)
                .build();
    }
}
