package com.example.mortgage.taxdeduction.domain;

import com.example.mortgage.simulation.domain.RepaymentMethod;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.TaxEstimate;
import com.example.mortgage.taxdeduction.domain.TaxDeductionResult.YearRow;
import com.example.mortgage.taxdeduction.domain.TaxParameters.Bracket;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Golden tests. Tax parameters are built here from the verified table in docs/design.md 7.5 (NOT from the DB).
 * Golden loan/deduction rows come from tmp/tax_deduction_expected.json (independent python3 model, see GoldenRows).
 * Hand-computed tax goldens (5M / 8M) are from the official tables (No.1410, No.1199, No.2260, 住民税).
 */
class TaxDeductionCalculatorTest {

    private static final String MLIT_URL = "https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf";
    private static final LocalDate VERIFIED = LocalDate.of(2026, 11, 17);

    // ------------------------------------------------------------------ fixtures

    private static BigDecimal bd(long v) {
        return BigDecimal.valueOf(v);
    }

    private static Bracket b(Long upper, String rate, long amount) {
        return new Bracket(upper == null ? null : bd(upper), new BigDecimal(rate), bd(amount));
    }

    /** 令和8年分 (assumed to continue for 2026-2030), values from docs/design.md 7.5. */
    static TaxParameters fy2026() {
        return new TaxParameters(
                List.of(
                        b(2_200_000L, "0", 740_000),
                        b(3_600_000L, "30", 80_000),
                        b(6_600_000L, "20", 440_000),
                        b(8_500_000L, "10", 1_100_000),
                        b(null, "0", 1_950_000)),
                List.of(
                        b(4_890_000L, "0", 1_040_000),
                        b(6_550_000L, "0", 670_000),
                        b(23_500_000L, "0", 620_000)),
                List.of(
                        b(1_949_000L, "5", 0),
                        b(3_299_000L, "10", -97_500),
                        b(6_949_000L, "20", -427_500),
                        b(8_999_000L, "23", -636_000),
                        b(17_999_000L, "33", -1_536_000),
                        b(39_999_000L, "40", -2_796_000),
                        b(null, "45", -4_796_000)),
                new BigDecimal("2.1"),
                new BigDecimal("10"),
                bd(430_000),
                bd(2_500),
                new BigDecimal("5"),
                bd(97_500),
                bd(20_000_000),
                bd(10_000_000),
                VERIFIED,
                List.of(MLIT_URL));
    }

    private static DeductionRule rule(HousingType h, EnergyClass e, ConditionCode c, int from, int to,
                                      long limit, long limitChildcare, int years) {
        return new DeductionRule(h, e, c, from, to, bd(limit), bd(limitChildcare), years,
                new BigDecimal("0.70"), MLIT_URL, VERIFIED);
    }

    private static DeductionRule zehNew() {
        return rule(HousingType.NEW, EnergyClass.ZEH, ConditionCode.STANDARD, 2026, 2030, 35_000_000, 45_000_000, 13);
    }

    private static DeductionRule certifiedNew() {
        return rule(HousingType.NEW, EnergyClass.CERTIFIED, ConditionCode.STANDARD, 2026, 2030, 45_000_000, 50_000_000, 13);
    }

    private static DeductionRule newOtherExemption() {
        return rule(HousingType.NEW, EnergyClass.OTHER, ConditionCode.EXEMPTION, 2026, 2030, 20_000_000, 20_000_000, 10);
    }

    private static DeductionRule newEnergyExemption() {
        return rule(HousingType.NEW, EnergyClass.ENERGY_STANDARD, ConditionCode.EXEMPTION, 2028, 2030, 20_000_000, 20_000_000, 10);
    }

    private static DeductionRule usedOther() {
        return rule(HousingType.USED, EnergyClass.OTHER, ConditionCode.STANDARD, 2026, 2030, 20_000_000, 20_000_000, 10);
    }

    private static TaxDeductionInput input(long principal, String rate, int years, RepaymentMethod method,
                                           long income, int moveInYear, int moveInMonth,
                                           boolean childcare, boolean area50) {
        return new TaxDeductionInput(bd(principal), new BigDecimal(rate), years, method, bd(income),
                bd(15), moveInYear, moveInMonth, childcare,
                area50 ? FloorAreaCategory.AT_LEAST_50 : FloorAreaCategory.FROM_40_TO_UNDER_50);
    }

    private static TaxDeductionResult run(TaxDeductionInput in, DeductionRule rule) {
        return TaxDeductionCalculator.calculate(in, rule, fy2026());
    }

