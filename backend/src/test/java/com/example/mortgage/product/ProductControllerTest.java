package com.example.mortgage.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    private static final String LIST = "/api/v1/products";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProductService productService;

    private static ProductSummary sampleSummary() {
        return new ProductSummary(1L, "サンプル銀行A", "サンプル変動金利A", RateType.VARIABLE, null,
                new BigDecimal("0.45000"), LocalDate.of(2026, 11, 3), "https://example.com/sample/products/1");
    }

    @Test
    void list_defaults_returnsShape() throws Exception {
        given(productService.findProducts(isNull(), any(), anyInt(), anyInt()))
                .willReturn(new ProductListResponse(List.of(sampleSummary()), 0, 20, 1L, 1));

        mockMvc.perform(get(LIST))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(1))
                .andExpect(jsonPath("$.items[0].institutionName").value("サンプル銀行A"))
                .andExpect(jsonPath("$.items[0].productName").value("サンプル変動金利A"))
                .andExpect(jsonPath("$.items[0].rateType").value("VARIABLE"))
                .andExpect(jsonPath("$.items[0].fixedPeriodYears").doesNotExist())
                .andExpect(jsonPath("$.items[0].annualRatePercent").value(0.45))
                .andExpect(jsonPath("$.items[0].rateEffectiveFrom").value("2026-11-03"))
                .andExpect(jsonPath("$.items[0].rateSourceUrl").value("https://example.com/sample/products/1"))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.totalPages").value(1));

        verify(productService).findProducts(null, ProductSort.RATE_ASC, 0, 20);
    }

    @Test
    void list_passesRateTypeSortPagingThrough() throws Exception {
        given(productService.findProducts(RateType.FIXED_PERIOD, ProductSort.NAME_ASC, 2, 5))
                .willReturn(new ProductListResponse(List.of(), 2, 5, 0L, 0));

        mockMvc.perform(get(LIST).param("rateType", "FIXED_PERIOD").param("sort", "NAME_ASC")
                        .param("page", "2").param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void list_emptySortAndRateType_treatedAsAbsent() throws Exception {
        given(productService.findProducts(isNull(), any(), anyInt(), anyInt()))
                .willReturn(new ProductListResponse(List.of(), 0, 20, 0L, 0));

        mockMvc.perform(get(LIST).param("rateType", "").param("sort", ""))
                .andExpect(status().isOk());
    }

    @Test
    void list_unknownRateType_returns400() throws Exception {
        mockMvc.perform(get(LIST).param("rateType", "MIXED"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        mockMvc.perform(get(LIST).param("rateType", "variable"))
                .andExpect(status().isBadRequest());
        verify(productService, never()).findProducts(any(), any(), anyInt(), anyInt());
    }

    @Test
    void list_unknownSort_returns400WithoutService() throws Exception {
        mockMvc.perform(get(LIST).param("sort", "RATE_ASC; DROP TABLE products"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'sort')]").isNotEmpty());
        verify(productService, never()).findProducts(any(), any(), anyInt(), anyInt());
    }

    @Test
    void list_pageNegative_returns400() throws Exception {
        mockMvc.perform(get(LIST).param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors[?(@.field == 'page')]").isNotEmpty());
    }

    @Test
    void list_sizeOutOfRange_returns400() throws Exception {
        mockMvc.perform(get(LIST).param("size", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'size')]").isNotEmpty());
        mockMvc.perform(get(LIST).param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[?(@.field == 'size')]").isNotEmpty());
    }

    @Test
    void list_nonNumericPage_returns400() throws Exception {
        mockMvc.perform(get(LIST).param("page", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void detail_returnsFeesAndHistory() throws Exception {
        ProductDetailResponse body = new ProductDetailResponse(
                2L, "サンプル銀行A", "サンプル全期間固定A", RateType.FIXED_FULL, null,
                new BigDecimal("1.90000"), LocalDate.of(2026, 11, 3), "https://example.com/sample/products/2",
                List.of(new ProductFee("ARRANGEMENT", "事務手数料", new BigDecimal("33000"), null)),
                List.of(new RateHistoryEntry(new BigDecimal("1.85000"), LocalDate.of(2026, 5, 1),
                        "https://example.com/sample/products/2")));
        given(productService.findProductDetail(2L)).willReturn(body);

        mockMvc.perform(get(LIST + "/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(2))
                .andExpect(jsonPath("$.rateType").value("FIXED_FULL"))
                .andExpect(jsonPath("$.annualRatePercent").value(1.9))
                .andExpect(jsonPath("$.fees[0].feeType").value("ARRANGEMENT"))
                .andExpect(jsonPath("$.fees[0].label").value("事務手数料"))
                .andExpect(jsonPath("$.fees[0].amount").value(33000))
                .andExpect(jsonPath("$.fees[0].ratePercent").doesNotExist())
                .andExpect(jsonPath("$.rateHistory[0].annualRatePercent").value(1.85))
                .andExpect(jsonPath("$.rateHistory[0].effectiveFrom").value("2026-05-01"))
                .andExpect(jsonPath("$.rateHistory[0].sourceUrl").value("https://example.com/sample/products/2"));
    }

    @Test
    void detail_unknownId_returns404ProblemDetail() throws Exception {
        willThrow(new ProductNotFoundException()).given(productService).findProductDetail(999L);

        mockMvc.perform(get(LIST + "/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void detail_nonNumericId_returns400() throws Exception {
        mockMvc.perform(get(LIST + "/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
