package com.example.mortgage.refinance;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RefinanceController.class)
@Import(RefinanceService.class)
class RefinanceControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/refinance";

    @Autowired
    private MockMvc mockMvc;

    private static final String VALID = """
            {"remainingBalance": 25000000, "currentAnnualRatePercent": 2.0, "remainingYears": 25,
             "newAnnualRatePercent": 0.8, "newYears": 25, "method": "EQUAL_PAYMENT",
             "refinanceCosts": 500000}
            """;

    @Test
    void validRequest_returns200WithExpectedShape() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current.monthlyPayment").value(105964))
                .andExpect(jsonPath("$.current.totalPayment").value(31789034))
                .andExpect(jsonPath("$.current.totalInterest").value(6789034))
                .andExpect(jsonPath("$.refinanced.monthlyPayment").value(91972))
                .andExpect(jsonPath("$.refinanced.totalPayment").value(27591574))
                .andExpect(jsonPath("$.refinanced.totalInterest").value(2591574))
                .andExpect(jsonPath("$.refinanceCosts").value(500000))
                .andExpect(jsonPath("$.monthlySaving").value(13992))
                .andExpect(jsonPath("$.totalSaving").value(3697460))
                .andExpect(jsonPath("$.breakEvenMonth").value(36))
                .andExpect(jsonPath("$.cumulativeSaving.length()").value(300))
                .andExpect(jsonPath("$.cumulativeSaving[0].month").value(1))
                .andExpect(jsonPath("$.cumulativeSaving[0].net").value(-486008))
                .andExpect(jsonPath("$.cumulativeSaving[299].net").value(3697460));
    }

    @Test
    void costsOmitted_defaultsToZero() throws Exception {
        String body = """
                {"remainingBalance": 25000000, "currentAnnualRatePercent": 2.0, "remainingYears": 25,
                 "newAnnualRatePercent": 0.8, "newYears": 25, "method": "EQUAL_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refinanceCosts").value(0))
                .andExpect(jsonPath("$.breakEvenMonth").value(1));
    }

    @Test
    void neverBreaksEven_breakEvenMonthIsNull() throws Exception {
        String body = """
                {"remainingBalance": 25000000, "currentAnnualRatePercent": 1.0, "remainingYears": 25,
                 "newAnnualRatePercent": 1.5, "newYears": 25, "method": "EQUAL_PAYMENT", "refinanceCosts": 500000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakEvenMonth").isEmpty());
    }

    @Test
    void balanceZero_returns400() throws Exception {
        String body = VALID.replace("25000000", "0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'remainingBalance')]").isNotEmpty());
    }

    @Test
    void rateOutOfRange_returns400() throws Exception {
        String body = VALID.replace("\"currentAnnualRatePercent\": 2.0", "\"currentAnnualRatePercent\": 21")
                .replace("\"newAnnualRatePercent\": 0.8", "\"newAnnualRatePercent\": -0.1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'currentAnnualRatePercent')]").isNotEmpty())
                .andExpect(jsonPath("$.errors[?(@.field == 'newAnnualRatePercent')]").isNotEmpty());
    }

    @Test
    void yearsOutOfRange_returns400() throws Exception {
        String body = VALID.replace("\"remainingYears\": 25", "\"remainingYears\": 0")
                .replace("\"newYears\": 25", "\"newYears\": 51");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'remainingYears')]").isNotEmpty())
                .andExpect(jsonPath("$.errors[?(@.field == 'newYears')]").isNotEmpty());
    }

    @Test
    void negativeCosts_returns400() throws Exception {
        String body = VALID.replace("\"refinanceCosts\": 500000", "\"refinanceCosts\": -1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'refinanceCosts')]").isNotEmpty());
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        String body = VALID.replace("EQUAL_PAYMENT", "FOO");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
