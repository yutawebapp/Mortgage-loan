package com.example.mortgage.ratescenario;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RateScenarioController.class)
@Import(RateScenarioService.class)
class RateScenarioControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/rate-scenarios";

    @Autowired
    private MockMvc mockMvc;

    private static final String VALID = """
            {"principal": 30000000, "annualRatePercent": 0.5, "years": 35, "method": "EQUAL_PAYMENT",
             "riseAfterYears": 5, "risePoints": [1.0]}
            """;

    @Test
    void validRequest_returns200WithExpectedShape() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseline.risePoints").value(0))
                .andExpect(jsonPath("$.baseline.totalInterest").value(2707747))
                .andExpect(jsonPath("$.baseline.extraInterestVsBaseline").value(0))
                .andExpect(jsonPath("$.baseline.monthlyPayments.length()").value(420))
                .andExpect(jsonPath("$.scenarios.length()").value(1))
                .andExpect(jsonPath("$.scenarios[0].risePoints").value(1.0))
                .andExpect(jsonPath("$.scenarios[0].rateAfterPercent").value(1.5))
                .andExpect(jsonPath("$.scenarios[0].monthlyPaymentBefore").value(77876))
                .andExpect(jsonPath("$.scenarios[0].monthlyPaymentAfter").value(89831))
                .andExpect(jsonPath("$.scenarios[0].monthlyPaymentIncrease").value(11955))
                .andExpect(jsonPath("$.scenarios[0].totalPayment").value(37011608))
                .andExpect(jsonPath("$.scenarios[0].totalInterest").value(7011608))
                .andExpect(jsonPath("$.scenarios[0].extraInterestVsBaseline").value(4303861))
                .andExpect(jsonPath("$.scenarios[0].monthlyPayments.length()").value(420));
    }

    @Test
    void risePointsOmitted_defaultsToThreeScenarios() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 0.5, "years": 35, "method": "EQUAL_PAYMENT",
                 "riseAfterYears": 5}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenarios.length()").value(3))
                .andExpect(jsonPath("$.scenarios[0].risePoints").value(0.5))
                .andExpect(jsonPath("$.scenarios[1].risePoints").value(1.0))
                .andExpect(jsonPath("$.scenarios[2].risePoints").value(2.0))
                .andExpect(jsonPath("$.scenarios[2].monthlyPaymentAfter").value(102845));
    }

    @Test
    void riseAfterYearsZero_returns400() throws Exception {
        String body = VALID.replace("\"riseAfterYears\": 5", "\"riseAfterYears\": 0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'riseAfterYears')]").isNotEmpty());
    }

    @Test
    void riseAfterYearsNotBeforeEnd_returns400() throws Exception {
        String equal = VALID.replace("\"riseAfterYears\": 5", "\"riseAfterYears\": 35");
        String over = VALID.replace("\"riseAfterYears\": 5", "\"riseAfterYears\": 36");
        for (String body : new String[] {equal, over}) {
            mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[?(@.message == 'must be less than years')]").isNotEmpty());
        }
    }

    @Test
    void yearsOne_returns400() throws Exception {
        String body = VALID.replace("\"years\": 35", "\"years\": 1").replace("\"riseAfterYears\": 5", "\"riseAfterYears\": 1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());
    }

    @Test
    void risePointsInvalid_returns400() throws Exception {
        String[] bodies = {
                VALID.replace("[1.0]", "[]"),
                VALID.replace("[1.0]", "[0.5, 1.0, 1.5, 2.0, 2.5, 3.0]"),
                VALID.replace("[1.0]", "[0]"),
                VALID.replace("[1.0]", "[-1.0]"),
                VALID.replace("[1.0]", "[10.5]"),
                VALID.replace("[1.0]", "[null]"),
        };
        for (String body : bodies) {
            mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors[?(@.field =~ /risePoints.*/)]").isNotEmpty());
        }
    }

    @Test
    void startPlusRiseOver20_returns400() throws Exception {
        String body = VALID.replace("\"annualRatePercent\": 0.5", "\"annualRatePercent\": 19.5");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.message == 'annualRatePercent plus each risePoints value must be less than or equal to 20')]").isNotEmpty());
    }

    @Test
    void startPlusRiseExactly20_isAccepted() throws Exception {
        String body = VALID.replace("\"annualRatePercent\": 0.5", "\"annualRatePercent\": 19.0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scenarios[0].rateAfterPercent").value(20.0));
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        String body = VALID.replace("EQUAL_PAYMENT", "FOO");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
