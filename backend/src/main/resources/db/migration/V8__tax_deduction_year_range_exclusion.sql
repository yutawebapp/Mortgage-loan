-- 1. Forbid overlapping year ranges for the same business key (the lookups assume at most one row per key and year).
-- 2. Add the loan-term requirement (返済期間10年以上) as a sourced scalar parameter.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE housing_loan_deduction_rules
    ADD CONSTRAINT housing_loan_deduction_rules_no_year_overlap
    EXCLUDE USING gist (
        housing_type WITH =,
        energy_class WITH =,
        condition_code WITH =,
        int4range(move_in_year_from, move_in_year_to, '[]') WITH &&);

-- Business key of a bracket row: (table_code, sort_order) within a year range.
ALTER TABLE tax_brackets
    ADD CONSTRAINT tax_brackets_no_year_overlap
    EXCLUDE USING gist (
        table_code WITH =,
        sort_order WITH =,
        int4range(year_from, year_to, '[]') WITH &&);

ALTER TABLE tax_scalar_parameters
    ADD CONSTRAINT tax_scalar_parameters_no_year_overlap
    EXCLUDE USING gist (
        param_key WITH =,
        int4range(year_from, year_to, '[]') WITH &&);

-- Source: 国税庁 No.1211-1 共通の適用要件4「10年以上にわたり分割して返済する方法になっている」借入金
-- (令和8年4月1日現在法令等)。原文を 2026-11-24 に確認。
INSERT INTO tax_scalar_parameters
    (param_key, year_from, year_to, param_value, note, source_url, verified_on)
VALUES
    ('DEDUCTION_MIN_LOAN_YEARS', 2026, 2030, 10, '住宅ローンの返済期間の下限(年)',
     'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1211-1.htm', DATE '2026-11-24');
