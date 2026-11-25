package com.example.mortgage.lifeplan;

import com.example.mortgage.lifeplan.domain.LifePlanParameters;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.EducationFee;
import com.example.mortgage.lifeplan.domain.LifePlanParameters.UniversityFee;
import com.example.mortgage.lifeplan.domain.SchoolType;
import com.example.mortgage.lifeplan.domain.UniversityChoice;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Runs Flyway (V1..V6) and the life-plan mapper against a real PostgreSQL.
 * Docker is required: this test does NOT use disabledWithoutDocker, so it fails instead of silently skipping.
 * Expected seed values are typed from 文部科学省 令和5年度子供の学習費調査 表2 and the university sources (not read back).
 */
@Testcontainers
@SpringBootTest
class LifePlanMapperTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    private static final String EDU_URL = "https://www.mext.go.jp/content/20260116-mxt_chousa01-000039333_3.pdf";
    private static final LocalDate VERIFIED = LocalDate.of(2026, 11, 19);

    /** age 3..17 for PUBLIC then PRIVATE (education seed, 令和5年度 表2). */
    private static final long[] PUBLIC = {149591, 166969, 215617, 395394, 297710, 318916, 359778, 392755,
            432708, 545239, 473569, 607325, 700240, 580958, 503697};
    private static final long[] PRIVATE = {335350, 323783, 378954, 2165693, 1493663, 1548734, 1638939, 1736557,
            1874114, 1869839, 1281980, 1519770, 1392712, 1150924, 977725};

    @Autowired
    private LifePlanMapper mapper;

    @Autowired
    private LifePlanParameterLoader loader;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void educationCosts_areExactlyTheSeededRows() {
        List<EducationCostRow> rows = mapper.findEducationCosts();
        assertThat(rows).hasSize(30);

        Map<String, EducationCostRow> byKey = new HashMap<>();
        for (EducationCostRow r : rows) {
            byKey.put(r.schoolType() + ":" + r.childAge(), r);
        }
        for (int i = 0; i < 15; i++) {
            int age = i + 3;
            assertEducation(byKey.get("PUBLIC:" + age), age, PUBLIC[i]);
            assertEducation(byKey.get("PRIVATE:" + age), age, PRIVATE[i]);
        }
    }

    private static void assertEducation(EducationCostRow r, int age, long amount) {
        assertThat(r).as("row for age %d", age).isNotNull();
        assertThat(r.childAge()).isEqualTo(age);
        assertThat(r.annualAmount()).isEqualTo(amount);
        assertThat(r.sourceUrl()).isEqualTo(EDU_URL);
        assertThat(r.sourceLabel()).contains("令和5年度子供の学習費調査");
        assertThat(r.verifiedOn()).isEqualTo(VERIFIED);
    }

    @Test
    void universityCosts_areExactlyTheSeededRows() {
        List<UniversityCostRow> rows = mapper.findUniversityCosts();
        assertThat(rows).hasSize(2);

        UniversityCostRow national = rows.stream().filter(r -> r.universityType().equals("NATIONAL")).findFirst().orElseThrow();
        assertThat(national.firstYearAmount()).isEqualTo(817_800L);
        assertThat(national.laterYearAmount()).isEqualTo(535_800L);
        assertThat(national.sourceUrl()).isEqualTo("https://www.mext.go.jp/content/20251226-mxt_sigakujo-000046463_4.pdf");
        assertThat(national.verifiedOn()).isEqualTo(VERIFIED);

        UniversityCostRow priv = rows.stream().filter(r -> r.universityType().equals("PRIVATE")).findFirst().orElseThrow();
        assertThat(priv.firstYearAmount()).isEqualTo(1_507_647L);
        assertThat(priv.laterYearAmount()).isEqualTo(1_170_909L);
        assertThat(priv.sourceUrl()).isEqualTo("https://www.mext.go.jp/a_menu/koutou/shinkou/07021403/1412031_00006.htm");
        assertThat(priv.verifiedOn()).isEqualTo(VERIFIED);
    }

    @Test
    void loader_buildsCompleteParameters() {
        LifePlanParameters p = loader.load();

        assertThat(p.education()).containsOnlyKeys(SchoolType.PUBLIC, SchoolType.PRIVATE);
        for (int i = 0; i < 15; i++) {
            int age = i + 3;
            EducationFee pub = p.education().get(SchoolType.PUBLIC).get(age);
            EducationFee pri = p.education().get(SchoolType.PRIVATE).get(age);
            assertThat(pub.annualAmount()).isEqualTo(PUBLIC[i]);
            assertThat(pri.annualAmount()).isEqualTo(PRIVATE[i]);
            assertThat(pub.source().url()).isEqualTo(EDU_URL);
        }
        UniversityFee national = p.university().get(UniversityChoice.NATIONAL);
        assertThat(national.firstYearAmount()).isEqualTo(817_800L);
        assertThat(national.laterYearAmount()).isEqualTo(535_800L);
        UniversityFee priv = p.university().get(UniversityChoice.PRIVATE);
        assertThat(priv.firstYearAmount()).isEqualTo(1_507_647L);
        assertThat(priv.laterYearAmount()).isEqualTo(1_170_909L);
        assertThat(priv.source().verifiedOn()).isEqualTo(VERIFIED);
    }

    // ------------------------------------------------------------------ constraints

    private static final String EDU_INSERT = """
            INSERT INTO education_costs (child_age, school_type, annual_amount, fiscal_year, source_label,
                                         source_url, verified_on)
            VALUES (?, ?, ?, 2023, 'test', 'https://example.test/', DATE '2026-11-19')
            """;

    private static final String UNI_INSERT = """
            INSERT INTO university_costs (university_type, first_year_amount, later_year_amount, fiscal_year,
                                          source_label, source_url, verified_on)
            VALUES (?, ?, ?, 2030, 'test', 'https://example.test/', DATE '2026-11-19')
            """;

    @Test
    void educationCosts_rejectAgeOutsideSchoolRange() {
        assertThatThrownBy(() -> jdbc.update(EDU_INSERT, 2, "PUBLIC", 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(EDU_INSERT, 18, "PUBLIC", 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void educationCosts_rejectUnknownSchoolTypeAndNegativeAmount() {
        assertThatThrownBy(() -> jdbc.update(EDU_INSERT, 6, "NONE", 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(EDU_INSERT, 6, "PUBLIC", -1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void educationCosts_rejectDuplicateAgeTypeYear() {
        // Seeded (age 3, PUBLIC, 2023) already exists.
        assertThatThrownBy(() -> jdbc.update(EDU_INSERT, 3, "PUBLIC", 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void universityCosts_rejectUnknownTypeNegativeAmountAndDuplicate() {
        assertThatThrownBy(() -> jdbc.update(UNI_INSERT, "NONE", 1L, 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update(UNI_INSERT, "PRIVATE", -1L, 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
        // Seeded (NATIONAL, 2025) already exists.
        assertThatThrownBy(() -> jdbc.update(UNI_INSERT.replace("2030", "2025"), "NATIONAL", 1L, 1L))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
