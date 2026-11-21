package com.example.mortgage.product;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/** Product comparison use cases. Owns "today" so the rate selection is consistent per request. */
@Service
public class ProductService {

    private final ProductMapper productMapper;

    public ProductService(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public ProductListResponse findProducts(RateType rateType, ProductSort sort, int page, int size) {
        LocalDate today = LocalDate.now();
        long total = productMapper.countProducts(rateType, today);
        int totalPages = (int) ((total + size - 1) / size);
        long offset = (long) page * size;
        List<ProductSummary> items = productMapper.findProducts(rateType, sort.name(), today, offset, size);
        return new ProductListResponse(items, page, size, total, totalPages);
    }

    public ProductDetailResponse findProductDetail(long id) {
        LocalDate today = LocalDate.now();
        ProductSummary summary = productMapper.findProductById(id, today);
        if (summary == null) {
            throw new ProductNotFoundException();
        }
        return new ProductDetailResponse(
                summary.id(),
                summary.institutionName(),
                summary.productName(),
                summary.rateType(),
                summary.fixedPeriodYears(),
                summary.annualRatePercent(),
                summary.rateEffectiveFrom(),
                summary.rateSourceUrl(),
                productMapper.findFees(id),
                productMapper.findRateHistory(id));
    }
}
