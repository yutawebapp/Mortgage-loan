-- FICTIONAL sample data for development only. No real institution names or rates.
-- Source URLs point to example.com placeholders.

INSERT INTO institutions (id, name, kind) VALUES
    (1, 'サンプル銀行A', 'bank'),
    (2, 'サンプル銀行B', 'bank'),
    (3, 'サンプル信用金庫C', 'shinkin'),
    (4, 'サンプル信用金庫D', 'shinkin');

INSERT INTO products (id, institution_id, name, rate_type, fixed_period_years, max_term_years, max_loan_amount) VALUES
    (1, 1, 'サンプル変動金利A',           'VARIABLE',     NULL, 35, 100000000),
    (2, 1, 'サンプル全期間固定A',         'FIXED_FULL',   NULL, 35, 100000000),
    (3, 2, 'サンプル変動金利B',           'VARIABLE',     NULL, 35,  80000000),
    (4, 2, 'サンプル固定期間選択3年B',    'FIXED_PERIOD', 3,    35,  80000000),
    (5, 2, 'サンプル固定期間選択10年B',   'FIXED_PERIOD', 10,   35,  NULL),
    (6, 3, 'サンプル固定期間選択5年C',    'FIXED_PERIOD', 5,    35,  50000000),
    (7, 3, 'サンプル全期間固定C',         'FIXED_FULL',   NULL, 30,  50000000),
    (8, 4, 'サンプル変動金利D',           'VARIABLE',     NULL, 35,  60000000);

SELECT setval(pg_get_serial_sequence('institutions', 'id'), (SELECT MAX(id) FROM institutions));
SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products));

-- Rates. Current = latest effective_from <= today. Product 5 is deliberately stale (> 30 days old).
INSERT INTO rates (product_id, annual_rate, effective_from, source_url) VALUES
    -- product 1: current 0.45 (2026-11-03), history below
    (1, 0.45000, DATE '2026-11-03', 'https://example.com/sample/products/1'),
    (1, 0.50000, DATE '2026-08-01', 'https://example.com/sample/products/1'),
    (1, 0.55000, DATE '2026-05-01', 'https://example.com/sample/products/1'),
    -- product 2
    (2, 1.90000, DATE '2026-11-03', 'https://example.com/sample/products/2'),
    (2, 1.85000, DATE '2026-05-01', 'https://example.com/sample/products/2'),
    -- product 3
    (3, 0.60000, DATE '2026-11-10', 'https://example.com/sample/products/3'),
    (3, 0.65000, DATE '2026-06-01', 'https://example.com/sample/products/3'),
    -- product 4
    (4, 0.80000, DATE '2026-11-10', 'https://example.com/sample/products/4'),
    (4, 0.90000, DATE '2026-06-01', 'https://example.com/sample/products/4'),
    -- product 5 (STALE: current effective 2026-10-01)
    (5, 1.45000, DATE '2026-10-01', 'https://example.com/sample/products/5'),
    (5, 1.50000, DATE '2026-04-01', 'https://example.com/sample/products/5'),
    -- product 6
    (6, 1.10000, DATE '2026-11-12', 'https://example.com/sample/products/6'),
    (6, 1.20000, DATE '2026-07-01', 'https://example.com/sample/products/6'),
    -- product 7
    (7, 2.10000, DATE '2026-11-12', 'https://example.com/sample/products/7'),
    (7, 2.20000, DATE '2026-07-01', 'https://example.com/sample/products/7'),
    -- product 8
    (8, 0.70000, DATE '2026-11-05', 'https://example.com/sample/products/8'),
    (8, 0.75000, DATE '2026-02-01', 'https://example.com/sample/products/8');

-- Fees: every product has 事務手数料 (ARRANGEMENT) and 保証料 (GUARANTEE). Amount-based or rate-based.
INSERT INTO fees (product_id, fee_type, label, amount, rate_percent, effective_from, source_url) VALUES
    (1, 'ARRANGEMENT', '事務手数料', 22000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/1'),
    (1, 'GUARANTEE',   '保証料',       0, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/1'),
    (2, 'ARRANGEMENT', '事務手数料', 33000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/2'),
    (2, 'GUARANTEE',   '保証料',  110000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/2'),
    (3, 'ARRANGEMENT', '事務手数料', 22000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/3'),
    (3, 'GUARANTEE',   '保証料',       0, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/3'),
    (4, 'ARRANGEMENT', '事務手数料', 33000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/4'),
    (4, 'GUARANTEE',   '保証料',    NULL, 2.20000, DATE '2026-11-01', 'https://example.com/sample/products/4'),
    (5, 'ARRANGEMENT', '事務手数料', 33000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/5'),
    (5, 'GUARANTEE',   '保証料',    NULL, 2.20000, DATE '2026-11-01', 'https://example.com/sample/products/5'),
    (6, 'ARRANGEMENT', '事務手数料', NULL, 2.20000, DATE '2026-11-01', 'https://example.com/sample/products/6'),
    (6, 'GUARANTEE',   '保証料',    NULL, 2.20000, DATE '2026-11-01', 'https://example.com/sample/products/6'),
    (7, 'ARRANGEMENT', '事務手数料', 33000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/7'),
    (7, 'GUARANTEE',   '保証料',  110000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/7'),
    (8, 'ARRANGEMENT', '事務手数料', 22000, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/8'),
    (8, 'GUARANTEE',   '保証料',       0, NULL,    DATE '2026-11-01', 'https://example.com/sample/products/8');
