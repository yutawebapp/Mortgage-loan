package com.example.mortgage.taxdeduction;

import com.example.mortgage.taxdeduction.domain.ConditionCode;
import com.example.mortgage.taxdeduction.domain.DeductionRule;
import com.example.mortgage.taxdeduction.domain.EnergyClass;
import com.example.mortgage.taxdeduction.domain.HousingType;
import com.example.mortgage.taxdeduction.domain.TaxParameters;
import com.example.mortgage.taxdeduction.domain.TaxParameters.Bracket;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs Flyway (V1..V5) and the MyBatis mapper against a real PostgreSQL.
 * Docker is required: this test does NOT use disabledWithoutDocker, so it fails instead of silently skipping.
 */
@Testcontainers
@SpringBootTest
class TaxDeductionMapperTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String MLIT_URL = "https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf";

    @Autowired
    private TaxDeductionMapper mapper;

    @Autowired
    private TaxParameterLoader loader;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbc;

    /** Expected seed: limit, childcare limit, deduction years. Null = no rule row. */
    private record Expected(long limit, long limitChildcare, int deductionYears) {
    }

    /** Independent expectation written from the 住宅ローン減税 table (not read back from the DB). */
    private static Expected expected(HousingType h, EnergyClass e, ConditionCode c, int year) {
        if (c == ConditionCode.EXEMPTION) {
            if (h != HousingType.NEW) {
                return null;
            }
            if (e == EnergyClass.ENERGY_STANDARD) {
                return year >= 2028 ? new Expected(20_000_000, 20_000_000, 10) : null;
            }
            if (e == EnergyClass.OTHER) {
                return new Expected(20_000_000, 20_000_000, 10);
            }
            return null;
        }
        if (h == HousingType.NEW) {
            return switch (e) {
                case CERTIFIED -> new Expected(45_000_000, 50_000_000, 13);
                case ZEH -> new Expected(35_000_000, 45_000_000, 13);
                case ENERGY_STANDARD -> year <= 2027 ? new Expected(20_000_000, 30_000_000, 13) : null;
                case OTHER -> null;
            };
        }
        if (h == HousingType.USED) {
            return switch (e) {
                case CERTIFIED, ZEH -> new Expected(35_000_000, 45_000_000, 13);
                case ENERGY_STANDARD -> new Expected(20_000_000, 30_000_000, 13);
                case OTHER -> new Expected(20_000_000, 20_000_000, 10);
            };
        }
        // RESALE
        return switch (e) {
            case CERTIFIED -> new Expected(45_000_000, 50_000_000, 13);
            case ZEH -> new Expected(35_000_000, 45_000_000, 13);
            case ENERGY_STANDARD -> new Expected(20_000_000, 30_000_000, 13);
            case OTHER -> new Expected(20_000_000, 20_000_000, 10);
        };
    }

    @Test
    void ruleLookup_matchesSeedForEveryHousingEnergyConditionYearCombination() {
        int checked = 0;
        int present = 0;
        for (HousingType h : HousingType.values()) {
            for (EnergyClass e : EnergyClass.values()) {
                for (ConditionCode c : ConditionCode.values()) {
                    for (int year = 2026; year <= 2030; year++) {
                        DeductionRule rule = mapper.findDeductionRule(h, e, c, year);
                        Expected exp = expected(h, e, c, year);
                        String label = h + "/" + e + "/" + c + "/" + year;
                        checked++;
                        if (exp == null) {
                            assertThat(rule).as(label).isNull();
                            continue;
                        }
                        present++;
                        assertThat(rule).as(label).isNotNull();
                        assertThat(rule.housingType()).as(label).isEqualTo(h);
                        assertThat(rule.energyClass()).as(label).isEqualTo(e);
                        assertThat(rule.conditionCode()).as(label).isEqualTo(c);
                        assertThat(rule.limitAmount()).as(label).isEqualByComparingTo(BigDecimal.valueOf(exp.limit()));
                        assertThat(rule.limitAmountChildcare()).as(label)
                                .isEqualByComparingTo(BigDecimal.valueOf(exp.limitChildcare()));
                        assertThat(rule.deductionYears()).as(label).isEqualTo(exp.deductionYears());
                        assertThat(rule.ratePercent()).as(label).isEqualByComparingTo("0.7");
                        assertThat(rule.sourceUrl()).as(label).isEqualTo(MLIT_URL);
                        assertThat(rule.verifiedOn()).as(label).isEqualTo(LocalDate.of(2026, 11, 17));
                    }
                }
            }
        }
        assertThat(checked).isEqualTo(3 * 4 * 2 * 5);
        // NEW standard 12 (certified 5 + ZEH 5 + energy 2) + NEW exemption 8 (energy 3 + other 5)
        // + USED standard 20 + RESALE standard 20 = 60; USED/RESALE exemption rows do not exist.
        assertThat(present).isEqualTo(60);
    }

    @Test
    void ruleLookup_outsideSeededMoveInYears_isNull() {
        assertThat(mapper.findDeductionRule(HousingType.NEW, EnergyClass.CERTIFIED, ConditionCode.STANDARD, 2025)).isNull();
        assertThat(mapper.findDeductionRule(HousingType.NEW, EnergyClass.CERTIFIED, ConditionCode.STANDARD, 2031)).isNull();
    }

    @Test
    void notEligibleCombinations_haveNoRow() {
        // New houses that fall outside both the standard and the exemption rules.
        assertThat(mapper.findDeductionRule(HousingType.NEW, EnergyClass.OTHER, ConditionCode.STANDARD, 2026)).isNull();
        assertThat(mapper.findDeductionRule(HousingType.NEW, EnergyClass.ENERGY_STANDARD, ConditionCode.STANDARD, 2028)).isNull();
        assertThat(mapper.findDeductionRule(HousingType.NEW, EnergyClass.ENERGY_STANDARD, ConditionCode.EXEMPTION, 2026)).isNull();
        // Exemptions exist only for new houses.
        assertThat(mapper.findDeductionRule(HousingType.USED, EnergyClass.OTHER, ConditionCode.EXEMPTION, 2026)).isNull();
        assertThat(mapper.findDeductionRule(HousingType.RESALE, EnergyClass.ZEH, ConditionCode.EXEMPTION, 2027)).isNull();
    }

    @Test
    void taxParameters_2026_loadedFromDbEqualFixture() {
        TaxParameters p = loader.load(2026);

        assertThat(p.salaryDeduction()).hasSize(5);
        assertBrackets(p.salaryDeduction(), new Bracket[] {
                br(2_200_000, "0", 740_000),
                br(3_600_000, "30", 80_000),
                br(6_600_000, "20", 440_000),
                br(8_500_000, "10", 1_100_000),
                br(null, "0", 1_950_000)});
        assertBrackets(p.basicDeduction(), new Bracket[] {
                br(4_890_000, "0", 1_040_000),
                br(6_550_000, "0", 670_000),
                br(23_500_000, "0", 620_000)});
        assertBrackets(p.incomeTax(), new Bracket[] {
                br(1_949_000, "5", 0),
                br(3_299_000, "10", -97_500),
                br(6_949_000, "20", -427_500),
                br(8_999_000, "23", -636_000),
                br(17_999_000, "33", -1_536_000),
                br(39_999_000, "40", -2_796_000),
                br(null, "45", -4_796_000)});

        assertThat(p.reconstructionRatePercent()).isEqualByComparingTo("2.1");
        assertThat(p.residentTaxRatePercent()).isEqualByComparingTo("10");
        assertThat(p.residentBasicDeduction()).isEqualByComparingTo("430000");
        assertThat(p.residentAdjustmentDeduction()).isEqualByComparingTo("2500");
        assertThat(p.residentCreditRatePercent()).isEqualByComparingTo("5");
        assertThat(p.residentCreditCap()).isEqualByComparingTo("97500");
        assertThat(p.incomeLimit()).isEqualByComparingTo("20000000");
        assertThat(p.area40sIncomeLimit()).isEqualByComparingTo("10000000");
        assertThat(p.minLoanYears()).isEqualTo(10);
        assertThat(p.verifiedOn()).isEqualTo(LocalDate.of(2026, 11, 17));
        assertThat(p.sourceUrls()).containsExactlyInAnyOrder(
                "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm",
                "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm",
                "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm",
                "https://www.soumu.go.jp/main_content/001075462.pdf",
                "https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/090929.html",
                "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1211-1.htm",
                "https://www.mlit.go.jp/jutakukentiku/house/zeisei_index2.html",
                "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk2_000023.html");
    }

    @Test
    void taxParameters_sameSeedCoversEveryMoveInYear2026To2030() {
        for (int year = 2026; year <= 2030; year++) {
            TaxParameters p = loader.load(year);
            assertThat(p.salaryDeduction()).as("year %d", year).hasSize(5);
            assertThat(p.incomeTax()).as("year %d", year).hasSize(7);
        }
    }

    @Test
    void taxParameters_outsideSeededYears_failsLoudly() {
        assertThatThrownBy(() -> loader.load(2025)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> loader.load(2031)).isInstanceOf(IllegalStateException.class);
    }

    private static final String RULE_INSERT = "INSERT INTO housing_loan_deduction_rules (housing_type, energy_class,"
            + " condition_code, move_in_year_from, move_in_year_to, limit_amount, limit_amount_childcare,"
            + " deduction_years, rate_percent, source_url, verified_on)"
            + " VALUES ('USED', 'OTHER', 'STANDARD', ?, ?, 20000000, 20000000, 10, 0.70, 'https://example.invalid', DATE '2026-01-01')";

    @Test
    void overlappingYearRanges_areRejectedByTheDatabase() {
        // existing: USED/OTHER/STANDARD 2026-2030
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(RULE_INSERT, 2030, 2032))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(RULE_INSERT, 2027, 2028))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO tax_scalar_parameters (param_key, year_from, year_to, param_value, source_url, verified_on)"
                        + " VALUES ('RESIDENT_TAX_RATE_PERCENT', 2030, 2031, 10, 'https://example.invalid', DATE '2026-01-01')"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO tax_brackets (table_code, year_from, year_to, sort_order, upper_limit, rate_percent, amount,"
                        + " source_url, verified_on) VALUES ('INCOME_TAX', 2029, 2035, 1, 1949000, 5, 0,"
                        + " 'https://example.invalid', DATE '2026-01-01')"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void adjacentYearRange_isAcceptedAndDifferentKeyIsIndependent() {
        try {
            assertThat(jdbc.update(RULE_INSERT, 2031, 2032)).isEqualTo(1);
            assertThat(mapper.findDeductionRule(HousingType.USED, EnergyClass.OTHER, ConditionCode.STANDARD, 2031))
                    .isNotNull();
            assertThat(mapper.findDeductionRule(HousingType.USED, EnergyClass.OTHER, ConditionCode.STANDARD, 2030)
                    .moveInYearTo()).isEqualTo(2030);
        } finally {
            jdbc.update("DELETE FROM housing_loan_deduction_rules WHERE source_url = 'https://example.invalid'");
        }
    }

    private static Bracket br(Integer upper, String rate, long amount) {
        return new Bracket(upper == null ? null : BigDecimal.valueOf(upper), new BigDecimal(rate),
                BigDecimal.valueOf(amount));
    }

    private static void assertBrackets(List<Bracket> actual, Bracket[] expected) {
        assertThat(actual).hasSize(expected.length);
        for (int i = 0; i < expected.length; i++) {
            Bracket a = actual.get(i);
            Bracket e = expected[i];
            if (e.upperLimit() == null) {
                assertThat(a.upperLimit()).as("bracket %d upper", i).isNull();
            } else {
                assertThat(a.upperLimit()).as("bracket %d upper", i).isEqualByComparingTo(e.upperLimit());
            }
            assertThat(a.ratePercent()).as("bracket %d rate", i).isEqualByComparingTo(e.ratePercent());
            assertThat(a.amount()).as("bracket %d amount", i).isEqualByComparingTo(e.amount());
        }
    }
}
