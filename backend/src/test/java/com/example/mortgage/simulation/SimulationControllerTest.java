package com.example.mortgage.simulation;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SimulationController.class)
@Import(SimulationService.class)
class SimulationControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/repayment";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validRequest_returns200WithSchedule() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.0, "years": 35, "method": "EQUAL_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyPayment").value(84686))
                .andExpect(jsonPath("$.bonusPayment").value(0))
                .andExpect(jsonPath("$.totalPayment").value(35567972))
                .andExpect(jsonPath("$.totalInterest").value(5567972))
                .andExpect(jsonPath("$.schedule.length()").value(420))
                .andExpect(jsonPath("$.schedule[0].month").value(1))
                .andExpect(jsonPath("$.schedule[419].balance").value(0));
    }

    @Test
    void bonusRequest_bonusMonthsPopulated() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "bonusAmount": 10000000}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyPayment").value(56457))
                .andExpect(jsonPath("$.bonusPayment").value(169666))
                .andExpect(jsonPath("$.schedule[5].bonusPayment").value(169666))
                .andExpect(jsonPath("$.schedule[5].month").value(6))
                .andExpect(jsonPath("$.schedule[4].bonusPayment").value(0));
    }

    @Test
    void principalZero_returns400ProblemDetail() throws Exception {
        String body = """
                {"principal": 0, "annualRatePercent": 1.0, "years": 35, "method": "EQUAL_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'principal')]").isNotEmpty());
    }

    @Test
    void bonusGreaterThanPrincipal_returns400() throws Exception {
        String body = """
                {"principal": 1000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "bonusAmount": 1001}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'bonusAmountWithinPrincipal')]").isNotEmpty());
    }

    @Test
    void rateOutOfRange_andYearsOutOfRange_returns400() throws Exception {
        String body = """
                {"principal": 1000, "annualRatePercent": 21, "years": 51, "method": "EQUAL_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'annualRatePercent')]").isNotEmpty())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        String body = """
                {"principal": 1000, "annualRatePercent": 1.0, "years": 35, "method": "FOO"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
