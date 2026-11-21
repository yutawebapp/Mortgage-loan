package com.example.mortgage.prepayment;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PrepaymentController.class)
@Import(PrepaymentService.class)
class PrepaymentControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/prepayment";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void validShortenRequest_returns200WithShape() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 60, "prepaymentAmount": 5000000, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appliedPrepayment").value(5000000))
                .andExpect(jsonPath("$.baseline.months").value(420))
                .andExpect(jsonPath("$.baseline.monthlyPayment").value(87511))
                .andExpect(jsonPath("$.baseline.totalPayment").value(36754454))
                .andExpect(jsonPath("$.baseline.totalInterest").value(6754454))
                .andExpect(jsonPath("$.afterPrepayment.months").value(342))
                .andExpect(jsonPath("$.afterPrepayment.monthlyPaymentBefore").value(87511))
                .andExpect(jsonPath("$.afterPrepayment.monthlyPaymentAfter").value(87511))
                .andExpect(jsonPath("$.afterPrepayment.totalPayment").value(29863927))
                .andExpect(jsonPath("$.afterPrepayment.totalInterest").value(4863927))
                .andExpect(jsonPath("$.interestSaving").value(1890527))
                .andExpect(jsonPath("$.monthsShortened").value(78))
                .andExpect(jsonPath("$.schedule.length()").value(342))
                .andExpect(jsonPath("$.schedule[59].prepayment").value(5000000))
                .andExpect(jsonPath("$.schedule[58].prepayment").value(0))
                .andExpect(jsonPath("$.schedule[341].balance").value(0));
    }

    @Test
    void fullPayoff_returnsZeroMonthlyAfter() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 60, "prepaymentAmount": 100000000, "prepaymentType": "REDUCE_PAYMENT"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appliedPrepayment").value(26445546))
                .andExpect(jsonPath("$.afterPrepayment.months").value(60))
                .andExpect(jsonPath("$.afterPrepayment.monthlyPaymentAfter").value(0))
                .andExpect(jsonPath("$.schedule.length()").value(60))
                .andExpect(jsonPath("$.schedule[59].balance").value(0));
    }

    @Test
    void afterMonthZero_returns400() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 0, "prepaymentAmount": 5000000, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'prepaymentAfterMonth')]").isNotEmpty());
    }

    @Test
    void afterMonthEqualsTermMonths_returns400() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 420, "prepaymentAmount": 5000000, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'prepaymentAfterMonthWithinTerm')]").isNotEmpty());
    }

    @Test
    void amountZero_returns400() throws Exception {
        String body = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 60, "prepaymentAmount": 0, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'prepaymentAmount')]").isNotEmpty());
    }

    @Test
    void unknownType_andMethod_return400() throws Exception {
        String badType = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 60, "prepaymentAmount": 5000000, "prepaymentType": "FOO"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(badType))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        String badMethod = """
                {"principal": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "FOO",
                 "prepaymentAfterMonth": 60, "prepaymentAmount": 5000000, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(badMethod))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void rateAndYearsOutOfRange_returns400() throws Exception {
        String body = """
                {"principal": 1000, "annualRatePercent": 21, "years": 51, "method": "EQUAL_PAYMENT",
                 "prepaymentAfterMonth": 1, "prepaymentAmount": 1, "prepaymentType": "SHORTEN_TERM"}
                """;
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'annualRatePercent')]").isNotEmpty())
                .andExpect(jsonPath("$.errors[?(@.field == 'years')]").isNotEmpty());
    }
}
