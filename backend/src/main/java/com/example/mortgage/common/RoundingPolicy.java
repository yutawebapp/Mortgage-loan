package com.example.mortgage.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Single place that defines how money amounts are rounded.
 * Change {@link #MODE} here to change the rounding rule for the whole application.
 */
public final class RoundingPolicy {

    /** Amounts are rounded to whole yen with this mode. */
    public static final RoundingMode MODE = RoundingMode.HALF_UP;

    private RoundingPolicy() {
    }

    /** Rounds a money value to whole yen (scale 0). */
    public static BigDecimal yen(BigDecimal value) {
        return value.setScale(0, MODE);
    }
}
