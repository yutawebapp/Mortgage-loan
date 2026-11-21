-- Phase 1 minimal schema. Amounts/rates use NUMERIC for BigDecimal mapping.

CREATE TABLE institutions (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    kind        VARCHAR(50)  NOT NULL,            -- e.g. bank, shinkin, credit_union (seed data is fictional)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE products (
    id                     BIGSERIAL PRIMARY KEY,
    institution_id         BIGINT       NOT NULL REFERENCES institutions(id),
    name                   VARCHAR(200) NOT NULL,
    rate_type              VARCHAR(20)  NOT NULL CHECK (rate_type IN ('FIXED', 'VARIABLE', 'MIXED')),
    max_term_years         INTEGER      NOT NULL CHECK (max_term_years > 0),
    max_loan_amount        NUMERIC(15, 0),
    has_group_credit_life  BOOLEAN      NOT NULL DEFAULT FALSE,  -- 団信 (group credit life insurance)
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE rates (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT        NOT NULL REFERENCES products(id),
    annual_rate     NUMERIC(7, 5) NOT NULL CHECK (annual_rate >= 0),  -- percent, e.g. 1.25000
    effective_from  DATE          NOT NULL,
    source_url      VARCHAR(2000),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (product_id, effective_from)
);

CREATE TABLE fees (
    id              BIGSERIAL PRIMARY KEY,
    product_id      BIGINT        NOT NULL REFERENCES products(id),
    fee_type        VARCHAR(50)   NOT NULL,           -- e.g. guarantee, arrangement, stamp
    amount          NUMERIC(15, 0),                   -- yen, nullable when rate-based
    rate_percent    NUMERIC(7, 5),                    -- nullable when amount-based
    effective_from  DATE          NOT NULL,
    source_url      VARCHAR(2000),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_institution ON products(institution_id);
CREATE INDEX idx_rates_product_effective ON rates(product_id, effective_from DESC);
CREATE INDEX idx_fees_product ON fees(product_id);
