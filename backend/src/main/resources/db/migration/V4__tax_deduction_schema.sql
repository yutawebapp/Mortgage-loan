-- Housing loan tax deduction simulator (住宅ローン控除). Schema only; values are seeded in V5.

-- Deduction rules by housing type / energy class / condition (標準 STANDARD or 例外 EXEMPTION) and move-in year.
CREATE TABLE housing_loan_deduction_rules (
    id                     BIGSERIAL PRIMARY KEY,
    housing_type           VARCHAR(20)   NOT NULL CHECK (housing_type IN ('NEW', 'USED', 'RESALE')),
    energy_class           VARCHAR(30)   NOT NULL CHECK (energy_class IN ('CERTIFIED', 'ZEH', 'ENERGY_STANDARD', 'OTHER')),
    condition_code         VARCHAR(20)   NOT NULL CHECK (condition_code IN ('STANDARD', 'EXEMPTION')),
    move_in_year_from      INTEGER       NOT NULL,
    move_in_year_to        INTEGER       NOT NULL,
    limit_amount           NUMERIC(15, 0) NOT NULL CHECK (limit_amount > 0),
    limit_amount_childcare NUMERIC(15, 0) NOT NULL CHECK (limit_amount_childcare >= limit_amount),
    deduction_years        INTEGER       NOT NULL CHECK (deduction_years IN (10, 13)),
    rate_percent           NUMERIC(4, 2) NOT NULL CHECK (rate_percent = 0.70),
    note                   VARCHAR(500)  NOT NULL DEFAULT '',
    source_url             VARCHAR(2000) NOT NULL,
    verified_on            DATE          NOT NULL,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CHECK (move_in_year_from <= move_in_year_to)
);

CREATE INDEX idx_deduction_rules_lookup
    ON housing_loan_deduction_rules (housing_type, energy_class, condition_code);

-- Income-tax style bracket tables. Formula per row: value * rate_percent / 100 + amount.
-- Rows are matched in sort_order; upper_limit is inclusive and NULL means "no upper bound" (last row).
-- table_code: SALARY_DEDUCTION (給与所得控除), BASIC_DEDUCTION (所得税の基礎控除), INCOME_TAX (所得税 速算表).
CREATE TABLE tax_brackets (
    id           BIGSERIAL PRIMARY KEY,
    table_code   VARCHAR(30)   NOT NULL CHECK (table_code IN ('SALARY_DEDUCTION', 'BASIC_DEDUCTION', 'INCOME_TAX')),
    year_from    INTEGER       NOT NULL,
    year_to      INTEGER       NOT NULL,
    sort_order   INTEGER       NOT NULL,
    upper_limit  NUMERIC(15, 0),
    rate_percent NUMERIC(6, 2) NOT NULL,
    amount       NUMERIC(15, 0) NOT NULL,
    note         VARCHAR(500)  NOT NULL DEFAULT '',
    source_url   VARCHAR(2000) NOT NULL,
    verified_on  DATE          NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (table_code, year_from, sort_order),
    CHECK (year_from <= year_to)
);

-- Scalar tax parameters (key/value per tax-year range).
CREATE TABLE tax_scalar_parameters (
    id           BIGSERIAL PRIMARY KEY,
    param_key    VARCHAR(60)   NOT NULL,
    year_from    INTEGER       NOT NULL,
    year_to      INTEGER       NOT NULL,
    param_value  NUMERIC(15, 4) NOT NULL,
    note         VARCHAR(500)  NOT NULL DEFAULT '',
    source_url   VARCHAR(2000) NOT NULL,
    verified_on  DATE          NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (param_key, year_from),
    CHECK (year_from <= year_to)
);
