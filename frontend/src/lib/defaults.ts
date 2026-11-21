// 各ツールの入力欄の初期値（共通の既定値）。
//
// 方針: 借入額 = 物件価格 + 諸費用 − 頭金 が成り立つように揃える。
//   借入額 4,000万円 = 物件価格 4,000万円 × (1 + 諸費用10%) − 頭金 400万円
//   = 4,400万円 − 400万円 = 4,000万円
// 金利 1.2%・返済期間 35年・年収 500万円は、ツールをまたいで同じ値にそろえる。
// 文字列は各フォームの入力値と同じ形（万円単位の数値文字列）で持つ。
//
// 意図的に各ツール側に残す値（ここには入れない）:
// - 金利タイプ比較の固定金利（固定期間 1.4% / 終了後 2.0% / 全期間固定 1.8%）
// - ライフプランの貯蓄・家族関連の値
// - 税額控除の配偶者（パートナー）の年収（300万円）、ライフプランの手取り年収（400万円）
// - 借り換え（Refinancer）の残債（3000万円）・金利・期間（ツール固有の値）
// - 借り換え諸費用は DEFAULT_REFINANCE_COSTS_MAN（下記）で別に持つ
// - 審査金利・返済負担率（Eligibility の仮置き値）、賃貸比較の分析期間など

/** 借入額（万円）。 */
export const DEFAULT_PRINCIPAL_MAN = "4000";
/** 金利（年率 %）。 */
export const DEFAULT_RATE = "1.2";
/** 返済期間（年）。 */
export const DEFAULT_YEARS = "35";
/** 年収（万円）。 */
export const DEFAULT_INCOME_MAN = "500";
/** 物件価格（万円）。借入額 = 物件価格 + 諸費用 − 頭金 の整合で 4,000万円。 */
export const DEFAULT_PRICE_MAN = "4000";
/** 頭金（万円）。 */
export const DEFAULT_DOWN_MAN = "400";
/** 諸費用の割合（物件価格に対する %）。 */
export const DEFAULT_CLOSING_RATE = "10";
/** 購入予算の希望する毎月の返済額（万円/月）。借入4,000万円・金利1.2%・35年の元利均等の毎月返済額 116,680.9円 ≈ 11.7万円（小数点以下1桁に丸め）。 */
export const DEFAULT_MONTHLY_MAN = "11.7";
/**
 * 借り換え諸費用（万円）。残債3,000万円 × 2.5% ≈ 75万円。
 * 根拠（公式値ではない仮置き）: 借入額の1.5〜3.0%程度が一般的な目安とされ、
 * 定率型（事務手数料 2.2% + 登録免許税 0.4% + 司法書士報酬 等 ≈ 2.7〜3.0%）と
 * 定額型（手数料 + 保証料 ≈ 1.9%）の差を中間でとった値。金融機関により大きく異なる。
 */
export const DEFAULT_REFINANCE_COSTS_MAN = "75";
/** 返済方式。 */
export const DEFAULT_METHOD = "EQUAL_PAYMENT" as const;

// 保有コストの初期値（円。すべて仮置きで、公式な計算値ではない）。
// マンション（住戸面積 約70㎡）を想定した目安。戸建てでは管理費を0にし、修繕は別途見込む。
// - 管理費 12,000円/月: 国土交通省「令和5年度マンション総合調査」の平均 約11,500円/月 を切り上げ。
// - 修繕積立金 17,000円/月: 同調査の平均 約13,000円/月、および「修繕積立金ガイドライン」（令和6年6月改定）
//   の平均 252円/㎡・月 × 約70㎡ ≈ 17,600円/月 の間。
// - 固定資産税・都市計画税 200,000円/年: 標準税率（固定資産税 1.4% / 都市計画税 0.3%）と新築軽減の終了後を
//   ふまえた大まかな平均。地域・特例で大きく変わる。
// - 火災・地震保険料 24,000円/年: 損害保険料率算出機構などの目安。構造・地域で大きく変わる。
export const DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN = 12_000;
export const DEFAULT_REPAIR_RESERVE_MONTHLY_YEN = 17_000;
export const DEFAULT_PROPERTY_TAX_YEARLY_YEN = 200_000;
export const DEFAULT_INSURANCE_YEARLY_YEN = 24_000;

/** ライフプランの「毎月の住居費（ローン以外）」の初期値（円/月）= 管理費 + 修繕積立金。 */
export const DEFAULT_HOUSING_MONTHLY_YEN = DEFAULT_MANAGEMENT_FEE_MONTHLY_YEN + DEFAULT_REPAIR_RESERVE_MONTHLY_YEN;
/** ライフプランの「毎年の住居費（固定資産税・保険など）」の初期値（円/年）= 固定資産税等 + 保険料。 */
export const DEFAULT_HOUSING_TAX_YEARLY_YEN = DEFAULT_PROPERTY_TAX_YEARLY_YEN + DEFAULT_INSURANCE_YEARLY_YEN;
