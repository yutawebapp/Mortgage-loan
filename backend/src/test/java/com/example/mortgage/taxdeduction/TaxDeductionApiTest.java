package com.example.mortgage.taxdeduction;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end: controller -> service -> MyBatis (real PostgreSQL with Flyway V1..V5) -> domain.
 * Docker is required (no silent skip). Expected numbers are the python3 reference values.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class TaxDeductionApiTest {

    private static final String ENDPOINT = "/api/v1/simulations/tax-deduction";

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    /** NEW / ZEH, 2026-04, 30,000,000 / 1.2% / 35y EQUAL_PAYMENT, income 6,000,000 (socialInsurance default 15). */
    private static final String ZEH_INCOME_6M = """
            {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
             "principal": 30000000, "annualRatePercent": 1.2, "years": 35,
             "method": "EQUAL_PAYMENT", "annualIncome": 6000000}
            """;

    @Test
    void zehNew_successShape_andNumbers() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(ZEH_INCOME_6M))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.ineligibleReason").isEmpty())
                .andExpect(jsonPath("$.rule.limitAmount").value(35000000))
                .andExpect(jsonPath("$.rule.deductionYears").value(13))
                .andExpect(jsonPath("$.rule.ratePercent").value(0.7))
                .andExpect(jsonPath("$.rule.childcareApplied").value(false))
                .andExpect(jsonPath("$.rule.conditionCode").value("STANDARD"))
                .andExpect(jsonPath("$.rule.sourceUrl").value(
                        "https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf"))
                .andExpect(jsonPath("$.rule.verifiedOn").value("2026-11-17"))
                .andExpect(jsonPath("$.years.length()").value(13))
                .andExpect(jsonPath("$.years[0].year").value(2026))
                .andExpect(jsonPath("$.years[0].ordinal").value(1))
                .andExpect(jsonPath("$.years[0].annualPayment").value(700088))
                .andExpect(jsonPath("$.years[0].yearEndBalance").value(29538298))
                .andExpect(jsonPath("$.years[0].deductionBase").value(29538298))
                .andExpect(jsonPath("$.years[0].deductionCap").value(206700))
                .andExpect(jsonPath("$.years[0].incomeTaxBefore").value(147500))
                .andExpect(jsonPath("$.years[0].incomeTaxAfter").value(0))
                .andExpect(jsonPath("$.years[0].residentTaxEstimate").value(300500))
                .andExpect(jsonPath("$.years[0].incomeTaxCredit").value(144500))
                .andExpect(jsonPath("$.years[0].residentTaxCredit").value(62200))
                .andExpect(jsonPath("$.years[0].totalDeduction").value(206700))
                .andExpect(jsonPath("$.years[0].unclaimed").value(0))
                .andExpect(jsonPath("$.years[12].year").value(2038))
                .andExpect(jsonPath("$.years[12].yearEndBalance").value(20564062))
                .andExpect(jsonPath("$.years[12].totalDeduction").value(143900))
                .andExpect(jsonPath("$.totals.totalDeduction").value(2288100))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(0))
                .andExpect(jsonPath("$.totals.totalPayment").value(13301672))
                .andExpect(jsonPath("$.totals.netCost").value(11013572))
                .andExpect(jsonPath("$.totals.listedYears").value(13))
                .andExpect(jsonPath("$.assumptions.annualIncome").value(6000000))
                .andExpect(jsonPath("$.assumptions.socialInsuranceRatePercent").value(15))
                .andExpect(jsonPath("$.assumptions.estimatedTotalIncome").value(4360000))
                .andExpect(jsonPath("$.assumptions.estimatedIncomeTaxBase").value(144500))
                .andExpect(jsonPath("$.assumptions.residentCapPerYear").value(97500))
                .andExpect(jsonPath("$.assumptions.taxParameterVerifiedOn").value("2026-11-17"))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", hasItem(
                        "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm")))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("LAW_2026_ASSUMED_FOR_ALL_YEARS")))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("SINGLE_NO_DEPENDANTS")))
                .andExpect(jsonPath("$.assumptions.notes", containsInAnyOrder(
                        "INCOME_ESTIMATE", "SINGLE_NO_DEPENDANTS", "LAW_2026_ASSUMED_FOR_ALL_YEARS",
                        "PREPAYMENT_NOT_CONSIDERED", "ADJUSTMENT_DEDUCTION_ASSUMED", "SALARY_DEDUCTION_APPROXIMATE")))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", hasItem(
                        "https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/090929.html")));
    }

    @Test
    void income5M_unclaimedAndGoldenTaxFigures() throws Exception {
        String body = ZEH_INCOME_6M.replace("6000000", "5000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years[0].incomeTaxBefore").value(90300))
                .andExpect(jsonPath("$.years[0].residentTaxEstimate").value(235500))
                .andExpect(jsonPath("$.years[0].residentTaxCredit").value(88500))
                .andExpect(jsonPath("$.years[0].unclaimed").value(29700))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(103700))
                .andExpect(jsonPath("$.assumptions.estimatedIncomeTaxBase").value(88500))
                .andExpect(jsonPath("$.assumptions.residentCapPerYear").value(88500));
    }

    @Test
    void income8M_capFullyUsed_withGoldenTaxFigures() throws Exception {
        String body = ZEH_INCOME_6M.replace("6000000", "8000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years[0].incomeTaxBefore").value(427200))
                .andExpect(jsonPath("$.years[0].incomeTaxAfter").value(216200))
                .andExpect(jsonPath("$.years[0].residentTaxEstimate").value(444500))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(0))
                .andExpect(jsonPath("$.assumptions.estimatedTotalIncome").value(6100000))
                .andExpect(jsonPath("$.assumptions.estimatedIncomeTaxBase").value(418500))
                .andExpect(jsonPath("$.assumptions.residentCapPerYear").value(97500));
    }

    @Test
    void childcareUplift_usesChildcareLimit() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "CERTIFIED", "moveInYear": 2026, "moveInMonth": 4,
                 "childcareHousehold": true, "floorAreaOver50": true,
                 "principal": 48000000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 8000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rule.limitAmount").value(50000000))
                .andExpect(jsonPath("$.rule.childcareApplied").value(true))
                .andExpect(jsonPath("$.years[0].deductionCap").value(330600))
                .andExpect(jsonPath("$.totals.totalDeduction").value(3641100));
    }

    @Test
    void newOther_withoutLegacyException_isIneligibleByRule() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "OTHER", "moveInYear": 2026, "moveInMonth": 6,
                 "principal": 25000000, "annualRatePercent": 1.5, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 5000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.ineligibleReason").value("NOT_ELIGIBLE_BY_RULE"))
                .andExpect(jsonPath("$.rule").isEmpty())
                .andExpect(jsonPath("$.years.length()").value(0))
                .andExpect(jsonPath("$.totals").isEmpty())
                .andExpect(jsonPath("$.assumptions").isEmpty());
    }

    @Test
    void newOther_withLegacyException_usesExemptionRule() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "OTHER", "moveInYear": 2026, "moveInMonth": 6,
                 "legacyException": true,
                 "principal": 25000000, "annualRatePercent": 1.5, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 5000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.rule.conditionCode").value("EXEMPTION"))
                .andExpect(jsonPath("$.rule.limitAmount").value(20000000))
                .andExpect(jsonPath("$.rule.deductionYears").value(10))
                .andExpect(jsonPath("$.years.length()").value(10))
                .andExpect(jsonPath("$.years[0].annualPayment").value(459276))
                .andExpect(jsonPath("$.totals.totalDeduction").value(1396100))
                .andExpect(jsonPath("$.totals.netCost").value(7330144));
    }

    @Test
    void usedResale_noExemptionRow_isIneligibleByRule() throws Exception {
        String body = """
                {"housingType": "USED", "energyClass": "ZEH", "moveInYear": 2027, "moveInMonth": 2,
                 "legacyException": true,
                 "principal": 25000000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 5000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.ineligibleReason").value("NOT_ELIGIBLE_BY_RULE"));
    }

    @Test
    void incomeOver20M_isIneligibleWithReason() throws Exception {
        String body = ZEH_INCOME_6M.replace("6000000", "23000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.ineligibleReason").value("INCOME_OVER_20M"))
                .andExpect(jsonPath("$.years.length()").value(0))
                .andExpect(jsonPath("$.totals").isEmpty());
    }

    @Test
    void omittedOptionalFields_useDefaults() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 30000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rule.childcareApplied").value(false))
                .andExpect(jsonPath("$.assumptions.socialInsuranceRatePercent").value(15))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("INCOME_ESTIMATE")));
    }
}
