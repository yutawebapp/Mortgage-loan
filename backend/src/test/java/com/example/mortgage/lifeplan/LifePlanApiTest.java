package com.example.mortgage.lifeplan;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end: controller -> service -> MyBatis (real PostgreSQL with Flyway V1..V6) -> domain.
 * Docker is required (no silent skip). Numbers are the python3 reference values (tmp/lifeplan_expected.py).
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class LifePlanApiTest {

    private static final String ENDPOINT = "/api/v1/simulations/life-plan";

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

    /** Valid body as raw JSON values, so single fields can be overridden. The sample of the validation run. */
    private static Map<String, String> validFields() {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("currentAge", "35");
        f.put("retireAge", "65");
        f.put("pensionStartAge", "65");
        f.put("lifeEndAge", "95");
        f.put("annualTakeHomeIncome", "6000000");
        f.put("incomeGrowthPercent", "0");
        f.put("retirementAnnualIncome", "2400000");
        f.put("monthlyLivingCost", "200000");
        f.put("retirementMonthlyLivingCost", "220000");
        f.put("savings", "5000000");
        f.put("savingsReturnPercent", "0");
        f.put("upfrontPayment", "0");
        f.put("loanPrincipal", "40000000");
        f.put("annualRatePercent", "1.2");
        f.put("years", "35");
        f.put("method", "\"EQUAL_PAYMENT\"");
        f.put("monthlyHousingCost", "25000");
        f.put("annualHousingTax", "120000");
        f.put("children", "[{\"age\": 3, \"schoolPlan\": \"ALL_PUBLIC\", \"university\": \"PRIVATE\"}]");
        return f;
    }

    private static String body(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder("{");
        fields.forEach((k, v) -> {
            if (sb.length() > 1) {
                sb.append(',');
            }
            sb.append('"').append(k).append("\":").append(v);
        });
        return sb.append('}').toString();
    }

    private static String with(String field, String rawValue) {
        Map<String, String> f = validFields();
        f.put(field, rawValue);
        return body(f);
    }

    private static String without(String field) {
        Map<String, String> f = validFields();
        f.remove(field);
        return body(f);
    }

    private ResultActions postJson(String json) throws Exception {
        return mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void validSample_successShapeAndNumbers() throws Exception {
        postJson(body(validFields()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years.length()").value(61))
                .andExpect(jsonPath("$.years[0].age").value(35))
                .andExpect(jsonPath("$.years[0].income").value(6000000))
                .andExpect(jsonPath("$.years[0].livingCost").value(2400000))
                .andExpect(jsonPath("$.years[0].loanPayment").value(1400172))
                .andExpect(jsonPath("$.years[0].loanBalance").value(39074751))
                .andExpect(jsonPath("$.years[0].housingCost").value(420000))
                .andExpect(jsonPath("$.years[0].educationCost").value(149591))
                .andExpect(jsonPath("$.years[0].netCashFlow").value(1630237))
                .andExpect(jsonPath("$.years[0].savingsClosing").value(6630237))
                .andExpect(jsonPath("$.years[15].educationCost").value(1507647))
                .andExpect(jsonPath("$.years[60].age").value(95))
                .andExpect(jsonPath("$.years[60].income").value(2400000))
                .andExpect(jsonPath("$.years[60].livingCost").value(2640000))
                .andExpect(jsonPath("$.years[60].savingsClosing").value(19773174))
                .andExpect(jsonPath("$.summary.firstShortfallAge").isEmpty())
                .andExpect(jsonPath("$.summary.minSavings").value(6630237))
                .andExpect(jsonPath("$.summary.minSavingsAge").value(35))
                .andExpect(jsonPath("$.summary.savingsAtRetirement").value(47234000))
                .andExpect(jsonPath("$.summary.savingsAtEnd").value(19773174))
                .andExpect(jsonPath("$.summary.loanPayoffAge").value(70))
                .andExpect(jsonPath("$.summary.totalEducationCost").value(11160840))
                .andExpect(jsonPath("$.summary.peakEducationCost").value(1507647))
                .andExpect(jsonPath("$.summary.peakEducationAge").value(50))
                .andExpect(jsonPath("$.summary.totalLoanPayment").value(49005986))
                .andExpect(jsonPath("$.sources.length()").value(2))
                .andExpect(jsonPath("$.sources[0].url").value(
                        "https://www.mext.go.jp/content/20260116-mxt_chousa01-000039333_3.pdf"))
                .andExpect(jsonPath("$.sources[0].verifiedOn").value("2026-11-19"))
                .andExpect(jsonPath("$.notes", containsInAnyOrder(
                        "TODAYS_YEN_NO_INFLATION", "INCOME_AND_COSTS_ARE_USER_INPUTS",
                        "EDUCATION_AVERAGES_NOT_INDIVIDUAL", "UNIVERSITY_TUITION_ONLY",
                        "SIMPLIFIED_EVEN_YEARLY_MODEL", "AGES_ARE_SCHOOL_YEAR_AGES",
                        "PENSION_AMOUNT_IS_USER_INPUT")));
    }

    @Test
    void noChildrenNoLoan_emptySourcesAndNullOptionals() throws Exception {
        String json = """
                {"currentAge": 40, "retireAge": 42, "lifeEndAge": 43, "annualTakeHomeIncome": 6000000,
                 "monthlyLivingCost": 200000, "retirementMonthlyLivingCost": 220000, "savings": 5000000}
                """;
        postJson(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years.length()").value(4))
                .andExpect(jsonPath("$.years[3].savingsClosing").value(6920000))
                .andExpect(jsonPath("$.summary.loanPayoffAge").isEmpty())
                .andExpect(jsonPath("$.summary.peakEducationAge").isEmpty())
                .andExpect(jsonPath("$.summary.peakEducationCost").value(0))
                .andExpect(jsonPath("$.sources").isArray())
                .andExpect(jsonPath("$.sources.length()").value(0))
                .andExpect(jsonPath("$.notes.length()").value(7));
    }

    @Test
    void defaultsApplied_whenOptionalFieldsOmitted() throws Exception {
        String json = """
                {"currentAge": 40, "annualTakeHomeIncome": 6000000,
                 "monthlyLivingCost": 200000, "retirementMonthlyLivingCost": 220000, "savings": 5000000}
                """;
        postJson(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years.length()").value(56))
                .andExpect(jsonPath("$.years[0].age").value(40))
                .andExpect(jsonPath("$.years[55].age").value(95));
    }

    @Test
    void boundaryValues_accepted() throws Exception {
        Map<String, String> f = validFields();
        f.put("currentAge", "18");
        f.put("retireAge", "80");
        f.put("pensionStartAge", "50");
        f.put("lifeEndAge", "100");
        f.put("incomeGrowthPercent", "5");
        f.put("savingsReturnPercent", "10");
        f.put("savings", "10000000000");
        f.put("annualRatePercent", "20");
        f.put("years", "50");
        f.put("loanPrincipal", "1000000000");
        f.put("children", "[{\"age\": 0, \"schoolPlan\": \"ALL_PRIVATE\"}, {\"age\": 21, \"schoolPlan\": \"ALL_PUBLIC\", \"university\": \"NONE\"}]");
        postJson(body(f)).andExpect(status().isOk())
                .andExpect(jsonPath("$.years.length()").value(83));
    }

    @Test
    void boundaryValues_lowerAndUpperAccepted_forZeroAmounts() throws Exception {
        Map<String, String> f = validFields();
        f.put("loanPrincipal", "0");
        f.put("annualRatePercent", "0");
        f.put("years", "1");
        f.put("retirementAnnualIncome", "0");
        f.put("monthlyLivingCost", "10000000");
        f.put("annualHousingTax", "0");
        f.put("children", "[]");
        postJson(body(f)).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.loanPayoffAge").isEmpty())
                .andExpect(jsonPath("$.summary.totalLoanPayment").value(0))
                .andExpect(jsonPath("$.sources.length()").value(0));
    }

    /** Every field's bounds: each value must be rejected with 400 ProblemDetail. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "currentAge|17", "currentAge|71", "currentAge|null",
            "retireAge|17", "retireAge|81",
            "pensionStartAge|49", "pensionStartAge|81",
            "lifeEndAge|17", "lifeEndAge|101",
            "annualTakeHomeIncome|-1", "annualTakeHomeIncome|1000000001", "annualTakeHomeIncome|null",
            "incomeGrowthPercent|-0.1", "incomeGrowthPercent|5.1",
            "retirementAnnualIncome|-1", "retirementAnnualIncome|1000000001",
            "monthlyLivingCost|-1", "monthlyLivingCost|10000001", "monthlyLivingCost|null",
            "retirementMonthlyLivingCost|-1", "retirementMonthlyLivingCost|10000001", "retirementMonthlyLivingCost|null",
            "savings|-1", "savings|10000000001", "savings|null",
            "savingsReturnPercent|-0.1", "savingsReturnPercent|10.1",
            "upfrontPayment|-1", "upfrontPayment|1000000001",
            "loanPrincipal|-1", "loanPrincipal|1000000001",
            "annualRatePercent|-0.1", "annualRatePercent|20.1",
            "years|0", "years|51",
            "monthlyHousingCost|-1", "monthlyHousingCost|10000001",
            "annualHousingTax|-1", "annualHousingTax|10000001",
            "method|\"FOO\"",
    })
    void fieldBounds_rejected(String field, String rawValue) throws Exception {
        postJson(with(field, rawValue)).andExpect(status().isBadRequest());
    }

    /** Nested child validation and the 0..3 list size. */
    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "[{\"age\": 3, \"schoolPlan\": \"ALL_PUBLIC\"}, {\"age\": 4, \"schoolPlan\": \"ALL_PUBLIC\"}, {\"age\": 5, \"schoolPlan\": \"ALL_PUBLIC\"}, {\"age\": 6, \"schoolPlan\": \"ALL_PUBLIC\"}]",
            "[{\"age\": -1, \"schoolPlan\": \"ALL_PUBLIC\"}]",
            "[{\"age\": 22, \"schoolPlan\": \"ALL_PUBLIC\"}]",
            "[{\"schoolPlan\": \"ALL_PUBLIC\"}]",
            "[{\"age\": 3}]",
            "[{\"age\": 3, \"schoolPlan\": \"FOO\"}]",
            "[{\"age\": 3, \"schoolPlan\": \"ALL_PUBLIC\", \"university\": \"FOO\"}]",
            "[{\"age\": 3, \"schoolPlan\": \"ALL_PUBLIC\", \"university\": \"NONE\"}, null]",
    })
    void childrenValidation_rejected(String rawChildren) throws Exception {
        postJson(with("children", rawChildren)).andExpect(status().isBadRequest());
    }

    @Test
    void childrenWithAgeBoundaries_accepted() throws Exception {
        postJson(with("children", "[{\"age\": 0, \"schoolPlan\": \"ALL_PUBLIC\"}, {\"age\": 21, \"schoolPlan\": \"ALL_PRIVATE\", \"university\": \"NATIONAL\"}]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sources.length()").value(2));
    }

    @Test
    void loanPrincipalPositive_requiresRateAndYears() throws Exception {
        postJson(without("annualRatePercent")).andExpect(status().isBadRequest());
        postJson(without("years")).andExpect(status().isBadRequest());
    }

    @Test
    void loanPrincipalZero_doesNotRequireRateOrYears() throws Exception {
        Map<String, String> f = validFields();
        f.put("loanPrincipal", "0");
        f.remove("annualRatePercent");
        f.remove("years");
        postJson(body(f)).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.loanPayoffAge").isEmpty());
    }

    @Test
    void ageOrder_rejected() throws Exception {
        postJson(with("retireAge", "35")).andExpect(status().isBadRequest());          // retire == current
        postJson(with("retireAge", "30")).andExpect(status().isBadRequest());          // retire < current
        postJson(with("lifeEndAge", "65")).andExpect(status().isBadRequest());         // life end == retire
        postJson(with("currentAge", "70")).andExpect(status().isBadRequest());         // default retire 65 <= 70
    }

    @Test
    void defaultRetireAge_isSixtyFiveWhenOmitted_andOrderingIsChecked() throws Exception {
        postJson(without("retireAge")).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.savingsAtRetirement").value(47234000));
    }

    @Test
    void shortfall_reportsFirstShortfallAge() throws Exception {
        String json = """
                {"currentAge": 40, "retireAge": 44, "lifeEndAge": 47, "annualTakeHomeIncome": 3000000,
                 "monthlyLivingCost": 300000, "retirementMonthlyLivingCost": 300000, "savings": 1000000}
                """;
        postJson(json).andExpect(status().isOk())
                .andExpect(jsonPath("$.summary.firstShortfallAge").value(41))
                .andExpect(jsonPath("$.summary.minSavings").value(-15800000))
                .andExpect(jsonPath("$.notes", hasItem("SIMPLIFIED_EVEN_YEARLY_MODEL")));
    }
}
