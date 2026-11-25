-- National MLIT overview, checked 2026-11-21. Validity here is by move-in year.
INSERT INTO tax_scalar_parameters
    (param_key, year_from, year_to, param_value, note, source_url, verified_on)
VALUES
    ('DEDUCTION_INCOME_LIMIT', 2026, 2030, 20000000, '合計所得金額上限', 'https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk2_000023.html', DATE '2026-11-21'),
    ('DEDUCTION_AREA_40S_INCOME_LIMIT', 2026, 2030, 10000000, '40㎡以上50㎡未満の合計所得金額上限', 'https://www.mlit.go.jp/jutakukentiku/house/zeisei_index2.html', DATE '2026-11-21'),
    ('DEDUCTION_MIN_AREA_SQM', 2026, 2030, 40, '床面積の下限', 'https://www.mlit.go.jp/jutakukentiku/house/zeisei_index2.html', DATE '2026-11-21'),
    ('DEDUCTION_STANDARD_AREA_SQM', 2026, 2030, 50, '所得上限緩和・子育て上乗せの床面積', 'https://www.mlit.go.jp/jutakukentiku/house/zeisei_index2.html', DATE '2026-11-21');
