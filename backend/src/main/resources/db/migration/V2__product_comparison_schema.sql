-- Phase 3 (product comparison). Adjusts the Phase 1 schema in V1 without editing it.

-- rate_type: V1 allowed FIXED / VARIABLE / MIXED. Phase 3 uses the three product kinds in design.md.
ALTER TABLE products DROP CONSTRAINT products_rate_type_check;
ALTER TABLE products
    ADD CONSTRAINT products_rate_type_check
        CHECK (rate_type IN ('VARIABLE', 'FIXED_FULL', 'FIXED_PERIOD'));

-- Fixed-period years (固定期間選択型 only).
ALTER TABLE products ADD COLUMN fixed_period_years INTEGER;
ALTER TABLE products
    ADD CONSTRAINT products_fixed_period_years_check
        CHECK (fixed_period_years IN (3, 5, 10));
ALTER TABLE products
    ADD CONSTRAINT products_fixed_period_consistency_check
        CHECK ((rate_type = 'FIXED_PERIOD') = (fixed_period_years IS NOT NULL));

-- Human-readable fee label shown in the UI (e.g. 事務手数料, 保証料).
ALTER TABLE fees ADD COLUMN label VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE fees
    ADD CONSTRAINT fees_amount_or_rate_check
        CHECK (amount IS NOT NULL OR rate_percent IS NOT NULL);
