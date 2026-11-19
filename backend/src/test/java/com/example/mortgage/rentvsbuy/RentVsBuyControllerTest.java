package com.example.mortgage.rentvsbuy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RentVsBuyController.class)
@Import(RentVsBuyService.class)
class RentVsBuyControllerTest {

    private static final String ENDPOINT = "/api/v1/simulations/rent-vs-buy";

    @Autowired
    private MockMvc mockMvc;

    /** Valid request values as raw JSON (the brief's sample: defaults plus the required fields). */
    private static Map<String, String> validFields() {
        Map<String, String> f = new LinkedHashMap<>();
        f.put("propertyPrice", "40000000");
        f.put("downPayment", "4000000");
        f.put("closingCostRatePercent", "10");
        f.put("annualRatePercent", "1.2");
        f.put("years", "35");
        f.put("method", "\"EQUAL_PAYMENT\"");
        f.put("monthlyRent", "150000");
        f.put("horizonYears", "35");
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

    private ResultActions send(String json) throws Exception {
        return mockMvc.perform(post(ENDPOINT).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void defaultsOnly_returnsSampleNumbersAndShape() throws Exception {
        // Same numbers as RentVsBuyCalculatorTest.sampleDefaults35y (Python reference).
        send(body(validFields()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loanPrincipal").value(40000000))
                .andExpect(jsonPath("$.closingCost").value(4000000))
                .andExpect(jsonPath("$.years.length()").value(35))
                .andExpect(jsonPath("$.years[0].year").value(1))
                .andExpect(jsonPath("$.years[0].purchaseYearOutlay").value(1400172))
                .andExpect(jsonPath("$.years[0].purchaseCumulative").value(5400172))
                .andExpect(jsonPath("$.years[0].loanBalance").value(39074751))
                .andExpect(jsonPath("$.years[0].assetValue").value(40000000))
                .andExpect(jsonPath("$.years[0].purchaseNetCost").value(4474923))
                .andExpect(jsonPath("$.years[0].rentYearOutlay").value(1800000))
                .andExpect(jsonPath("$.years[0].rentCumulative").value(1800000))
                .andExpect(jsonPath("$.years[34].loanBalance").value(0))
                .andExpect(jsonPath("$.years[34].rentCumulative").value(63000000))
                .andExpect(jsonPath("$.summary.crossoverYearCumulative").value(11))
                .andExpect(jsonPath("$.summary.crossoverYearNet").value(3))
                .andExpect(jsonPath("$.summary.purchaseCumulativeAtEnd").value(53005986))
                .andExpect(jsonPath("$.summary.purchaseNetAtEnd").value(13005986))
                .andExpect(jsonPath("$.summary.rentCumulativeAtEnd").value(63000000))
                .andExpect(jsonPath("$.sensitivity.length()").value(3))
                .andExpect(jsonPath("$.sensitivity[0].assetChangeRatePercent").value(-2))
                .andExpect(jsonPath("$.sensitivity[0].crossoverYearNet").value(7))
                .andExpect(jsonPath("$.sensitivity[1].assetChangeRatePercent").value(0))
                .andExpect(jsonPath("$.sensitivity[1].crossoverYearNet").value(3))
                .andExpect(jsonPath("$.sensitivity[1].purchaseNetAtEnd").value(13005986))
                .andExpect(jsonPath("$.sensitivity[2].assetChangeRatePercent").value(2))
                .andExpect(jsonPath("$.sensitivity[2].crossoverYearNet").value(2))
                .andExpect(jsonPath("$.notes", containsInAnyOrder(
                        "ASSET_VALUE_IS_ASSUMPTION", "NO_INVESTMENT_RETURN_ON_DIFFERENCE",
                        "TAX_DEDUCTION_NOT_INCLUDED", "SAME_HOME_CONDITIONS_NOT_ASSURED",
                        "OWNERSHIP_COSTS_CONTINUE_AFTER_LOAN", "CLOSING_COSTS_FINANCED_FROM_BUDGET")));
    }

    @Test
    void noVerdictFieldsInResponse() throws Exception {
        send(body(validFields()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verdict").doesNotExist())
                .andExpect(jsonPath("$.better").doesNotExist())
                .andExpect(jsonPath("$.recommendation").doesNotExist());
    }

    @Test
    void horizonShorterThanLoan_ownershipContinuesAndHorizonRowsOnly() throws Exception {
        String json = """
                {"propertyPrice": 20000000, "downPayment": 2000000, "annualRatePercent": 1.0,
                 "years": 5, "method": "EQUAL_PAYMENT", "monthlyManagementFee": 10000,
                 "monthlyRepairReserve": 5000, "annualPropertyTax": 50000, "annualInsurance": 20000,
                 "monthlyRent": 100000, "horizonYears": 8}
                """;
        // Same numbers as RentVsBuyCalculatorTest.horizonBeyondLoanOwnershipContinues.
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years.length()").value(8))
                .andExpect(jsonPath("$.years[5].loanBalance").value(0))
                .andExpect(jsonPath("$.years[7].purchaseCumulative").value(24512495))
                .andExpect(jsonPath("$.summary.purchaseCumulativeAtEnd").value(24512495));
    }

    @Test
    void sensitivityEntries_areComputedEvenBeyondRequestLimits() throws Exception {
        String json = """
                {"propertyPrice": 30000000, "downPayment": 3000000, "annualRatePercent": 1.0,
                 "years": 30, "method": "EQUAL_PAYMENT", "monthlyRent": 120000, "horizonYears": 12,
                 "assetChangeRatePercent": 9, "saleCostRatePercent": 2}
                """;
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sensitivity.length()").value(3))
                .andExpect(jsonPath("$.sensitivity[0].assetChangeRatePercent").value(7))
                .andExpect(jsonPath("$.sensitivity[2].assetChangeRatePercent").value(11))
                .andExpect(jsonPath("$.sensitivity[0].crossoverYearNet").value(2))
                .andExpect(jsonPath("$.sensitivity[0].purchaseNetAtEnd").value(-30252754))
                .andExpect(jsonPath("$.sensitivity[1].crossoverYearNet").value(1))
                .andExpect(jsonPath("$.sensitivity[1].purchaseNetAtEnd").value(-46730665))
                .andExpect(jsonPath("$.sensitivity[2].crossoverYearNet").value(1))
                .andExpect(jsonPath("$.sensitivity[2].purchaseNetAtEnd").value(-66892769));
    }

    @Test
    void omittedOptionalFields_useNeutralDefaults() throws Exception {
        // Without rent growth / renewal / asset / sale fields, the same numbers as the defaults-only case.
        send(body(validFields()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years[0].rentYearOutlay").value(1800000))
                .andExpect(jsonPath("$.years[5].rentYearOutlay").value(1800000))
                .andExpect(jsonPath("$.years[0].assetValue").value(40000000));
    }

    @Test
    void renewalFeeIsAddedAtEveryIntervalBoundary() throws Exception {
        String json = """
                {"propertyPrice": 25000000, "downPayment": 2500000, "annualRatePercent": 1.5,
                 "years": 30, "method": "EQUAL_PAYMENT", "monthlyRent": 100000, "rentGrowthPercent": 2.5,
                 "renewalFeeMonths": 1, "renewalIntervalYears": 2, "rentInitialCost": 300000, "horizonYears": 7}
                """;
        send(json)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.years[0].rentYearOutlay").value(1200000))
                .andExpect(jsonPath("$.years[1].rentYearOutlay").value(1230000))
                .andExpect(jsonPath("$.years[2].rentYearOutlay").value(1365819))
                .andExpect(jsonPath("$.years[3].rentYearOutlay").value(1292268))
                .andExpect(jsonPath("$.years[6].rentYearOutlay").value(1507597))
                .andExpect(jsonPath("$.summary.rentCumulativeAtEnd").value(9688329));
    }

    @ParameterizedTest(name = "{0}={1} is rejected")
    @CsvSource(delimiter = ';', value = {
            "propertyPrice;0", "propertyPrice;1000000001",
            "downPayment;-1", "downPayment;1000000001",
            "closingCostRatePercent;-0.1", "closingCostRatePercent;30.1",
            "annualRatePercent;-0.1", "annualRatePercent;20.1",
            "years;0", "years;51",
            "monthlyManagementFee;-1", "monthlyManagementFee;1000001",
            "monthlyRepairReserve;-1", "monthlyRepairReserve;1000001",
            "annualPropertyTax;-1", "annualPropertyTax;10000001",
            "annualInsurance;-1", "annualInsurance;10000001",
            "monthlyRent;0", "monthlyRent;10000001",
            "rentGrowthPercent;-0.1", "rentGrowthPercent;10.1",
            "renewalFeeMonths;-0.1", "renewalFeeMonths;6.1",
            "renewalIntervalYears;0", "renewalIntervalYears;6",
            "rentInitialCost;-1", "rentInitialCost;100000001",
            "horizonYears;0", "horizonYears;51",
            "assetChangeRatePercent;-10.1", "assetChangeRatePercent;10.1",
            "saleCostRatePercent;-0.1", "saleCostRatePercent;10.1"
    })
    void outOfRange_returns400(String field, String value) throws Exception {
        send(with(field, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == '" + field + "')]").isNotEmpty());
    }

    @ParameterizedTest(name = "{0}={1} is accepted")
    @CsvSource(delimiter = ';', value = {
            "propertyPrice;1", "propertyPrice;1000000000",
            "downPayment;0", "downPayment;1000000000",
            "closingCostRatePercent;0", "closingCostRatePercent;30",
            "annualRatePercent;0", "annualRatePercent;20",
            "years;1", "years;50",
            "monthlyManagementFee;0", "monthlyManagementFee;1000000",
            "monthlyRepairReserve;0", "monthlyRepairReserve;1000000",
            "annualPropertyTax;0", "annualPropertyTax;10000000",
            "annualInsurance;0", "annualInsurance;10000000",
            "monthlyRent;1", "monthlyRent;10000000",
            "rentGrowthPercent;0", "rentGrowthPercent;10",
            "renewalFeeMonths;0", "renewalFeeMonths;6",
            "renewalIntervalYears;1", "renewalIntervalYears;5",
            "rentInitialCost;0", "rentInitialCost;100000000",
            "horizonYears;1", "horizonYears;50",
            "assetChangeRatePercent;-10", "assetChangeRatePercent;10",
            "saleCostRatePercent;0", "saleCostRatePercent;10"
    })
    void boundaryValues_areAccepted(String field, String value) throws Exception {
        Map<String, String> f = validFields();
        f.put(field, value);
        // Price and down payment bounds interact (loan must stay positive): pair them explicitly.
        if ("propertyPrice".equals(field) && "1".equals(value)) {
            f.put("downPayment", "0");
            f.put("closingCostRatePercent", "0");
        }
        if ("propertyPrice".equals(field) && "1000000000".equals(value)) {
            f.put("downPayment", "0");
        }
        if ("downPayment".equals(field) && "1000000000".equals(value)) {
            f.put("propertyPrice", "1000000000");
        }
        send(body(f)).andExpect(status().isOk());
    }

    @Test
    void unknownMethod_returns400() throws Exception {
        send(with("method", "\"INTEREST_ONLY\""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingRequiredField_returns400() throws Exception {
        Map<String, String> f = validFields();
        f.remove("monthlyRent");
        send(body(f)).andExpect(status().isBadRequest());
    }

    @Test
    void loanPrincipalNotPositive_returns400() throws Exception {
        // 10,000,000 + 1,000,000 closing - 11,000,000 down = 0
        String json = """
                {"propertyPrice": 10000000, "downPayment": 11000000, "annualRatePercent": 1.0,
                 "years": 10, "method": "EQUAL_PAYMENT", "monthlyRent": 100000, "horizonYears": 5}
                """;
        send(json)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'loanPrincipalPositive')]").isNotEmpty());
    }
}
