package com.example.mortgage.ratetype.domain;

/** The four compared cases, in response order. */
public enum RateType {
    /** 変動金利・金利が変わらない場合 (single stage at the variable rate). */
    VARIABLE_FLAT,
    /** 変動金利・金利が上昇した場合 (one rise after N years, re-amortized). */
    VARIABLE_RISE,
    /** 固定期間選択型 (fixed rate for N years, then re-amortized at the after-rate). */
    FIXED_PERIOD,
    /** 全期間固定 (single stage at the fixed rate). */
    FULL_FIXED
}
