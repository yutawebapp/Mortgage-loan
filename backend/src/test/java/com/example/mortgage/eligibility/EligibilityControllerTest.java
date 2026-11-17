package com.example.mortgage.eligibility;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

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
}