    private static long[] toArray(YearRow r) {
        return new long[] {
                r.year(), r.ordinal(),
                r.annualPayment().longValueExact(), r.yearEndBalance().longValueExact(),
                r.deductionBase().longValueExact(), r.deductionCap().longValueExact(),
                r.incomeTaxBefore().longValueExact(), r.incomeTaxAfter().longValueExact(),
                r.residentTaxEstimate().longValueExact(),
                r.incomeTaxCredit().longValueExact(), r.residentTaxCredit().longValueExact(),
                r.totalDeduction().longValueExact(), r.unclaimed().longValueExact()};
    }

    private static void assertRows(TaxDeductionResult result, long[][] expected) {
        assertThat(result.eligible()).isTrue();
        assertThat(result.years()).hasSize(expected.length);
        for (int i = 0; i < expected.length; i++) {
            assertThat(toArray(result.years().get(i))).as("row %d", i).containsExactly(expected[i]);
        }
    }

    private static void assertTotals(TaxDeductionResult result, long deduction, long unclaimed,
                                     long payment, long netCost, int listed) {
        TaxDeductionResult.Totals t = result.totals();
        assertThat(t.totalDeduction()).isEqualByComparingTo(bd(deduction));
        assertThat(t.totalUnclaimed()).isEqualByComparingTo(bd(unclaimed));
        assertThat(t.totalPayment()).isEqualByComparingTo(bd(payment));
        assertThat(t.netCost()).isEqualByComparingTo(bd(netCost));
        assertThat(t.listedYears()).isEqualTo(listed);
    }

    private static void assertTaxEstimate(TaxEstimate e, long salaryDed, long salaryIncome, long soc, long basic,
                                          long taxableIt, long baseIt, long taxableRes, long residentTax, long cap) {
        assertThat(e.salaryDeduction()).isEqualByComparingTo(bd(salaryDed));
        assertThat(e.salaryIncome()).isEqualByComparingTo(bd(salaryIncome));
        assertThat(e.socialInsurance()).isEqualByComparingTo(bd(soc));
        assertThat(e.basicDeduction()).isEqualByComparingTo(bd(basic));
        assertThat(e.taxableIncomeTax()).isEqualByComparingTo(bd(taxableIt));
        assertThat(e.incomeTaxBase()).isEqualByComparingTo(bd(baseIt));
        assertThat(e.taxableResident()).isEqualByComparingTo(bd(taxableRes));
        assertThat(e.residentTax()).isEqualByComparingTo(bd(residentTax));
        assertThat(e.residentCreditCap()).isEqualByComparingTo(bd(cap));
    }

    // ------------------------------------------------------------------ tax estimate goldens (hand-computed)

