package com.example.mortgage.ratescenario.domain;

import java.util.List;

/**
 * @param baseline  plain schedule at the starting rate (no rise)
 * @param scenarios one entry per risePoints value, in the same order as the input
 */
public record RateRiseComparison(RateRiseScenario baseline, List<RateRiseScenario> scenarios) {
}
