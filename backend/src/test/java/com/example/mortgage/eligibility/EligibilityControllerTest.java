package com.example.mortgage.eligibility;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EligibilityController.class)
@Import(EligibilityService.class)
class EligibilityControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/eligibility";

    @Autowired
    private MockMvc mockMvc;

    private static final String VALID = """
            {"annualIncome": 6000000, "otherAnnualRepayments": 0, "annualRatePercent": 1.0,
             "years": 35, "screeningRatePercent": 3.5}
            """;

    @Test
    void validRequest_returns200WithExpectedShape() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(35))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(2100000))
                .andExpect(jsonPath("$.availableAnnualRepayment").value(2100000))
                .andExpect(jsonPath("$.availableMonthlyRepayment").value(175000))
                .andExpect(jsonPath("$.atScreeningRate.ratePercent").value(3.5))
                .andExpect(jsonPath("$.atScreeningRate.maxPrincipal").value(42340000))
                .andExpect(jsonPath("$.atScreeningRate.monthlyPayment").value(174987))
                .andExpect(jsonPath("$.atActualRate.ratePercent").value(1.0))
                .andExpect(jsonPath("$.atActualRate.maxPrincipal").value(61990000))
                .andExpect(jsonPath("$.atActualRate.monthlyPayment").value(174989));
    }

    @Test
    void defaults_otherIsZeroAndScreeningRateIs3Point5() throws Exception {
        String body = """
                {"annualIncome": 6000000, "annualRatePercent": 1.0, "years": 35}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableAnnualRepayment").value(2100000))
                .andExpect(jsonPath("$.atScreeningRate.ratePercent").value(3.5))
                .andExpect(jsonPath("$.atScreeningRate.maxPrincipal").value(42340000));
    }

    @Test
    void zeroIncome_returns400() throws Exception {
        String body = VALID.replace("6000000", "0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'annualIncome')]").isNotEmpty());
    }

    @Test
    void negativeOtherRepayments_returns400() throws Exception {
        String body = VALID.replace("\"otherAnnualRepayments\": 0", "\"otherAnnualRepayments\": -1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'otherAnnualRepayments')]").isNotEmpty());
    }

    @Test
    void rateOutOfRange_returns400() throws Exception {
        String body = VALID.replace("\"annualRatePercent\": 1.0", "\"annualRatePercent\": 20.1")
                .replace("\"screeningRatePercent\": 3.5", "\"screeningRatePercent\": -0.1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'annualRatePercent')]").isNotEmpty())
                .andExpect(jsonPath("$.errors[?(@.field == 'screeningRatePercent')]").isNotEmpty());
    }

    @Test
    void yearsOutOfRange_returns400() throws Exception {
        String body = VALID.replace("\"years\": 35", "\"years\": 51");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());

        String zero = VALID.replace("\"years\": 35", "\"years\": 0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(zero))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());
    }

    private static String body(String mode, String partnerIncome, String extra) {
        return "{\"annualIncome\": 3000000, \"annualRatePercent\": 1.0, \"years\": 35, \"mode\": \"" + mode + "\""
                + (partnerIncome == null ? "" : ", \"partnerAnnualIncome\": " + partnerIncome)
                + extra + "}";
    }

    @Test
    void backwardCompatible_noModeField_isSingleWithNullPersonsAndEmptyNotes() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("SINGLE"))
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(35))
                .andExpect(jsonPath("$.persons").value(nullValue()))
                .andExpect(jsonPath("$.notes").isEmpty());
    }

    @Test
    void singleIgnoresPartnerFields() throws Exception {
        String single = body("SINGLE", "2000000", ", \"partnerOtherAnnualRepayments\": 1000000");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(single))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(30))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(900000))
                .andExpect(jsonPath("$.persons").value(nullValue()))
                .andExpect(jsonPath("$.notes").isEmpty());
    }

    @Test
    void jointDebt_straddlesThreshold_limit35_andNotes() throws Exception {
        String req = body("JOINT_DEBT", "2000000", "");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(req))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("JOINT_DEBT"))
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(35))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(1750000))
                .andExpect(jsonPath("$.availableMonthlyRepayment").value(145833))
                .andExpect(jsonPath("$.atScreeningRate.maxPrincipal").value(35280000))
                .andExpect(jsonPath("$.atScreeningRate.monthlyPayment").value(145809))
                .andExpect(jsonPath("$.atActualRate.maxPrincipal").value(51660000))
                .andExpect(jsonPath("$.atActualRate.monthlyPayment").value(145829))
                .andExpect(jsonPath("$.persons").value(nullValue()))
                .andExpect(jsonPath("$.notes[0]").value("INCOME_COMBINED_PROVISIONAL"))
                .andExpect(jsonPath("$.notes.length()").value(1));
    }

    @Test
    void jointGuarantee_defaultCountIs50_roundsDown() throws Exception {
        String req = body("JOINT_GUARANTEE", "2000001", "");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(req))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(35))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(1400000))
                .andExpect(jsonPath("$.availableMonthlyRepayment").value(116666))
                .andExpect(jsonPath("$.atScreeningRate.maxPrincipal").value(28220000))
                .andExpect(jsonPath("$.atActualRate.monthlyPayment").value(116640))
                .andExpect(jsonPath("$.persons").value(nullValue()))
                .andExpect(jsonPath("$.notes[0]").value("INCOME_COMBINED_PROVISIONAL"))
                .andExpect(jsonPath("$.notes[1]").value("PARTNER_INCOME_RATIO_ASSUMED"));
    }

    @Test
    void jointGuarantee_count0_and100() throws Exception {
        String zero = body("JOINT_GUARANTEE", "2000001", ", \"partnerIncomeCountPercent\": 0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(zero))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(30))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(900000));

        String full = body("JOINT_GUARANTEE", "2000001", ", \"partnerIncomeCountPercent\": 100");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(full))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(35))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(1750000));
    }

    @Test
    void pairLoan_sumsPerPerson_limitNull_personsNonNull() throws Exception {
        String req = body("PAIR_LOAN", "2000000", "");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(req))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("PAIR_LOAN"))
                .andExpect(jsonPath("$.burdenRatioLimitPercent").value(nullValue()))
                .andExpect(jsonPath("$.maxAnnualRepayment").value(1500000))
                .andExpect(jsonPath("$.availableMonthlyRepayment").value(125000))
                .andExpect(jsonPath("$.atScreeningRate.maxPrincipal").value(30230000))
                .andExpect(jsonPath("$.atScreeningRate.monthlyPayment").value(124938))
                .andExpect(jsonPath("$.atActualRate.maxPrincipal").value(44270000))
                .andExpect(jsonPath("$.atActualRate.monthlyPayment").value(124968))
                .andExpect(jsonPath("$.persons.length()").value(2))
                .andExpect(jsonPath("$.persons[0].role").value("A"))
                .andExpect(jsonPath("$.persons[0].burdenRatioLimitPercent").value(30))
                .andExpect(jsonPath("$.persons[0].availableMonthlyRepayment").value(75000))
                .andExpect(jsonPath("$.persons[0].atScreeningRate.maxPrincipal").value(18140000))
                .andExpect(jsonPath("$.persons[0].atActualRate.monthlyPayment").value(74975))
                .andExpect(jsonPath("$.persons[1].role").value("B"))
                .andExpect(jsonPath("$.persons[1].burdenRatioLimitPercent").value(30))
                .andExpect(jsonPath("$.persons[1].availableMonthlyRepayment").value(50000))
                .andExpect(jsonPath("$.persons[1].atScreeningRate.maxPrincipal").value(12090000))
                .andExpect(jsonPath("$.persons[1].atActualRate.maxPrincipal").value(17710000))
                .andExpect(jsonPath("$.notes[0]").value("EACH_PERSON_SCREENED_SEPARATELY"));
    }

    @Test
    void partnerIncomeMissingForNonSingle_returns400() throws Exception {
        for (String mode : new String[]{"PAIR_LOAN", "JOINT_DEBT", "JOINT_GUARANTEE"}) {
            mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body(mode, null, "")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[?(@.message == 'partnerAnnualIncome is required unless mode is SINGLE')]").isNotEmpty());
        }
    }

    @Test
    void partnerBoundsAndCountRange_returns400() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(body("PAIR_LOAN", "0", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'partnerAnnualIncome')]").isNotEmpty());

        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(body("PAIR_LOAN", "2000000", ", \"partnerOtherAnnualRepayments\": -1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'partnerOtherAnnualRepayments')]").isNotEmpty());

        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(body("JOINT_GUARANTEE", "2000000", ", \"partnerIncomeCountPercent\": 101")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'partnerIncomeCountPercent')]").isNotEmpty());
    }

    @Test
    void unknownMode_returns400() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(body("TRIPLE_LOAN", "2000000", "")))
                .andExpect(status().isBadRequest());
    }
}
