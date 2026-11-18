package com.example.mortgage.totalcost;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TotalCostController.class)
@Import(TotalCostService.class)
class TotalCostControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/total-cost";

    @Autowired
    private MockMvc mockMvc;

    /** Valid request values as raw JSON, so single fields can be overridden in tests. */
    private static Map<String, String> validFields() {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("propertyPrice", "30000000");
        f.put("downPayment", "3000000");
        f.put("closingCostRatePercent", "10");
        f.put("annualRatePercent", "1.2");
        f.put("years", "35");
        f.put("method", "\"EQUAL_PAYMENT\"");
        f.put("monthlyManagementFee", "0");
        f.put("monthlyRepairReserve", "0");
        f.put("annualPropertyTax", "0");
        f.put("annualInsurance", "0");
        return f;
    }

    private static String body(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder("{");
        fields.forEach((k, v) -> {
            if (sb.length() > 1) {
                sb.append(',');
            }
            sb.append('"').append(k).append("\":").append(v);
        });
        return sb.append('}').toString();
    }

    private static String with(String field, String rawValue) {
        Map<String, String> f = validFields();
        f.put(field, rawValue);
        return body(f);
    }

    private static String without(String field) {
        Map<String, String> f = validFields();
        f.remove(field);
        return body(f);
    }

    private org.springframework.test.web.servlet.ResultActions send(String json) throws Exception {
        return mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void equalPayment_noOwnership_returns200WithExpectedShape() throws Exception {
        send(body(validFields()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.downPayment").value(3000000))
                .andExpect(jsonPath("$.initial.closingCost").value(3000000))
                .andExpect(jsonPath("$.initial.initialCost").value(3000000))
                .andExpect(jsonPath("$.loanPrincipal").value(30000000))
                .andExpect(jsonPath("$.totals.totalLoanPayment").value(36754454))
                .andExpect(jsonPath("$.totals.totalInterest").value(6754454))
                .andExpect(jsonPath("$.totals.totalOwnershipCost").value(0))
                .andExpect(jsonPath("$.totals.grandTotal").value(39754454))
                .andExpect(jsonPath("$.totals.monthlyAverage").value(94653))
                .andExpect(jsonPath("$.totals.firstMonthLoanPayment").value(87511))
                .andExpect(jsonPath("$.years.length()").value(35))
                .andExpect(jsonPath("$.years[0].year").value(1))
                .andExpect(jsonPath("$.years[0].loanPayment").value(1050132))
                .andExpect(jsonPath("$.years[0].interestPaid").value(356190))
                .andExpect(jsonPath("$.years[0].principalPaid").value(693942))
                .andExpect(jsonPath("$.years[0].yearEndBalance").value(29306058))
                .andExpect(jsonPath("$.years[0].ownershipCost").value(0))
                .andExpect(jsonPath("$.years[0].yearTotal").value(1050132))
                .andExpect(jsonPath("$.years[0].cumulativeOutlay").value(4050132))
                .andExpect(jsonPath("$.years[34].yearEndBalance").value(0))
                .andExpect(jsonPath("$.years[34].cumulativeOutlay").value(39754454))
                .andExpect(jsonPath("$.notes", containsInAnyOrder(
                        "OWNERSHIP_COST_CONSTANT", "NO_RESALE_VALUE",
                        "COSTS_AFTER_LOAN_TERM_EXCLUDED", "TAX_DEDUCTION_NOT_INCLUDED",
                        "CLOSING_COSTS_FINANCED_FROM_BUDGET")));
    }

    @Test
    void equalPrincipal_withOwnership_fiftyYears() throws Exception {
        String json = """
                {"propertyPrice": 40000000, "downPayment": 0, "closingCostRatePercent": 10,
                 "annualRatePercent": 0.5, "years": 50, "method": "EQUAL_PRINCIPAL",
                 "monthlyManagementFee": 20000, "monthlyRepairReserve": 8000,
                 "annualPropertyTax": 150000, "annualInsurance": 40000}
                """;
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.initialCost").value(0))
                .andExpect(jsonPath("$.loanPrincipal").value(44000000))
                .andExpect(jsonPath("$.totals.totalLoanPayment").value(49509167))
                .andExpect(jsonPath("$.totals.totalInterest").value(5509167))
                .andExpect(jsonPath("$.totals.totalOwnershipCost").value(26300000))
                .andExpect(jsonPath("$.totals.grandTotal").value(75809167))
                .andExpect(jsonPath("$.totals.monthlyAverage").value(126349))
                .andExpect(jsonPath("$.totals.firstMonthLoanPayment").value(91667))
                .andExpect(jsonPath("$.years.length()").value(50))
                .andExpect(jsonPath("$.years[49].loanPayment").value(882380))
                .andExpect(jsonPath("$.years[49].ownershipCost").value(526000))
                .andExpect(jsonPath("$.years[49].cumulativeOutlay").value(75809167));
    }

    @Test
    void oneYear_returnsSingleRow() throws Exception {
        String json = """
                {"propertyPrice": 5000000, "downPayment": 1000000, "annualRatePercent": 1.0,
                 "years": 1, "method": "EQUAL_PAYMENT", "monthlyManagementFee": 10000,
                 "monthlyRepairReserve": 5000, "annualPropertyTax": 50000, "annualInsurance": 20000}
                """;
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.closingCost").value(500000))
                .andExpect(jsonPath("$.totals.grandTotal").value(5774413))
                .andExpect(jsonPath("$.totals.monthlyAverage").value(481201))
                .andExpect(jsonPath("$.years.length()").value(1))
                .andExpect(jsonPath("$.years[0].yearTotal").value(4774413));
    }

    @Test
    void defaults_downPaymentZeroClosingTenPercentAndNoOwnershipCost() throws Exception {
        String json = """
                {"propertyPrice": 30000000, "annualRatePercent": 1.2, "years": 35, "method": "EQUAL_PAYMENT"}
                """;
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.downPayment").value(0))
                .andExpect(jsonPath("$.initial.closingCost").value(3000000))
                .andExpect(jsonPath("$.loanPrincipal").value(33000000))
                .andExpect(jsonPath("$.totals.totalOwnershipCost").value(0));
    }

    @Test
    void downPaymentCoversEverything_returns400() throws Exception {
        // price + closing = 33,000,000
        send(with("downPayment", "33000000"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'loanPrincipalPositive')]").isNotEmpty());
    }

    @Test
    void downPaymentJustBelowTotalCost_isAccepted() throws Exception {
        send(with("downPayment", "32999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanPrincipal").value(1));
    }

    @Test
    void missingRequiredFields_return400() throws Exception {
        for (String field : new String[] {"propertyPrice", "annualRatePercent", "years", "method"}) {
            send(without(field))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").isNotEmpty());
        }
    }

    @ParameterizedTest
    @CsvSource({
            // field, invalid value (just outside the range)
            "propertyPrice, 0",
            "propertyPrice, 1000000001",
            "downPayment, -1",
            "downPayment, 1000000001",
            "closingCostRatePercent, -0.1",
            "closingCostRatePercent, 30.1",
            "annualRatePercent, -0.1",
            "annualRatePercent, 20.1",
            "years, 0",
            "years, 51",
            "monthlyManagementFee, -1",
            "monthlyManagementFee, 1000001",
            "monthlyRepairReserve, -1",
            "monthlyRepairReserve, 1000001",
            "annualPropertyTax, -1",
            "annualPropertyTax, 10000001",
            "annualInsurance, -1",
            "annualInsurance, 10000001",
    })
    void outOfRangeValue_returns400ForThatField(String field, String value) throws Exception {
        send(with(field, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").isNotEmpty());
    }

    @ParameterizedTest
    @CsvSource({
            // field, boundary value that must be accepted (other fields stay valid)
            "propertyPrice, 1000000000",
            "downPayment, 0",
            "closingCostRatePercent, 0",
            "closingCostRatePercent, 30",
            "annualRatePercent, 0",
            "annualRatePercent, 20",
            "years, 1",
            "years, 50",
            "monthlyManagementFee, 0",
            "monthlyManagementFee, 1000000",
            "monthlyRepairReserve, 1000000",
            "annualPropertyTax, 10000000",
            "annualInsurance, 10000000",
    })
    void boundaryValue_isAccepted(String field, String value) throws Exception {
        send(with(field, value)).andExpect(status().isOk());
    }

    @Test
    void minimumPropertyPrice_isAcceptedWhenDownPaymentIsZero() throws Exception {
        // price 1 yen, closing 10% rounds to 0 yen: down 3,000,000 is too much (400), down 0 leaves 1 yen
        send(with("propertyPrice", "1"))
                .andExpect(status().isBadRequest());
        String json = with("propertyPrice", "1").replace("\"downPayment\":3000000", "\"downPayment\":0");
        send(json).andExpect(status().isOk())
                .andExpect(jsonPath("$.initial.closingCost").value(0))
                .andExpect(jsonPath("$.loanPrincipal").value(1));
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        // an unknown enum name fails body parsing (400 ProblemDetail without a per-field errors list)
        send(with("method", "\"FOO\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void nonNumericAmount_returns400() throws Exception {
        send(with("propertyPrice", "\"abc\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
