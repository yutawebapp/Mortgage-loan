package com.example.mortgage.product;

import java.util.Arrays;
import java.util.Optional;

/**
 * Whitelist of sort orders accepted by GET /products.
 * The mapper selects the ORDER BY clause by the enum name; user input never reaches SQL text.
 */
public enum ProductSort {
    RATE_ASC,
    RATE_DESC,
    NAME_ASC;

    public static final ProductSort DEFAULT = RATE_ASC;

    /**
     * Parses a raw query value. Null or blank yields {@link #DEFAULT}; unknown values yield empty.
     * Matching is exact (case-sensitive).
     */
    public static Optional<ProductSort> parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.of(DEFAULT);
        }
        return Arrays.stream(values())
                .filter(sort -> sort.name().equals(raw))
                .findFirst();
    }
}
