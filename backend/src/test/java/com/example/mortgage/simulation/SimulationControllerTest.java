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
    void withoutSelfSharePercent_pairBreakdownIsNull() throws Exception {
        String body = """
                {"principal": 40000000, "annualRatePercent": 1.5, "years": 35, "method": "EQUAL_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pairBreakdown").doesNotExist());
    }

    @Test
    void selfSharePercent50_returnsEqualPairBreakdown() throws Exception {
        String body = """
                {"principal": 40000000, "annualRatePercent": 1.5, "years": 35,
                 "method": "EQUAL_PAYMENT", "selfSharePercent": 50}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monthlyPayment").value(122474))
                .andExpect(jsonPath("$.pairBreakdown.self.principal").value(20000000))
                .andExpect(jsonPath("$.pairBreakdown.self.monthlyPayment").value(61237))
                .andExpect(jsonPath("$.pairBreakdown.self.bonusPayment").value(0))
                .andExpect(jsonPath("$.pairBreakdown.self.totalPayment").value(25719482))
                .andExpect(jsonPath("$.pairBreakdown.self.totalInterest").value(5719482))
                .andExpect(jsonPath("$.pairBreakdown.partner.principal").value(20000000))
                .andExpect(jsonPath("$.pairBreakdown.partner.monthlyPayment").value(61237))
                .andExpect(jsonPath("$.pairBreakdown.notes[0]").value("PAIR_SHARE_PROVISIONAL"));
    }

    @Test
    void equalPrincipal_selfSharePercent50_returnsBreakdown() throws Exception {
        String body = """
                {"principal": 40000000, "annualRatePercent": 1.5, "years": 35,
                 "method": "EQUAL_PRINCIPAL", "selfSharePercent": 50}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pairBreakdown.self.monthlyPayment").value(72620))
                .andExpect(jsonPath("$.pairBreakdown.self.totalPayment").value(25262500))
                .andExpect(jsonPath("$.pairBreakdown.self.totalInterest").value(5262500))
                .andExpect(jsonPath("$.pairBreakdown.partner.monthlyPayment").value(72620))
                .andExpect(jsonPath("$.pairBreakdown.partner.principal").value(20000000));
    }

    @Test
    void selfSharePercent70_withBonus_returnsUnevenBreakdown() throws Exception {
        String body = """
                {"principal": 40000000, "annualRatePercent": 1.5, "years": 35,
                 "method": "EQUAL_PAYMENT", "bonusAmount": 10000000, "selfSharePercent": 70}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pairBreakdown.self.principal").value(28000000))
                .andExpect(jsonPath("$.pairBreakdown.self.bonusAmount").value(7000000))
                .andExpect(jsonPath("$.pairBreakdown.partner.principal").value(12000000))
                .andExpect(jsonPath("$.pairBreakdown.partner.bonusAmount").value(3000000));
    }

    @Test
    void selfSharePercentOutOfRange_returns400() throws Exception {
        String body = """
                {"principal": 1000, "annualRatePercent": 1.0, "years": 35,
                 "method": "EQUAL_PAYMENT", "selfSharePercent": 100}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'selfSharePercent')]").isNotEmpty());
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
