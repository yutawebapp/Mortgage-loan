package com.example.mortgage.ratetype;

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

@WebMvcTest(RateTypeController.class)
@Import(RateTypeService.class)
class RateTypeControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/rate-types";

    @Autowired
    private MockMvc mockMvc;

    /** Same inputs as the EP_30M_35y golden case in RateTypeCalculatorTest. */
    private static final String VALID = """
            {"principal": 30000000, "years": 35, "method": "EQUAL_PAYMENT",
             "variableRatePercent": 0.5, "variableRiseAfterYears": 5, "variableRisePoints": 1.0,
             "fixedPeriodYears": 10, "fixedPeriodRatePercent": 1.0, "fixedPeriodAfterRatePercent": 0.5,
             "fullFixedRatePercent": 2.0}
            """;

    private void assertBadRequest(String body, String field) throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").isNotEmpty());
    }

    private void assertTermMessage(String body) throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.message == 'must be less than years')]").isNotEmpty());
    }

    private void assertAccepted(String body) throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    private static String with(String field, String value) {
        return VALID.replaceAll("\"" + field + "\": [^,}]+", "\"" + field + "\": " + value);
    }

    @Test
    void validRequest_returns200WithExpectedShape() throws Exception {
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(VALID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cases.length()").value(4))
                .andExpect(jsonPath("$.cases[0].type").value("VARIABLE_FLAT"))
                .andExpect(jsonPath("$.cases[1].type").value("VARIABLE_RISE"))
                .andExpect(jsonPath("$.cases[2].type").value("FIXED_PERIOD"))
                .andExpect(jsonPath("$.cases[3].type").value("FULL_FIXED"))
                .andExpect(jsonPath("$.notes").value(org.hamcrest.Matchers.contains(
                        "RATES_ARE_USER_ASSUMPTIONS", "SIMPLIFIED_RATE_CHANGE_MODEL",
                        "FEES_AND_GUARANTEE_NOT_INCLUDED")))
                // single-stage cases: switch fields are null
                .andExpect(jsonPath("$.cases[0].rateAfterPercent").value(nullValue()))
                .andExpect(jsonPath("$.cases[0].switchAfterYears").value(nullValue()))
                .andExpect(jsonPath("$.cases[0].monthlyPaymentBeforeSwitch").value(nullValue()))
                .andExpect(jsonPath("$.cases[0].monthlyPaymentAfterSwitch").value(nullValue()))
                .andExpect(jsonPath("$.cases[3].monthlyPaymentAfterSwitch").value(nullValue()))
                .andExpect(jsonPath("$.cases[0].totalPayment").value(32707747))
                .andExpect(jsonPath("$.cases[0].totalPaymentDiffFromFullFixed").value(-9031320))
                // two-stage cases
                .andExpect(jsonPath("$.cases[1].rateAfterPercent").value(1.5))
                .andExpect(jsonPath("$.cases[1].switchAfterYears").value(5))
                .andExpect(jsonPath("$.cases[1].monthlyPaymentBeforeSwitch").value(77876))
                .andExpect(jsonPath("$.cases[1].monthlyPaymentAfterSwitch").value(89831))
                .andExpect(jsonPath("$.cases[1].totalPayment").value(37011608))
                .andExpect(jsonPath("$.cases[2].rateAfterPercent").value(0.5))
                .andExpect(jsonPath("$.cases[2].switchAfterYears").value(10))
                .andExpect(jsonPath("$.cases[2].monthlyPaymentBeforeSwitch").value(84686))
                .andExpect(jsonPath("$.cases[2].monthlyPaymentAfterSwitch").value(79697))
                .andExpect(jsonPath("$.cases[2].totalPayment").value(34071271))
                .andExpect(jsonPath("$.cases[2].totalInterest").value(4071271))
                .andExpect(jsonPath("$.cases[3].totalPayment").value(41739067))
                .andExpect(jsonPath("$.cases[3].totalPaymentDiffFromFullFixed").value(0))
                .andExpect(jsonPath("$.cases[0].yearlyPayments.length()").value(35))
                .andExpect(jsonPath("$.cases[1].yearlyPayments.length()").value(35))
                .andExpect(jsonPath("$.cases[2].yearlyPayments.length()").value(35))
                .andExpect(jsonPath("$.cases[3].yearlyPayments.length()").value(35))
                .andExpect(jsonPath("$.cases[2].yearlyPayments[0]").value(1016232))
                .andExpect(jsonPath("$.cases[2].yearlyPayments[10]").value(956364));
    }

    @Test
    void principalOutOfRange_returns400() throws Exception {
        assertBadRequest(with("principal", "0"), "principal");
        assertBadRequest(with("principal", "1000000001"), "principal");
        assertBadRequest(with("principal", "null"), "principal");
    }

    @Test
    void principalBoundaries_accepted() throws Exception {
        assertAccepted(with("principal", "1"));
        assertAccepted(with("principal", "1000000000"));
    }

    @Test
    void yearsOutOfRange_returns400() throws Exception {
        assertBadRequest(with("years", "1"), "years");
        assertBadRequest(with("years", "51"), "years");
        assertBadRequest(with("years", "null"), "years");
    }

    @Test
    void yearsBoundaries_accepted() throws Exception {
        assertAccepted(with("years", "2").replace("\"variableRiseAfterYears\": 5", "\"variableRiseAfterYears\": 1")
                .replace("\"fixedPeriodYears\": 10", "\"fixedPeriodYears\": 1"));
        assertAccepted(with("years", "50"));
    }

    @Test
    void variableRateOutOfRange_returns400() throws Exception {
        assertBadRequest(with("variableRatePercent", "-0.1"), "variableRatePercent");
        assertBadRequest(with("variableRatePercent", "20.1"), "variableRatePercent");
        assertBadRequest(with("variableRatePercent", "null"), "variableRatePercent");
    }

    @Test
    void fixedPeriodRateOutOfRange_returns400() throws Exception {
        assertBadRequest(with("fixedPeriodRatePercent", "-0.1"), "fixedPeriodRatePercent");
        assertBadRequest(with("fixedPeriodRatePercent", "20.1"), "fixedPeriodRatePercent");
    }

    @Test
    void fixedPeriodAfterRateOutOfRange_returns400() throws Exception {
        assertBadRequest(with("fixedPeriodAfterRatePercent", "-0.1"), "fixedPeriodAfterRatePercent");
        assertBadRequest(with("fixedPeriodAfterRatePercent", "20.1"), "fixedPeriodAfterRatePercent");
    }

    @Test
    void fullFixedRateOutOfRange_returns400() throws Exception {
        assertBadRequest(with("fullFixedRatePercent", "-0.1"), "fullFixedRatePercent");
        assertBadRequest(with("fullFixedRatePercent", "20.1"), "fullFixedRatePercent");
    }

    @Test
    void rateBoundaries_accepted() throws Exception {
        assertAccepted(VALID.replace("\"variableRatePercent\": 0.5", "\"variableRatePercent\": 0")
                .replace("\"variableRisePoints\": 1.0", "\"variableRisePoints\": 10")
                .replace("\"fixedPeriodRatePercent\": 1.0", "\"fixedPeriodRatePercent\": 20")
                .replace("\"fixedPeriodAfterRatePercent\": 0.5", "\"fixedPeriodAfterRatePercent\": 0")
                .replace("\"fullFixedRatePercent\": 2.0", "\"fullFixedRatePercent\": 20"));
    }

    @Test
    void variableRiseAfterYearsOutOfRange_returns400() throws Exception {
        assertBadRequest(with("variableRiseAfterYears", "0"), "variableRiseAfterYears");
        assertTermMessage(with("variableRiseAfterYears", "35"));
        assertTermMessage(with("variableRiseAfterYears", "36"));
        assertBadRequest(with("variableRiseAfterYears", "null"), "variableRiseAfterYears");
    }

    @Test
    void variableRisePointsOutOfRange_returns400() throws Exception {
        assertBadRequest(with("variableRisePoints", "0"), "variableRisePoints");
        assertBadRequest(with("variableRisePoints", "-1.0"), "variableRisePoints");
        assertBadRequest(with("variableRisePoints", "10.1"), "variableRisePoints");
        assertBadRequest(with("variableRisePoints", "null"), "variableRisePoints");
    }

    @Test
    void variableRatePlusRiseOver20_returns400() throws Exception {
        String body = with("variableRatePercent", "19.5");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.message == 'variableRatePercent plus variableRisePoints must be less than or equal to 20')]").isNotEmpty());
    }

    @Test
    void variableRatePlusRiseExactly20_accepted() throws Exception {
        assertAccepted(with("variableRatePercent", "19.0"));
    }

    @Test
    void fixedPeriodYearsOutOfRange_returns400() throws Exception {
        assertBadRequest(with("fixedPeriodYears", "0"), "fixedPeriodYears");
        assertTermMessage(with("fixedPeriodYears", "35"));
        assertTermMessage(with("fixedPeriodYears", "36"));
        assertBadRequest(with("fixedPeriodYears", "null"), "fixedPeriodYears");
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        String body = VALID.replace("\"EQUAL_PAYMENT\"", "\"BONUS_MIX\"");
        mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
