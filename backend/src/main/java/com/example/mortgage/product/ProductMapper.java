package com.example.mortgage.product;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

/**
 * SQL lives in mapper/ProductMapper.xml. "Current rate" = latest rate with effective_from <= today.
 * Products without any rate on or before today are excluded.
 */
@Mapper
public interface ProductMapper {

    long countProducts(@Param("rateType") RateType rateType, @Param("today") LocalDate today);

    /**
     * @param sort one of {@link ProductSort} names; selects the ORDER BY via &lt;choose&gt; (never concatenated)
     */
    List<ProductSummary> findProducts(@Param("rateType") RateType rateType,
                                      @Param("sort") String sort,
                                      @Param("today") LocalDate today,
                                      @Param("offset") long offset,
                                      @Param("limit") int limit);

    /** @return the product with its current rate, or null when the id is unknown */
    ProductSummary findProductById(@Param("id") long id, @Param("today") LocalDate today);

    List<ProductFee> findFees(@Param("productId") long productId);

    /** All rate rows of the product, newest effective_from first. */
    List<RateHistoryEntry> findRateHistory(@Param("productId") long productId);
}
