package com.example.mortgage.product;

import java.util.List;

public record ProductListResponse(
        List<ProductSummary> items,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