    @Test
    void taxEstimate_income5M_matchesHandComputedGolden() {
        // 500万: 収入×20%+44万 = 144万 -> 給与所得356万; 社保 75万; 基礎控除 104万; 課税所得177万 -> 所得税 8.85万
        // 住民税: 課税所得 238万 -> 23.8万-2,500 = 235,500; 住民税側上限 = min(177万×5%, 97,500) = 88,500
        TaxEstimate e = TaxDeductionCalculator.estimateTax(
                input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 5_000_000, 2026, 4, false, true),
                fy2026());
        assertTaxEstimate(e, 1_440_000, 3_560_000, 750_000, 1_040_000, 1_770_000, 88_500, 2_380_000, 235_500, 88_500);
    }

    @Test
    void taxEstimate_income8M_matchesHandComputedGolden() {
        // 800万: 収入×10%+110万 = 190万 -> 給与所得610万; 社保 120万; 基礎控除 67万 (合計所得 655万以下); 課税所得423万
        // 所得税: 423万×20%-42.75万 = 418,500; 住民税課税所得 447万 -> 44.7万-2,500 = 444,500
        // 住民税側上限 = min(423万×5%=211,500, 97,500) = 97,500
        TaxEstimate e = TaxDeductionCalculator.estimateTax(
                input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 8_000_000, 2026, 4, false, true),
                fy2026());
        assertTaxEstimate(e, 1_900_000, 6_100_000, 1_200_000, 670_000, 4_230_000, 418_500, 4_470_000, 444_500, 97_500);
    }

    @Test
    void salaryDeductionApproximationNote_onlyBelow660万() {
        TaxDeductionResult low = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, true), zehNew());
        TaxDeductionResult high = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 8_000_000,
                2026, 4, false, true), zehNew());
        assertThat(low.assumptions().notes()).contains(TaxDeductionCalculator.NOTE_SALARY_DEDUCTION_APPROXIMATE);
        assertThat(high.assumptions().notes()).doesNotContain(TaxDeductionCalculator.NOTE_SALARY_DEDUCTION_APPROXIMATE);
    }

    // ------------------------------------------------------------------ full scenarios (python3 reference)

    @Test
    void zehNew_fullScenario_everyYearAndTotals() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, true), zehNew());
        assertThat(r.eligible()).isTrue();
        assertThat(r.rule().limitAmount()).isEqualByComparingTo(bd(35_000_000));
        assertThat(r.rule().childcareApplied()).isFalse();
        assertRows(r, GoldenRows.S1_ZEH_INCOME_6M);
        assertTotals(r, 2_288_100, 0, 13_301_672, 11_013_572, 13);
        assertThat(r.assumptions().estimatedTotalIncome()).isEqualByComparingTo(bd(4_360_000));
        assertThat(r.assumptions().estimatedIncomeTaxBase()).isEqualByComparingTo(bd(144_500));
        assertThat(r.assumptions().residentCapPerYear()).isEqualByComparingTo(bd(97_500));
    }

    @Test
    void zehNew_income5M_unclaimedRemainsAfterBothCredits() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 5_000_000,
                2026, 4, false, true), zehNew());
        assertRows(r, GoldenRows.S1B_ZEH_INCOME_5M);
        assertTotals(r, 2_184_400, 103_700, 13_301_672, 11_117_272, 13);
        assertThat(r.taxEstimate().taxableIncomeTax()).isEqualByComparingTo("1770000");
        assertThat(r.assumptions().estimatedIncomeTaxBase()).isEqualByComparingTo("88500");
        assertThat(r.assumptions().residentCapPerYear()).isEqualByComparingTo("88500");
    }

    @Test
    void zehNew_income8M_capFullyUsed() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 8_000_000,
                2026, 4, false, true), zehNew());
        assertRows(r, GoldenRows.S1C_ZEH_INCOME_8M);
        assertTotals(r, 2_288_100, 0, 13_301_672, 11_013_572, 13);
    }

    @Test
    void certifiedNew_childcareUplift_usesChildcareLimit() {
        TaxDeductionResult r = run(input(48_000_000, "1.0", 35, RepaymentMethod.EQUAL_PAYMENT, 8_000_000,
                2026, 4, true, true), certifiedNew());
        assertThat(r.rule().limitAmount()).isEqualByComparingTo(bd(50_000_000));
        assertThat(r.rule().childcareApplied()).isTrue();
        assertRows(r, GoldenRows.S2_CERTIFIED_CHILDCARE);
        assertTotals(r, 3_641_100, 0, 20_595_544, 16_954_444, 13);
    }

    @Test
    void certifiedNew_childcareButArea40s_noUplift() {
        TaxDeductionResult r = run(input(48_000_000, "1.0", 35, RepaymentMethod.EQUAL_PAYMENT, 8_000_000,
                2026, 4, true, false), certifiedNew());
        assertThat(r.rule().limitAmount()).isEqualByComparingTo(bd(45_000_000));
        assertThat(r.rule().childcareApplied()).isFalse();
        assertRows(r, GoldenRows.S2B_CERTIFIED_40SQM);
        assertTotals(r, 3_618_000, 0, 20_595_544, 16_977_544, 13);
    }

    @Test
    void zehNew_moveInDecember_firstYearHasNoPaymentsAndFullBalance() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 5_000_000,
                2026, 12, false, true), zehNew());
        assertThat(r.years().get(0).annualPayment()).isEqualByComparingTo(bd(0));
        assertThat(r.years().get(0).yearEndBalance()).isEqualByComparingTo(bd(30_000_000));
        assertRows(r, GoldenRows.S3_MOVEIN_DECEMBER);
        assertTotals(r, 2_206_600, 126_700, 12_601_584, 10_394_984, 13);
    }

    @Test
    void newOther_exemption_tenYearPeriodAndLimit() {
        TaxDeductionResult r = run(input(25_000_000, "1.5", 35, RepaymentMethod.EQUAL_PAYMENT, 5_000_000,
                2026, 6, false, true), newOtherExemption());
        assertThat(r.rule().conditionCode()).isEqualTo(ConditionCode.EXEMPTION);
        assertThat(r.rule().deductionYears()).isEqualTo(10);
        assertRows(r, GoldenRows.S4_NEW_OTHER_EXEMPTION);
        assertTotals(r, 1_396_100, 0, 8_726_244, 7_330_144, 10);
    }

    @Test
    void newEnergyStandard2028_exemption() {
        TaxDeductionResult r = run(input(25_000_000, "1.0", 35, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2028, 3, false, true), newEnergyExemption());
        assertRows(r, GoldenRows.S5_NEW_ENERGY_2028_EXEMPTION);
        assertTotals(r, 1_389_000, 0, 8_256_807, 6_867_807, 10);
    }

    @Test
    void usedOther_tenYearPeriod_unclaimedAccumulates() {
        TaxDeductionResult r = run(input(20_000_000, "0.8", 35, RepaymentMethod.EQUAL_PAYMENT, 4_000_000,
                2026, 1, false, true), usedOther());
        assertThat(r.rule().deductionYears()).isEqualTo(10);
        assertRows(r, GoldenRows.S6_USED_OTHER);
        assertTotals(r, 1_107_700, 98_800, 6_498_828, 5_391_128, 10);
    }

    @Test
    void loanShorterThanDeductionPeriod_listingStopsAfterRepaymentYear() {
        TaxDeductionResult r = run(input(30_000_000, "1.0", 10, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, true), zehNew());
        assertRows(r, GoldenRows.S7_LOAN_10Y);
        assertThat(r.years().get(r.years().size() - 1).yearEndBalance()).isEqualByComparingTo(bd(0));
        assertTotals(r, 1_032_100, 0, 31_537_483, 30_505_383, 11);
    }

    @Test
    void equalPrincipal_scenario() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PRINCIPAL, 6_000_000,
                2026, 4, false, true), zehNew());
        assertRows(r, GoldenRows.S8_EQUAL_PRINCIPAL);
        assertTotals(r, 2_208_700, 0, 14_597_494, 12_388_794, 13);
    }

    @Test
    void area40s_withIncomeUnder10M_isEligible() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, false), zehNew());
        assertThat(r.eligible()).isTrue();
        assertRows(r, GoldenRows.S9_40SQM_INCOME_6M);
        assertTotals(r, 2_288_100, 0, 13_301_672, 11_013_572, 13);
    }

    @Test
    void area40s_incomeLimitIsInclusive() {
        // Salary 11,950,000 less 1,950,000 = 10,000,000; one yen more exceeds the limit.
        TaxDeductionResult at = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT,
                11_950_000, 2026, 4, true, false), zehNew());
        TaxDeductionResult over = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT,
                11_950_001, 2026, 4, true, false), zehNew());
        assertThat(at.eligible()).isTrue();
        assertThat(at.rule().childcareApplied()).isFalse();
        assertThat(over.ineligibleReason()).isEqualTo(IneligibleReason.AREA_40S_INCOME_OVER_LIMIT);
    }

    // ------------------------------------------------------------------ ineligible paths

    @Test
    void areaUnder40AndUnconfirmedAreNotTreatedAsArea40s() {
        TaxDeductionInput base = input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT,
                6_000_000, 2026, 4, false, false);
        for (FloorAreaCategory area : List.of(FloorAreaCategory.UNDER_40, FloorAreaCategory.UNKNOWN)) {
            TaxDeductionInput in = new TaxDeductionInput(base.principal(), base.annualRatePercent(), base.years(),
                    base.method(), base.annualIncome(), base.socialInsuranceRatePercent(), base.moveInYear(),
                    base.moveInMonth(), base.childcareHousehold(), area);
            assertThat(run(in, zehNew()).ineligibleReason()).isEqualTo(area == FloorAreaCategory.UNDER_40
                    ? IneligibleReason.AREA_UNDER_40 : IneligibleReason.AREA_UNCONFIRMED);
        }
    }

    @Test
    void noRule_isIneligibleWithoutDetails() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, true), null);
        assertThat(r.eligible()).isFalse();
        assertThat(r.ineligibleReason()).isEqualTo(IneligibleReason.NOT_ELIGIBLE_BY_RULE);
        assertThat(r.rule()).isNull();
        assertThat(r.years()).isEmpty();
        assertThat(r.totals()).isNull();
        assertThat(r.assumptions()).isNull();
    }

    @Test
    void loanUnderTenYears_isIneligible() {
        TaxDeductionResult r = run(input(30_000_000, "1.2", 9, RepaymentMethod.EQUAL_PAYMENT, 6_000_000,
                2026, 4, false, true), zehNew());
        assertThat(r.eligible()).isFalse();
        assertThat(r.ineligibleReason()).isEqualTo(IneligibleReason.LOAN_TERM_UNDER_10Y);
        assertThat(r.rule()).isNotNull();
        assertThat(r.years()).isEmpty();
        assertThat(r.totals()).isNull();
    }

    @Test
    void estimatedIncomeOver20M_isIneligible() {
        // 2,300万円 - 給与所得控除195万円 = 合計所得 2,105万円 > 2,000万円
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 23_000_000,
                2026, 4, false, true), zehNew());
        assertThat(r.eligible()).isFalse();
        assertThat(r.ineligibleReason()).isEqualTo(IneligibleReason.INCOME_OVER_20M);
        assertThat(r.years()).isEmpty();
    }

    @Test
    void area40s_withIncomeOver10M_isIneligible() {
        // 1,200万円 - 195万円 = 合計所得 1,005万円 > 1,000万円
        TaxDeductionResult r = run(input(30_000_000, "1.2", 35, RepaymentMethod.EQUAL_PAYMENT, 12_000_000,
                2026, 4, false, false), zehNew());
        assertThat(r.eligible()).isFalse();
        assertThat(r.ineligibleReason()).isEqualTo(IneligibleReason.AREA_40S_INCOME_OVER_LIMIT);
    }
}
