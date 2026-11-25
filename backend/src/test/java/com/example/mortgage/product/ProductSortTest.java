package com.example.mortgage.product;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class ProductSortTest {

    @Test
    void whitelistIsExactlyTheThreeSupportedSorts() {
        Set<String> names = Arrays.stream(ProductSort.values()).map(Enum::name).collect(Collectors.toSet());
        assertThat(names).containsExactlyInAnyOrder("RATE_ASC", "RATE_DESC", "NAME_ASC");
    }

    @Test
    void defaultIsRateAsc() {
        assertThat(ProductSort.DEFAULT).isEqualTo(ProductSort.RATE_ASC);
    }

    @ParameterizedTest
    @ValueSource(strings = {"RATE_ASC", "RATE_DESC", "NAME_ASC"})
    void parse_acceptsWhitelistedNames(String raw) {
        assertThat(ProductSort.parse(raw)).contains(ProductSort.valueOf(raw));
    }

    @Test
    void parse_nullOrBlank_yieldsDefault() {
        assertThat(ProductSort.parse(null)).contains(ProductSort.RATE_ASC);
        assertThat(ProductSort.parse("")).contains(ProductSort.RATE_ASC);
        assertThat(ProductSort.parse("   ")).contains(ProductSort.RATE_ASC);
    }

    @ParameterizedTest
    @ValueSource(strings = {"rate_asc", "RATE_ASC ", "NAME", "id", "RATE_ASC; DROP TABLE products", "1 OR 1=1"})
    void parse_rejectsEverythingElse(String raw) {
        assertThat(ProductSort.parse(raw)).isEmpty();
    }
}
