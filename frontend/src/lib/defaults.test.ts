import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLOSING_RATE,
  DEFAULT_DOWN_MAN,
  DEFAULT_HOUSING_MONTHLY_YEN,
  DEFAULT_HOUSING_TAX_YEARLY_YEN,
  DEFAULT_INSURANCE_YEARLY_YEN,
  DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN,
  DEFAULT_MONTHLY_MAN,
  DEFAULT_PRICE_MAN,
  DEFAULT_PRINCIPAL_MAN,
  DEFAULT_PROPERTY_TAX_YEARLY_YEN,
  DEFAULT_RATE,
  DEFAULT_REPAIR_RESERVE_MONTHLY_YEN,
  DEFAULT_YEARS,
} from "./defaults";

// 期待値は Python で独立に計算（テスト対象コードで作っていない）:
//   P=40,000,000, r=0.012/12, n=420 → 元利均等の毎月返済額 = P*r/(1-(1+r)^-n) = 116,680.9円
//   毎月11.7万円で借りられる額 = 117,000 * (1-(1+r)^-n)/r = 40,109,387円
//   その借入額から物件価格 = (借入額 + 頭金400万) / 1.1 = 40,099,443円
describe("unified default values", () => {
  const principal = Number(DEFAULT_PRINCIPAL_MAN);
  const rate = Number(DEFAULT_RATE) / 100 / 12;
  const months = Number(DEFAULT_YEARS) * 12;
  const annuityFactor = (1 - (1 + rate) ** -months) / rate;

  it("借入額 = 物件価格 × (1 + 諸費用の割合) − 頭金 が成り立つ", () => {
    const price = Number(DEFAULT_PRICE_MAN);
    const down = Number(DEFAULT_DOWN_MAN);
    const closingRate = Number(DEFAULT_CLOSING_RATE);
    const loan = price * (1 + closingRate / 100) - down;
    expect(loan).toBeCloseTo(principal, 6);
  });

  it("毎月の返済額の初期値は、初期の借入額・金利・期間の元利均等返済に近い", () => {
    const payment = (principal * 10_000 * rate) / (1 - (1 + rate) ** -months); // 円
    expect(payment).toBeCloseTo(116_680.9, 0);
    expect(Math.abs(payment / 10_000 - Number(DEFAULT_MONTHLY_MAN))).toBeLessThan(0.05); // 万円
  });

  it("毎月の返済額の初期値から逆算した借入額・物件価格は、約4,000万円になる（Python と照合）", () => {
    const loan = Number(DEFAULT_MONTHLY_MAN) * 10_000 * annuityFactor; // 円
    expect(loan).toBeCloseTo(40_109_387, -1);
    expect(Math.abs(loan - principal * 10_000) / (principal * 10_000)).toBeLessThan(0.005); // 4,000万の±0.5%
    const price = (loan + Number(DEFAULT_DOWN_MAN) * 10_000) / (1 + Number(DEFAULT_CLOSING_RATE) / 100);
    expect(price).toBeCloseTo(40_099_443, -1);
  });

  it("ライフプランの住居費の初期値は、保有コストの各項目の合計と一致する（戸建ての目安）", () => {
    // 期待値は直接の数値（管理費0 + 修繕・メンテナンス費17,000 = 17,000 / 固定資産税等200,000 + 保険40,000 = 240,000）
    expect(DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN).toBe(0);
    expect(DEFAULT_REPAIR_RESERVE_MONTHLY_YEN).toBe(17_000);
    expect(DEFAULT_PROPERTY_TAX_YEARLY_YEN).toBe(200_000);
    expect(DEFAULT_INSURANCE_YEARLY_YEN).toBe(40_000);
    expect(DEFAULT_HOUSING_MONTHLY_YEN).toBe(
      DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN + DEFAULT_REPAIR_RESERVE_MONTHLY_YEN,
    );
    expect(DEFAULT_HOUSING_MONTHLY_YEN).toBe(17_000);
    expect(DEFAULT_HOUSING_TAX_YEARLY_YEN).toBe(DEFAULT_PROPERTY_TAX_YEARLY_YEN + DEFAULT_INSURANCE_YEARLY_YEN);
    expect(DEFAULT_HOUSING_TAX_YEARLY_YEN).toBe(240_000);
  });
});
