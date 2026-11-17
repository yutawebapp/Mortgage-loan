package com.example.mortgage.taxdeduction;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaxDeductionController.class)
class TaxDeductionControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/tax-deduction";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaxDeductionService taxDeductionService;

    private static final String VALID = """
            {"housingType": "NEW", "energyClass": "ZEH", "moveInYear": 2026, "moveInMonth": 4,
             "principal": 30000000, "annualRatePercent": 1.2, "years": 35,
             "method": "EQUAL_PAYMENT", "annualIncome": 6000000}
            """;

    private void assertBadRequestOn(String body, String field) throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").isNotEmpty());
        verifyNoInteractions(taxDeductionService);
    }

    @Test
    void validRequest_isAcceptedAndDelegated() throws Exception {
        given(taxDeductionService.estimate(any())).willReturn(new TaxDeductionResponse(false,
                "NOT_ELIGIBLE_BY_RULE", null, List.of(), null, null));
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(false));
    }

    @Test
    void moveInYearBelowRange_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"moveInYear\": 2026", "\"moveInYear\": 2025"), "moveInYear");
    }

    @Test
    void moveInYearAboveRange_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"moveInYear\": 2026", "\"moveInYear\": 2031"), "moveInYear");
    }

    @Test
    void moveInMonthZero_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"moveInMonth\": 4", "\"moveInMonth\": 0"), "moveInMonth");
    }

    @Test
    void moveInMonthThirteen_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"moveInMonth\": 4", "\"moveInMonth\": 13"), "moveInMonth");
    }

    @Test
    void annualIncomeZero_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"annualIncome\": 6000000", "\"annualIncome\": 0"), "annualIncome");
    }

    @Test
    void principalZero_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"principal\": 30000000", "\"principal\": 0"), "principal");
    }

    @Test
    void principalAboveMax_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"principal\": 30000000", "\"principal\": 1000000001"), "principal");
    }

    @Test
    void rateOutOfRange_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"annualRatePercent\": 1.2", "\"annualRatePercent\": 21"), "annualRatePercent");
    }

    @Test
    void yearsOutOfRange_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"years\": 35", "\"years\": 0"), "years");
        assertBadRequestOn(VALID.replace("\"years\": 35", "\"years\": 51"), "years");
    }

    @Test
    void socialInsuranceRateAboveMax_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"method\": \"EQUAL_PAYMENT\"",
                "\"method\": \"EQUAL_PAYMENT\", \"socialInsuranceRatePercent\": 31"), "socialInsuranceRatePercent");
    }

    @Test
    void unknownHousingType_returns400() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.replace("\"NEW\"", "\"FOO\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(taxDeductionService);
    }

    @Test
    void unknownEnergyClass_returns400() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.replace("\"ZEH\"", "\"PLATINUM\"")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(taxDeductionService);
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON)
                        .content(VALID.replace("EQUAL_PAYMENT", "BONUS")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(taxDeductionService);
    }

    @Test
    void missingHousingType_returns400() throws Exception {
        assertBadRequestOn(VALID.replace("\"housingType\": \"NEW\",", ""), "housingType");
    }
}
