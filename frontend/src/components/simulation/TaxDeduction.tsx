"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateTaxDeduction,
  type EnergyClass,
  type HousingType,
  type TaxDeductionRequest,
  type TaxDeductionResponse,
} from "@/lib/api/taxDeduction";
import {
  DEFAULT_SOCIAL_INSURANCE_RATE,
  MOVE_IN_YEARS,
  dateLabel,
  ineligibleMessage,
  isHttpUrl,
  isUnderTenYears,
  legacyExceptionKind,
  legacyExceptionLabel,
  manOrYen,
  simulationHref,
  validateTaxDeduction,
  type TaxDeductionForm,
} from "@/lib/taxDeduction";
import { yen } from "@/lib/simulation";
import TaxDeductionChart from "./TaxDeductionChart";
import { STEP_MAN_LARGE, STEP_PERCENT, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";

type Outcome = { key: string; data?: TaxDeductionResponse; error?: string };

const initial: TaxDeductionForm = {
  housingType: "NEW",
  energyClass: "ENERGY_STANDARD",
  moveInYear: "2026",
  moveInMonth: "4",
  childcare: false,
  floorAreaOver50: true,
  legacyException: false,
  principalMan: "3000",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  incomeMan: "600",
  socialInsuranceRate: DEFAULT_SOCIAL_INSURANCE_RATE,
};

const HOUSING: { value: HousingType; label: string }[] = [
  { value: "NEW", label: "新築" },
  { value: "USED", label: "中古" },
  { value: "RESALE", label: "買取再販" },
];

const ENERGY: { value: EnergyClass; label: string; desc: string }[] = [
  {
    value: "CERTIFIED",
    label: "認定住宅（長期優良住宅・低炭素住宅）",
    desc: "「認定長期優良住宅」または「認定低炭素住宅」の認定を受けた住宅です。いわゆる「長期優良住宅」はこの区分です。",
  },
  { value: "ZEH", label: "ZEH水準省エネ住宅", desc: "断熱等級5以上かつ一次エネルギー消費量等級6以上の住宅です。" },
  { value: "ENERGY_STANDARD", label: "省エネ基準適合住宅", desc: "断熱等級4以上かつ一次エネルギー消費量等級4以上の住宅です。" },
  { value: "OTHER", label: "その他の住宅", desc: "上の3つに当てはまらない住宅です。" },
];

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

const yenCell = (n: number) => n.toLocaleString("ja-JP");

export default function TaxDeduction({ initialValues }: { initialValues?: Partial<TaxDeductionForm> }) {
  const [form, setForm] = useState<TaxDeductionForm>({ ...initial, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validateTaxDeduction(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: TaxDeductionRequest = request;
    const timer = setTimeout(() => {
      calculateTaxDeduction(body, ctrl.signal)
        .then((data) => setOutcome({ key, data }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setOutcome({ key, error: errorMessage(e) });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // request is fully captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof TaxDeductionForm>(k: K, v: TaxDeductionForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;
  const shown = data && request ? request : null;

  const legacyKind = legacyExceptionKind(form);

  type NumKey = "principalMan" | "rate" | "years" | "incomeMan" | "socialInsuranceRate";
  function field(id: NumKey, label: string, unit: string, opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal"; extra?: React.ReactNode }) {
    return (
      <NumberField
        id={`td-${id}`}
        label={label}
        unit={unit}
        value={form[id]}
        onChange={(v) => set(id, v)}
        onBlur={blur(id)}
        step={opts.step}
        hint={opts.hint}
        error={err(id)}
        inputMode={opts.inputMode}
        extra={opts.extra}
      />
    );
  }

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="住宅ローン控除の条件">
        <fieldset className="fs-group">
          <legend>住宅</legend>

          <fieldset className="field">
            <legend>住宅の種類</legend>
            {HOUSING.map((h) => (
              <label className="radio" key={h.value}>
                <input
                  type="radio"
                  name="td-housing"
                  checked={form.housingType === h.value}
                  onChange={() => set("housingType", h.value)}
                />
                {h.label}
              </label>
            ))}
          </fieldset>

          <fieldset className="field">
            <legend>住宅の性能区分</legend>
            {ENERGY.map((en) => (
              <label className="radio-block" key={en.value}>
                <input
                  type="radio"
                  name="td-energy"
                  checked={form.energyClass === en.value}
                  onChange={() => set("energyClass", en.value)}
                />
                <span>
                  <span className="rb-label">{en.label}</span>
                  <span className="rb-desc">{en.desc}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="field-pair">
            <div className="field">
              <label htmlFor="td-moveInYear">入居年</label>
              <select id="td-moveInYear" value={form.moveInYear} onChange={(ev) => set("moveInYear", ev.target.value)}>
                {MOVE_IN_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="td-moveInMonth">借入実行月</label>
              <select id="td-moveInMonth" value={form.moveInMonth} onChange={(ev) => set("moveInMonth", ev.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}月
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hint" style={{ marginTop: -10, marginBottom: 14 }}>
            借入実行月は、1年目の年末残高を計算するために使います。
          </p>

          <div className="field">
            <label className="check">
              <input
                type="checkbox"
                checked={form.childcare}
                onChange={(ev) => set("childcare", ev.target.checked)}
                aria-describedby="td-childcare-hint"
              />
              子育て世帯・若者夫婦世帯に該当する
            </label>
            <p className="hint check-hint" id="td-childcare-hint">
              19歳未満の扶養親族がいる、または夫婦のいずれかが40歳未満の世帯です。入居年の12月31日時点で判定します。
            </p>
          </div>

          <div className="field">
            <label className="check">
              <input
                type="checkbox"
                checked={form.floorAreaOver50}
                onChange={(ev) => set("floorAreaOver50", ev.target.checked)}
                aria-describedby="td-area-hint"
              />
              床面積が50㎡以上（約15.1坪以上）である
            </label>
            <p className="hint check-hint" id="td-area-hint">
              40㎡台（約12.1〜15.1坪）の住宅は、子育て世帯等の上乗せの対象外です。床面積は、登記簿（登記事項証明書）上の面積で判断されます。
            </p>
          </div>

          {legacyKind && (
            <div className="field">
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.legacyException}
                  onChange={(ev) => set("legacyException", ev.target.checked)}
                />
                {legacyExceptionLabel(legacyKind)}
              </label>
              <p className="hint check-hint">この条件に当てはまる場合は、住宅ローン減税の対象になる可能性があります。</p>
            </div>
          )}
        </fieldset>

        <fieldset className="fs-group">
          <legend>借入</legend>
          {field("principalMan", "借入金額", "万円", { step: STEP_MAN_LARGE, hint: "例：3000万円 ＝ 30,000,000円" })}
          {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "0〜20%で入力できます。" })}
          {field("years", "返済期間", "年", {
            step: "1",
            inputMode: "numeric",
            hint: "1〜50年の整数で入力できます。",
            extra: isUnderTenYears(form.years) ? (
              <p className="info-msg" role="note">
                返済期間が10年未満のローンは、住宅ローン減税の対象外となる可能性があります。
              </p>
            ) : null,
          })}
          <fieldset className="field">
            <legend>返済方式</legend>
            <label className="radio">
              <input
                type="radio"
                name="td-method"
                checked={form.method === "EQUAL_PAYMENT"}
                onChange={() => set("method", "EQUAL_PAYMENT")}
              />
              元利均等返済
            </label>
            <label className="radio">
              <input
                type="radio"
                name="td-method"
                checked={form.method === "EQUAL_PRINCIPAL"}
                onChange={() => set("method", "EQUAL_PRINCIPAL")}
              />
              元金均等返済
            </label>
          </fieldset>
        </fieldset>

        <fieldset className="fs-group">
          <legend>収入</legend>
          {field("incomeMan", "年収（額面）", "万円", {
            step: STEP_MAN_LARGE,
            hint: "税額の推計に使います。",
          })}
          <details className="advanced">
            <summary>詳細設定</summary>
            {field("socialInsuranceRate", "社会保険料率（年収に対する割合）", "%", {
              step: STEP_PERCENT,
              hint: "実際の社会保険料率に近い値に変更できます。0〜30%で入力できます。",
            })}
          </details>
        </fieldset>
      </form>

      <section className="results" aria-labelledby="td-result-h" aria-busy={loading}>
        <h2 id="td-result-h">試算結果</h2>
        <div aria-live="polite" role="status" className="status">
          {!request && "入力内容に誤りがあります。左（上）のエラーを確認してください。"}
          {request && loading && "計算しています…"}
          {request && !loading && current?.data && "計算結果を更新しました。"}
        </div>

        {current?.error && (
          <div className="alert" role="alert">
            <p>{current.error}</p>
            <button type="button" onClick={() => setRetry((r) => r + 1)}>
              再計算する
            </button>
          </div>
        )}

        {data && shown && !data.eligible && (
          <div className={stale ? "stale" : undefined}>
            <div className="ineligible" role="note">
              <p>
                <strong>住宅ローン減税の対象外となる可能性があります</strong>
              </p>
              <p>{ineligibleMessage(data.ineligibleReason)}</p>
            </div>
          </div>
        )}

        {data && shown && data.eligible && data.rule && data.totals && data.assumptions && (
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="hint">控除額の合計の目安</p>
              <p className="big">約{manOrYen(data.totals.totalDeduction)}</p>
              <p className="hint">
                控除期間は{data.rule.deductionYears}年です。所得税と住民税から差し引かれる額の、期間中の合計を推計しています。
              </p>
            </div>

            <dl className="summary">
              <div>
                <dt>実質負担の目安</dt>
                <dd className="big">約{manOrYen(data.totals.netCost)}</dd>
              </div>
              <div>
                <dt>控除期間の返済額の合計</dt>
                <dd className="big">{yen(data.totals.totalPayment)}</dd>
              </div>
            </dl>
            <p className="hint">
              実質負担は、「控除期間の返済額の合計」から「控除額の合計」を引いた金額です。
              {data.totals.totalUnclaimed > 0 &&
                `この条件では、控除しきれない額が合計で約${manOrYen(data.totals.totalUnclaimed)}生じる推計です。`}
            </p>

            <div className="note" role="note">
              <p style={{ margin: 0 }}>
                適用された借入限度額：<strong>{yen(data.rule.limitAmount)}</strong>　控除率：
                <strong>{data.rule.ratePercent}%</strong>　子育て世帯等の上乗せ：
                <strong>{data.rule.childcareApplied ? "適用あり" : "適用なし"}</strong>
              </p>
            </div>

            {data.totals.listedYears < data.rule.deductionYears && (
              <p className="hint">返済期間が控除期間より短いため、表は{data.totals.listedYears}年分です。</p>
            )}

            <h3>年ごとの控除額の目安</h3>
            <div className="table-wrap plain td-table" tabIndex={0} role="region" aria-label="年ごとの控除額の表（横にスクロールできます）">
              <table className="compare">
                <caption className="sr-only">入居後の年ごとの住宅ローン控除額（円）</caption>
                <thead>
                  <tr>
                    <th scope="col">年</th>
                    <th scope="col">年末残高</th>
                    <th scope="col">控除枠</th>
                    <th scope="col">所得税から控除</th>
                    <th scope="col">住民税から控除</th>
                    <th scope="col">控除額</th>
                    <th scope="col">控除しきれない額</th>
                  </tr>
                </thead>
                <tbody>
                  {data.years.map((r) => (
                    <tr key={r.year}>
                      <th scope="row">
                        入居後{r.ordinal}年目（{r.year}年）
                      </th>
                      <td>{yenCell(r.yearEndBalance)}円</td>
                      <td>{yenCell(r.deductionCap)}円</td>
                      <td>{yenCell(r.incomeTaxCredit)}円</td>
                      <td>{yenCell(r.residentTaxCredit)}円</td>
                      <td>{yenCell(r.totalDeduction)}円</td>
                      <td className={r.unclaimed > 0 ? "unclaimed" : undefined}>{yenCell(r.unclaimed)}円</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              「控除枠」は、年末残高（借入限度額が上限）に{data.rule.ratePercent}%をかけた額です。住民税から控除する額は、翌年度の住民税から差し引かれます。
            </p>

            <h3>控除額の内訳（グラフ）</h3>
            <TaxDeductionChart rows={data.years} />

            <div className="panel-block">
              <h3>推計の前提</h3>
              <ul className="assume">
                <li>独身で、扶養親族はいない前提で税額を推計しています。</li>
                <li>
                  社会保険料率は年収の{data.assumptions.socialInsuranceRatePercent}%、年収は{yen(data.assumptions.annualIncome)}
                  で毎年同じ前提です。
                </li>
                <li>
                  給与所得控除は概算です（推計した給与所得：約{manOrYen(data.assumptions.estimatedTotalIncome)}、所得税の課税総所得金額等：約
                  {manOrYen(data.assumptions.estimatedIncomeTaxBase)}）。
                </li>
                <li>令和8年分・令和9年分の所得税の制度が、その後も続く前提です。</li>
                <li>
                  住民税から控除できる上限額は、前年分の所得税の課税総所得金額等の5%（最高9.75万円）です。この試算では、年収が毎年同じ前提で、年あたり
                  {yen(data.assumptions.residentCapPerYear)}を上限としています。
                </li>
                {data.assumptions.notes.includes("ADJUSTMENT_DEDUCTION_ASSUMED") && (
                  <li>個人住民税の調整控除は、2,500円として概算しています。</li>
                )}
                <li>繰上げ返済やボーナス返済は含まれていません。</li>
              </ul>
            </div>

            <div className="panel-block">
              <h3>根拠となる制度情報</h3>
              <ul className="src-list">
                <li>
                  借入限度額・控除期間（確認日：{dateLabel(data.rule.verifiedOn)}）：
                  {isHttpUrl(data.rule.sourceUrl) ? (
                    <>
                      {" "}
                      <a href={data.rule.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {data.rule.sourceUrl}
                        <span className="sr-only">（外部サイト・新しいタブで開きます）</span>
                      </a>
                    </>
                  ) : (
                    ` ${data.rule.sourceUrl}`
                  )}
                </li>
                {data.assumptions.taxParameterSources.map((s) => (
                  <li key={s}>
                    税額の推計に使う数値（確認日：{dateLabel(data.assumptions!.taxParameterVerifiedOn)}）：
                    {isHttpUrl(s) ? (
                      <>
                        {" "}
                        <a href={s} target="_blank" rel="noopener noreferrer">
                          {s}
                          <span className="sr-only">（外部サイト・新しいタブで開きます）</span>
                        </a>
                      </>
                    ) : (
                      ` ${s}`
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <p className="hint">
              手続きは、1年目は確定申告で行います。会社員の方は、2年目以降は年末調整で手続きするのが一般的です。
            </p>

            <p className="cta cta-row">
              <Link
                className="btn-link"
                href={simulationHref(shown.principal, shown.annualRatePercent, shown.years)}
              >
                この条件で返済額を試算する
              </Link>
            </p>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。実際の控除額は、住宅の要件、扶養親族や各種控除の状況、年末の借入残高などによって異なります。確定申告や年末調整の際は、税務署等でご確認ください。
        </p>
      </section>
    </div>
  );
}
