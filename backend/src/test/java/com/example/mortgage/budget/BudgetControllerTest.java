package com.example.mortgage.budget;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BudgetController.class)
@Import(BudgetService.class)
class BudgetControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/budget";

    @Autowired
    private MockMvc mockMvc;

    private static final String VALID = """
            {"downPayment": 5000000, "desiredMonthlyPayment": 100000, "annualRatePercent": 1.0,
             "years": 35, "closingCostRatePercent": 10.0, "annualIncome": 4500000}
            """;

    @Test
    void validRequest_returns200WithExpectedShape() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maxPropertyPrice").value(36740000))
                .andExpect(jsonPath("$.maxLoanAmount").value(35420000))
                .andExpect(jsonPath("$.downPayment").value(5000000))
                .andExpect(jsonPath("$.totalBudget").value(40420000))
                .andExpect(jsonPath("$.closingCosts").value(3674000))
                .andExpect(jsonPath("$.closingCostRatePercent").value(10.0))
                .andExpect(jsonPath("$.monthlyPayment").value(99986))
                .andExpect(jsonPath("$.loanExceedsPrice").value(false))
                .andExpect(jsonPath("$.burdenRatioPercent").value(26.7));
    }

    @Test
    void defaults_downPaymentZeroClosingTenPercentAndNoBurdenWithoutIncome() throws Exception {
        String body = """
                {"desiredMonthlyPayment": 100000, "annualRatePercent": 1.0, "years": 35}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.downPayment").value(0))
                .andExpect(jsonPath("$.totalBudget").value(35420000))
                .andExpect(jsonPath("$.maxPropertyPrice").value(32200000))
                .andExpect(jsonPath("$.closingCosts").value(3220000))
                .andExpect(jsonPath("$.closingCostRatePercent").value(10.0))
                .andExpect(jsonPath("$.loanExceedsPrice").value(true))
                .andExpect(jsonPath("$.burdenRatioPercent").isEmpty());
    }

    @Test
    void zeroDesiredPayment_returns400() throws Exception {
        String body = VALID.replace("100000", "0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'desiredMonthlyPayment')]").isNotEmpty());
    }

    @Test
    void negativeDownPayment_returns400() throws Exception {
        String body = VALID.replace("\"downPayment\": 5000000", "\"downPayment\": -1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'downPayment')]").isNotEmpty());
    }

    @Test
    void rateAndYearsOutOfRange_returns400() throws Exception {
        String rate = VALID.replace("\"annualRatePercent\": 1.0", "\"annualRatePercent\": 20.1");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(rate))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'annualRatePercent')]").isNotEmpty());

        String years = VALID.replace("\"years\": 35", "\"years\": 51");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(years))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());
    }

    @Test
    void closingCostOutOfRange_returns400() throws Exception {
        String body = VALID.replace("\"closingCostRatePercent\": 10.0", "\"closingCostRatePercent\": 31");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'closingCostRatePercent')]").isNotEmpty());
    }

    @Test
    void zeroIncome_returns400() throws Exception {
        String body = VALID.replace("\"annualIncome\": 4500000", "\"annualIncome\": 0");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'annualIncome')]").isNotEmpty());
    }
}
