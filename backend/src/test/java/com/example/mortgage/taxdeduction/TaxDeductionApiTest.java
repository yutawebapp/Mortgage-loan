package com.example.mortgage.taxdeduction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
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

    // ------------------------------------------------------------------ two-person modes (PAIR_LOAN / JOINT_DEBT)

    @Autowired
    private ObjectMapper objectMapper;

    private static final String SHARE_QA = "https://www.nta.go.jp/law/shitsugi/shotoku/06/36.htm";
    private static final String SHARE_1213 = "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1213.htm";

    /** NEW / ZEH, 2026-04, 40,000,000 / 1.2% / 35y EQUAL_PAYMENT; A 6,000,000, B 4,000,000 (50/50). */
    private static String zehPair(String mode) {
        return """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 40000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000,
                 "mode": "%s", "partnerAnnualIncome": 4000000}
                """.formatted(mode);
    }

    private JsonNode estimate(String body) throws Exception {
        String json = mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(json);
    }

    @Test
    void pairLoan_5050_differentIncomes_perPersonAndHouseholdNumbers() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(zehPair("PAIR_LOAN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("PAIR_LOAN"))
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.ineligibleReason").isEmpty())
                .andExpect(jsonPath("$.rule.limitAmount").value(35000000))
                .andExpect(jsonPath("$.persons.length()").value(2))
                // person A: income 6M, principal 20M, no unclaimed
                .andExpect(jsonPath("$.persons[0].role").value("A"))
                .andExpect(jsonPath("$.persons[0].principal").value(20000000))
                .andExpect(jsonPath("$.persons[0].limitAmount").value(35000000))
                .andExpect(jsonPath("$.persons[0].eligible").value(true))
                .andExpect(jsonPath("$.persons[0].ineligibleReason").isEmpty())
                .andExpect(jsonPath("$.persons[0].years.length()").value(13))
                .andExpect(jsonPath("$.persons[0].years[0].incomeTaxBefore").value(147500))
                .andExpect(jsonPath("$.persons[0].years[0].unclaimed").value(0))
                .andExpect(jsonPath("$.persons[0].totals.totalDeduction").value(1525100))
                .andExpect(jsonPath("$.persons[0].totals.totalUnclaimed").value(0))
                .andExpect(jsonPath("$.persons[0].totals.totalPayment").value(8867680))
                .andExpect(jsonPath("$.persons[0].totals.netCost").value(7342580))
                // person B: income 4M, tax too small -> unclaimed
                .andExpect(jsonPath("$.persons[1].role").value("B"))
                .andExpect(jsonPath("$.persons[1].principal").value(20000000))
                .andExpect(jsonPath("$.persons[1].limitAmount").value(35000000))
                .andExpect(jsonPath("$.persons[1].years[0].incomeTaxBefore").value(57100))
                .andExpect(jsonPath("$.persons[1].years[0].residentTaxCredit").value(56000))
                .andExpect(jsonPath("$.persons[1].years[0].unclaimed").value(25800))
                .andExpect(jsonPath("$.persons[1].totals.totalDeduction").value(1412400))
                .andExpect(jsonPath("$.persons[1].totals.totalUnclaimed").value(112700))
                .andExpect(jsonPath("$.persons[1].totals.netCost").value(7455280))
                // household = sums
                .andExpect(jsonPath("$.years.length()").value(13))
                .andExpect(jsonPath("$.years[0].year").value(2026))
                .andExpect(jsonPath("$.years[0].ordinal").value(1))
                .andExpect(jsonPath("$.years[0].annualPayment").value(933440))
                .andExpect(jsonPath("$.years[0].yearEndBalance").value(39384408))
                .andExpect(jsonPath("$.years[0].deductionCap").value(275600))
                .andExpect(jsonPath("$.years[0].totalDeduction").value(249800))
                .andExpect(jsonPath("$.years[0].unclaimed").value(25800))
                .andExpect(jsonPath("$.totals.totalDeduction").value(2937500))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(112700))
                .andExpect(jsonPath("$.totals.totalPayment").value(17735360))
                .andExpect(jsonPath("$.totals.netCost").value(14797860))
                .andExpect(jsonPath("$.totals.listedYears").value(13))
                // assumptions: A's figures, notes and sources extended
                .andExpect(jsonPath("$.assumptions.annualIncome").value(6000000))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("PAIR_OR_JOINT_SHARE_EQUALS_OWNERSHIP")))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("LIMIT_APPLIED_PER_PERSON")))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("HOUSEHOLD_FLAGS_PER_PERSON")))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("SALARY_DEDUCTION_APPROXIMATE")))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", hasItem(SHARE_QA)))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", hasItem(SHARE_1213)));
    }

    @Test
    void jointDebt_sameNumbersAsPairLoan() throws Exception {
        JsonNode pair = estimate(zehPair("PAIR_LOAN"));
        JsonNode joint = estimate(zehPair("JOINT_DEBT"));
        assertThat(joint.get("mode").asText()).isEqualTo("JOINT_DEBT");
        assertThat(joint.get("totals")).isEqualTo(pair.get("totals"));
        assertThat(joint.get("years")).isEqualTo(pair.get("years"));
        assertThat(joint.get("persons")).isEqualTo(pair.get("persons"));
    }

    @Test
    void pairLoan_householdEqualsSumOfTwoSingleResults() throws Exception {
        String singleA = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 20000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000}
                """;
        String singleB = singleA.replace("6000000", "4000000");
        JsonNode a = estimate(singleA);
        JsonNode b = estimate(singleB);
        JsonNode household = estimate(zehPair("PAIR_LOAN"));

        assertThat(household.get("totals").get("totalDeduction").asLong())
                .isEqualTo(a.get("totals").get("totalDeduction").asLong()
                        + b.get("totals").get("totalDeduction").asLong());
        assertThat(household.get("totals").get("totalUnclaimed").asLong())
                .isEqualTo(a.get("totals").get("totalUnclaimed").asLong()
                        + b.get("totals").get("totalUnclaimed").asLong());
        assertThat(household.get("totals").get("totalPayment").asLong())
                .isEqualTo(a.get("totals").get("totalPayment").asLong()
                        + b.get("totals").get("totalPayment").asLong());
        assertThat(household.get("years").size()).isEqualTo(a.get("years").size());
        for (int i = 0; i < household.get("years").size(); i++) {
            JsonNode h = household.get("years").get(i);
            JsonNode ya = a.get("years").get(i);
            JsonNode yb = b.get("years").get(i);
            assertThat(h.get("year").asInt()).isEqualTo(ya.get("year").asInt());
            assertThat(h.get("totalDeduction").asLong())
                    .isEqualTo(ya.get("totalDeduction").asLong() + yb.get("totalDeduction").asLong());
            assertThat(h.get("yearEndBalance").asLong())
                    .isEqualTo(ya.get("yearEndBalance").asLong() + yb.get("yearEndBalance").asLong());
        }
    }

    @Test
    void pairLoan_uneven70_30_partnerTaxTooSmall_unclaimedOnPartnerOnly() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 50000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 8000000,
                 "mode": "JOINT_DEBT", "partnerAnnualIncome": 2500000, "shareAPercent": 70}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.persons[0].principal").value(35000000))
                .andExpect(jsonPath("$.persons[1].principal").value(15000000))
                .andExpect(jsonPath("$.persons[0].totals.totalUnclaimed").value(0))
                .andExpect(jsonPath("$.persons[0].totals.totalDeduction").value(2669400))
                .andExpect(jsonPath("$.persons[1].years[0].incomeTaxBefore").value(13000))
                .andExpect(jsonPath("$.persons[1].years[0].incomeTaxCredit").value(12750))
                .andExpect(jsonPath("$.persons[1].years[0].unclaimed").value(77800))
                .andExpect(jsonPath("$.persons[1].totals.totalDeduction").value(331500))
                .andExpect(jsonPath("$.persons[1].totals.totalUnclaimed").value(812200))
                .andExpect(jsonPath("$.totals.totalDeduction").value(3000900))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(812200))
                .andExpect(jsonPath("$.totals.totalPayment").value(22169352))
                .andExpect(jsonPath("$.totals.netCost").value(19168452));
    }

    @Test
    void pairLoan_partnerIneligible_area40s_aloneEligible() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "floorAreaOver50": false,
                 "principal": 40000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000,
                 "mode": "PAIR_LOAN", "partnerAnnualIncome": 12000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.persons[0].eligible").value(true))
                .andExpect(jsonPath("$.persons[1].eligible").value(false))
                .andExpect(jsonPath("$.persons[1].ineligibleReason").value("AREA_40S_INCOME_OVER_LIMIT"))
                .andExpect(jsonPath("$.persons[1].years.length()").value(0))
                .andExpect(jsonPath("$.persons[1].totals").isEmpty())
                .andExpect(jsonPath("$.totals.totalDeduction").value(1525100))
                .andExpect(jsonPath("$.years.length()").value(13));
    }

    @Test
    void pairLoan_partnerIncomeOver20M_aloneEligible() throws Exception {
        String body = zehPair("PAIR_LOAN").replace("\"partnerAnnualIncome\": 4000000",
                "\"partnerAnnualIncome\": 23000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.persons[1].eligible").value(false))
                .andExpect(jsonPath("$.persons[1].ineligibleReason").value("INCOME_OVER_20M"))
                .andExpect(jsonPath("$.totals.totalDeduction").value(1525100));
    }

    @Test
    void pairLoan_bothIneligible_householdIneligibleWithAReason() throws Exception {
        String body = zehPair("PAIR_LOAN").replace("\"annualIncome\": 6000000", "\"annualIncome\": 23000000")
                .replace("\"partnerAnnualIncome\": 4000000", "\"partnerAnnualIncome\": 23000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false))
                .andExpect(jsonPath("$.ineligibleReason").value("INCOME_OVER_20M"))
                .andExpect(jsonPath("$.years.length()").value(0))
                .andExpect(jsonPath("$.totals").isEmpty())
                .andExpect(jsonPath("$.persons[0].ineligibleReason").value("INCOME_OVER_20M"))
                .andExpect(jsonPath("$.persons[1].ineligibleReason").value("INCOME_OVER_20M"));
    }

    @Test
    void pairLoan_childcareForPersonAOnly_limitDiffersPerPerson() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "CERTIFIED", "moveInYear": 2026, "moveInMonth": 4,
                 "childcareHousehold": true, "floorAreaOver50": true,
                 "principal": 120000000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 8000000,
                 "mode": "PAIR_LOAN", "partnerAnnualIncome": 8000000, "partnerChildcareHousehold": false}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.persons[0].limitAmount").value(50000000))
                .andExpect(jsonPath("$.persons[1].limitAmount").value(45000000))
                .andExpect(jsonPath("$.persons[0].years[0].deductionCap").value(350000))
                .andExpect(jsonPath("$.persons[1].years[0].deductionCap").value(315000))
                .andExpect(jsonPath("$.persons[0].totals.totalDeduction").value(4325100))
                .andExpect(jsonPath("$.persons[1].totals.totalDeduction").value(4037600))
                .andExpect(jsonPath("$.totals.totalDeduction").value(8362700))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(0))
                .andExpect(jsonPath("$.totals.netCost").value(43126084))
                .andExpect(jsonPath("$.rule.childcareApplied").value(true));
    }

    @Test
    void pairLoan_oddPrincipal_roundsPersonAHalfUp() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 30000001, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000,
                 "mode": "PAIR_LOAN", "partnerAnnualIncome": 5000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.persons[0].principal").value(15000001))
                .andExpect(jsonPath("$.persons[1].principal").value(15000000))
                .andExpect(jsonPath("$.persons[0].years[0].yearEndBalance").value(14769154))
                .andExpect(jsonPath("$.persons[1].years[0].yearEndBalance").value(14769153))
                .andExpect(jsonPath("$.totals.totalDeduction").value(2287400))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(0));
    }

    @Test
    void jointGuarantee_isSingleNumbers_partnerIgnored_withNote() throws Exception {
        String body = zehPair("JOINT_GUARANTEE");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("JOINT_GUARANTEE"))
                .andExpect(jsonPath("$.persons").isEmpty())
                .andExpect(jsonPath("$.rule.limitAmount").value(35000000))
                .andExpect(jsonPath("$.totals.totalDeduction").value(2948700))
                .andExpect(jsonPath("$.totals.totalUnclaimed").value(15200))
                .andExpect(jsonPath("$.totals.totalPayment").value(17735512))
                .andExpect(jsonPath("$.totals.netCost").value(14786812))
                .andExpect(jsonPath("$.assumptions.annualIncome").value(6000000))
                .andExpect(jsonPath("$.assumptions.notes", hasItem("PARTNER_NOT_DEBTOR_NO_DEDUCTION")));
    }

    @Test
    void jointGuarantee_matchesSingleResponseExactly() throws Exception {
        String single = zehPair("SINGLE").replace(", \"partnerAnnualIncome\": 4000000", "");
        JsonNode s = estimate(single);
        JsonNode jg = estimate(zehPair("JOINT_GUARANTEE"));
        assertThat(jg.get("years")).isEqualTo(s.get("years"));
        assertThat(jg.get("totals")).isEqualTo(s.get("totals"));
        assertThat(jg.get("rule")).isEqualTo(s.get("rule"));
        assertThat(jg.get("persons").isNull()).isTrue();
    }

    @Test
    void singleMode_echoesModeAndHasNoPersons_andNoNewNotes() throws Exception {
        String body = """
                {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
                 "principal": 30000000, "annualRatePercent": 1.2, "years": 35,
                 "method": "EQUAL_PAYMENT", "annualIncome": 6000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("SINGLE"))
                .andExpect(jsonPath("$.persons").isEmpty())
                .andExpect(jsonPath("$.assumptions.notes", containsInAnyOrder(
                        "INCOME_ESTIMATE", "SINGLE_NO_DEPENDANTS", "LAW_2026_ASSUMED_FOR_ALL_YEARS",
                        "PREPAYMENT_NOT_CONSIDERED", "ADJUSTMENT_DEDUCTION_ASSUMED", "SALARY_DEDUCTION_APPROXIMATE")))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", hasItem(
                        "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm")))
                .andExpect(jsonPath("$.assumptions.taxParameterSources", not(hasItem(SHARE_QA))));
    }
}
