-- Seed for the housing loan tax deduction simulator. Values are the verified parameters in docs/design.md 7.5.
-- Every row carries source_url and verified_on (2026-11-17). Tax-year rows cover 2026-2030 (assumed to continue).

-- ---------------------------------------------------------------------------
-- Deduction rules (国交省 住宅ローン減税 Q&A). Amounts in yen. Move-in years 2026-2030.
-- ---------------------------------------------------------------------------
INSERT INTO housing_loan_deduction_rules
    (housing_type, energy_class, condition_code, move_in_year_from, move_in_year_to,
     limit_amount, limit_amount_childcare, deduction_years, rate_percent, note, source_url, verified_on)
VALUES
    -- NEW (新築) STANDARD
    ('NEW', 'CERTIFIED', 'STANDARD', 2026, 2030, 45000000, 50000000, 13, 0.70,
     '新築・認定住宅(長期優良住宅・低炭素住宅)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('NEW', 'ZEH', 'STANDARD', 2026, 2030, 35000000, 45000000, 13, 0.70,
     '新築・ZEH水準省エネ住宅', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('NEW', 'ENERGY_STANDARD', 'STANDARD', 2026, 2027, 20000000, 30000000, 13, 0.70,
     '新築・省エネ基準適合住宅(2026-2027年入居のみ)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    -- NEW (新築) EXEMPTION (2023年末までに新築/建築確認要件などの例外)
    ('NEW', 'ENERGY_STANDARD', 'EXEMPTION', 2028, 2030, 20000000, 20000000, 10, 0.70,
     '新築・省エネ基準適合住宅の例外(2027年末までに建築確認 or 2028/6/30までに建築)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('NEW', 'OTHER', 'EXEMPTION', 2026, 2030, 20000000, 20000000, 10, 0.70,
     '新築・その他(2023年末までに新築された家屋のみ)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    -- USED (中古) STANDARD
    ('USED', 'CERTIFIED', 'STANDARD', 2026, 2030, 35000000, 45000000, 13, 0.70,
     '中古・認定住宅', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('USED', 'ZEH', 'STANDARD', 2026, 2030, 35000000, 45000000, 13, 0.70,
     '中古・ZEH水準省エネ住宅', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('USED', 'ENERGY_STANDARD', 'STANDARD', 2026, 2030, 20000000, 30000000, 13, 0.70,
     '中古・省エネ基準適合住宅', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('USED', 'OTHER', 'STANDARD', 2026, 2030, 20000000, 20000000, 10, 0.70,
     '中古・その他', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    -- RESALE (買取再販) STANDARD: certified/ZEH as new, energy-standard/other as used
    ('RESALE', 'CERTIFIED', 'STANDARD', 2026, 2030, 45000000, 50000000, 13, 0.70,
     '買取再販・認定住宅(新築と同水準)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('RESALE', 'ZEH', 'STANDARD', 2026, 2030, 35000000, 45000000, 13, 0.70,
     '買取再販・ZEH水準省エネ住宅(新築と同水準)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('RESALE', 'ENERGY_STANDARD', 'STANDARD', 2026, 2030, 20000000, 30000000, 13, 0.70,
     '買取再販・省エネ基準適合住宅(中古と同水準)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17'),
    ('RESALE', 'OTHER', 'STANDARD', 2026, 2030, 20000000, 20000000, 10, 0.70,
     '買取再販・その他(中古と同水準)', 'https://www.mlit.go.jp/jutakukentiku/house/content/002011976.pdf', DATE '2026-11-17');

-- ---------------------------------------------------------------------------
-- Bracket tables. Formula: value * rate_percent / 100 + amount. upper_limit inclusive, NULL = unbounded.
-- ---------------------------------------------------------------------------
-- 給与所得控除 (No.1410). NOTE: below 6,600,000 the legal basis is 別表第五; these formulas are an approximation.
INSERT INTO tax_brackets (table_code, year_from, year_to, sort_order, upper_limit, rate_percent, amount, note, source_url, verified_on) VALUES
    ('SALARY_DEDUCTION', 2026, 2030, 1, 2200000, 0,   740000,  '収入 〜220万円: 74万円固定', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm', DATE '2026-11-17'),
    ('SALARY_DEDUCTION', 2026, 2030, 2, 3600000, 30,  80000,   '〜360万円: 収入×30%+8万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm', DATE '2026-11-17'),
    ('SALARY_DEDUCTION', 2026, 2030, 3, 6600000, 20,  440000,  '〜660万円: 収入×20%+44万円(別表第五による本来値の近似)', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm', DATE '2026-11-17'),
    ('SALARY_DEDUCTION', 2026, 2030, 4, 8500000, 10,  1100000, '〜850万円: 収入×10%+110万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm', DATE '2026-11-17'),
    ('SALARY_DEDUCTION', 2026, 2030, 5, NULL,    0,   1950000, '850万円超: 195万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1410.htm', DATE '2026-11-17');

-- 所得税の基礎控除 by 合計所得金額 (No.1199, 令和8・9年分). Above 23,500,000 no row matches -> 0 (not reached: eligibility excludes > 20M).
INSERT INTO tax_brackets (table_code, year_from, year_to, sort_order, upper_limit, rate_percent, amount, note, source_url, verified_on) VALUES
    ('BASIC_DEDUCTION', 2026, 2030, 1, 4890000,  0, 1040000, '〜489万円: 104万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm', DATE '2026-11-17'),
    ('BASIC_DEDUCTION', 2026, 2030, 2, 6550000,  0, 670000,  '489万円超〜655万円: 67万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm', DATE '2026-11-17'),
    ('BASIC_DEDUCTION', 2026, 2030, 3, 23500000, 0, 620000,  '655万円超〜2,350万円: 62万円', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1199.htm', DATE '2026-11-17');

-- 所得税 速算表 (No.2260). Taxable income is floored to 1,000 yen before lookup.
INSERT INTO tax_brackets (table_code, year_from, year_to, sort_order, upper_limit, rate_percent, amount, note, source_url, verified_on) VALUES
    ('INCOME_TAX', 2026, 2030, 1, 1949000,  5,  0,        '〜194.9万円: 5%', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 2, 3299000, 10, -97500,    '〜329.9万円: 10%-97,500', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 3, 6949000, 20, -427500,   '〜694.9万円: 20%-427,500', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 4, 8999000, 23, -636000,   '〜899.9万円: 23%-636,000', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 5, 17999000, 33, -1536000, '〜1,799.9万円: 33%-1,536,000', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 6, 39999000, 40, -2796000, '〜3,999.9万円: 40%-2,796,000', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('INCOME_TAX', 2026, 2030, 7, NULL,     45, -4796000, '4,000万円〜: 45%-4,796,000', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17');

-- ---------------------------------------------------------------------------
-- Scalar parameters.
-- ---------------------------------------------------------------------------
INSERT INTO tax_scalar_parameters (param_key, year_from, year_to, param_value, note, source_url, verified_on) VALUES
    ('RECONSTRUCTION_TAX_RATE_PERCENT', 2026, 2030, 2.1,    '復興特別所得税(表示用のみ。税額の2.1%)', 'https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/2260.htm', DATE '2026-11-17'),
    ('RESIDENT_TAX_RATE_PERCENT',       2026, 2030, 10,     '個人住民税 所得割 一律10%', 'https://www.soumu.go.jp/main_content/001075462.pdf', DATE '2026-11-17'),
    ('RESIDENT_BASIC_DEDUCTION',        2026, 2030, 430000, '個人住民税 基礎控除 43万円', 'https://www.soumu.go.jp/main_content/001075462.pdf', DATE '2026-11-17'),
    ('RESIDENT_ADJUSTMENT_DEDUCTION',   2026, 2030, 2500,   '調整控除 2,500円固定(仮置き: 単身・基礎控除差5万円×5%。公式値ではない)', 'https://www.soumu.go.jp/main_content/001075462.pdf', DATE '2026-11-17'),
    ('RESIDENT_CREDIT_RATE_PERCENT',    2026, 2030, 5,      '総務省ページで確認済み(確認日 2026-11-17): 控除額は所得税の課税総所得金額等の5%を超えない', 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/090929.html', DATE '2026-11-17'),
    ('RESIDENT_CREDIT_CAP',             2026, 2030, 97500,  '総務省ページで確認済み(確認日 2026-11-17): 限度額97,500円', 'https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/090929.html', DATE '2026-11-17');
