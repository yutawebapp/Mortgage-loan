package com.example.mortgage.product;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs Flyway (V1..V3) and the MyBatis mapper against a real PostgreSQL.
 * Skipped automatically when Docker is unavailable.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest
class ProductMapperTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    /** Seed "today": after every seeded effective_from, so every product has a current rate. */
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    @Autowired
    private ProductMapper productMapper;

    @Test
    void countAndFilterByRateType() {
        assertThat(productMapper.countProducts(null, TODAY)).isEqualTo(8);
        assertThat(productMapper.countProducts(RateType.VARIABLE, TODAY)).isEqualTo(3);
        assertThat(productMapper.countProducts(RateType.FIXED_FULL, TODAY)).isEqualTo(2);
        assertThat(productMapper.countProducts(RateType.FIXED_PERIOD, TODAY)).isEqualTo(3);

        List<ProductSummary> fixedPeriod = productMapper.findProducts(
                RateType.FIXED_PERIOD, "RATE_ASC", TODAY, 0, 100);
        assertThat(fixedPeriod).hasSize(3)
                .allSatisfy(p -> {
                    assertThat(p.rateType()).isEqualTo(RateType.FIXED_PERIOD);
                    assertThat(p.fixedPeriodYears()).isIn(3, 5, 10);
                });
    }

    @Test
    void rateAsc_isNonDecreasing_andStartsWithLowest() {
        List<ProductSummary> items = productMapper.findProducts(null, "RATE_ASC", TODAY, 0, 100);
        assertThat(items).hasSize(8);
        assertThat(items.get(0).id()).isEqualTo(1L);
        assertThat(items.get(0).annualRatePercent()).isEqualByComparingTo("0.45");
        for (int i = 1; i < items.size(); i++) {
            assertThat(items.get(i).annualRatePercent())
                    .isGreaterThanOrEqualTo(items.get(i - 1).annualRatePercent());
        }
    }

    @Test
    void rateDesc_isNonIncreasing_andStartsWithHighest() {
        List<ProductSummary> items = productMapper.findProducts(null, "RATE_DESC", TODAY, 0, 100);
        assertThat(items).hasSize(8);
        assertThat(items.get(0).id()).isEqualTo(7L);
        assertThat(items.get(0).annualRatePercent()).isEqualByComparingTo("2.10");
        for (int i = 1; i < items.size(); i++) {
            assertThat(items.get(i).annualRatePercent())
                    .isLessThanOrEqualTo(items.get(i - 1).annualRatePercent());
        }
    }

    @Test
    void nameAsc_returnsAllProductsOnce() {
        List<ProductSummary> items = productMapper.findProducts(null, "NAME_ASC", TODAY, 0, 100);
        Set<Long> ids = items.stream().map(ProductSummary::id).collect(Collectors.toSet());
        assertThat(items).hasSize(8);
        assertThat(ids).containsExactlyInAnyOrder(1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L);
    }

    @Test
    void paging_coversAllRowsWithoutOverlap() {
        List<ProductSummary> page0 = productMapper.findProducts(null, "RATE_ASC", TODAY, 0, 3);
        List<ProductSummary> page1 = productMapper.findProducts(null, "RATE_ASC", TODAY, 3, 3);
        List<ProductSummary> page2 = productMapper.findProducts(null, "RATE_ASC", TODAY, 6, 3);
        List<ProductSummary> page3 = productMapper.findProducts(null, "RATE_ASC", TODAY, 9, 3);

        assertThat(page0).hasSize(3);
        assertThat(page1).hasSize(3);
        assertThat(page2).hasSize(2);
        assertThat(page3).isEmpty();

        Set<Long> all = new java.util.HashSet<>();
        for (List<ProductSummary> page : List.of(page0, page1, page2)) {
            page.forEach(p -> assertThat(all.add(p.id())).isTrue());
        }
        assertThat(all).hasSize(8);
    }

    @Test
    void currentRate_isLatestEffectiveOnOrBeforeToday() {
        ProductSummary now = productMapper.findProductById(1L, TODAY);
        assertThat(now.annualRatePercent()).isEqualByComparingTo("0.45");
        assertThat(now.rateEffectiveFrom()).isEqualTo(LocalDate.of(2026, 11, 3));

        // Before the 2026-11-03 rate takes effect, the 2026-08-01 rate is current.
        ProductSummary earlier = productMapper.findProductById(1L, LocalDate.of(2026, 10, 15));
        assertThat(earlier.annualRatePercent()).isEqualByComparingTo("0.50");
        assertThat(earlier.rateEffectiveFrom()).isEqualTo(LocalDate.of(2026, 8, 1));
    }

    @Test
    void productWithNoRateOnOrBeforeToday_isExcluded() {
        LocalDate beforeAllSeeds = LocalDate.of(2026, 1, 1);
        assertThat(productMapper.countProducts(null, beforeAllSeeds)).isZero();
        assertThat(productMapper.findProducts(null, "RATE_ASC", beforeAllSeeds, 0, 100)).isEmpty();
        assertThat(productMapper.findProductById(1L, beforeAllSeeds)).isNull();
    }

    @Test
    void staleProduct_keepsOldEffectiveDate() {
        ProductSummary stale = productMapper.findProductById(5L, TODAY);
        assertThat(stale.rateEffectiveFrom()).isEqualTo(LocalDate.of(2026, 10, 1));
        assertThat(stale.fixedPeriodYears()).isEqualTo(10);
        assertThat(stale.institutionName()).isEqualTo("サンプル銀行B");
        assertThat(stale.rateSourceUrl()).startsWith("https://example.com/sample/");
    }

    @Test
    void unknownId_returnsNull() {
        assertThat(productMapper.findProductById(999_999L, TODAY)).isNull();
    }

    @Test
    void fees_areReturnedForProduct() {
        List<ProductFee> fees = productMapper.findFees(4L);
        assertThat(fees).hasSize(2);
        assertThat(fees).extracting(ProductFee::feeType).containsExactly("ARRANGEMENT", "GUARANTEE");
        assertThat(fees.get(0).amount()).isEqualByComparingTo("33000");
        assertThat(fees.get(0).ratePercent()).isNull();
        assertThat(fees.get(1).amount()).isNull();
        assertThat(fees.get(1).ratePercent()).isEqualByComparingTo("2.2");
    }

    @Test
    void rateHistory_isNewestFirst_andIncludesCurrent() {
        List<RateHistoryEntry> history = productMapper.findRateHistory(1L);
        assertThat(history).hasSize(3);
        assertThat(history).extracting(RateHistoryEntry::effectiveFrom)
                .containsExactly(LocalDate.of(2026, 11, 3), LocalDate.of(2026, 8, 1), LocalDate.of(2026, 5, 1));
        assertThat(history.get(1).annualRatePercent()).isEqualByComparingTo(new BigDecimal("0.50"));
    }
}
