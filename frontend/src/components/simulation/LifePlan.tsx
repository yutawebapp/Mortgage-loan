"use client";

import { parseNumericInput } from "@/lib/numericInput";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, calculateLifePlan, type LifePlanRequest, type LifePlanResponse } from "@/lib/api/lifePlan";
import {
  ADVANCED_KEYS,
  ASSUMPTION_LINE,
  MAX_CHILDREN,
  SCHOOL_PLANS,
  UNIVERSITY_PLANS,
  childError,
  dateLabel,
  isHttpUrl,
  lifePlanNoteMessages,
  manApprox,
  newChild,
  loanSentence,
  shortfallSentence,
  validateLifePlan,
  yenSigned,
  type ChildForm,
  type LifePlanForm,
  type ScalarKey,
} from "@/lib/lifePlan";
import {
  STEP_MAN_LARGE,
  STEP_MAN_MONTHLY,
  STEP_PERCENT,
  STEP_RATE,
  STEP_YEN_MONTHLY,
  STEP_YEN_YEARLY,
} from "@/lib/inputSteps";
import { acceptFor, hrefWith, sanitizeShared } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import { NumberField } from "./NumberField";
import {
  DEFAULT_HOUSING_MONTHLY_YEN,
  DEFAULT_HOUSING_TAX_YEARLY_YEN,
  DEFAULT_PRINCIPAL_MAN,
  DEFAULT_RATE,
  DEFAULT_YEARS,
} from "@/lib/defaults";
import { OutflowChart, SavingsChart } from "./LifePlanChart";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { lifePlanInitialFromQuery } from "@/lib/lifePlan";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: LifePlanResponse; error?: string };

// 手取り年収の初期値 400万円は、年収500万円の手取りのおおよその目安（仮置き。税・社会保険料の公式な計算値ではない）。
const initial: LifePlanForm = {
  age: "35",
  takeHomeMan: "400",
  livingMan: "20",
  savingsMan: "500",
  loanMan: DEFAULT_PRINCIPAL_MAN,
  rate: DEFAULT_RATE,
  years: DEFAULT_YEARS,
  children: [],
  retireAge: "65",
  pensionAge: "65",
  retireIncomeMan: "240",
  retireLivingMan: "22",
  growth: "0",
  returnRate: "0",
  endAge: "95",
  upfrontMan: "0",
  method: "EQUAL_PAYMENT",
  housingMonthly: String(DEFAULT_HOUSING_MONTHLY_YEN),
  housingTaxYearly: String(DEFAULT_HOUSING_TAX_YEARLY_YEN),
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

const cell = (n: number) => n.toLocaleString("ja-JP");

export default function LifePlan() {
  const [form, setForm] = useState<LifePlanForm>(initial);
  // 共通条件: 借入額（principalMan ↔ フォームの loanMan）・金利・返済期間
  const sharedNow = sanitizeShared({ principalMan: form.loanMan, rate: form.rate, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) =>
      setForm((f) => ({
        ...f,
        loanMan: patch.principalMan ?? f.loanMan,
        rate: patch.rate ?? f.rate,
        years: patch.years ?? f.years,
      })),
    accept: (c) => acceptFor("/life-plan", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(lifePlanInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);
  const [advOpen, setAdvOpen] = useState(false);

  const { request, errors } = useMemo(() => validateLifePlan(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: LifePlanRequest = request;
    const timer = setTimeout(() => {
      calculateLifePlan(body, ctrl.signal)
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

  const set = <K extends keyof LifePlanForm>(k: K, v: LifePlanForm[K]) => {
    // 借入額の欄（loanMan）は共通キー principalMan として記録する
    markEdited(k === "loanMan" ? "principalMan" : k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const show = outcome !== null;
  const err = (k: ScalarKey) => (touched[k] || show ? errors[k] : undefined);

  const setChild = (i: number, patch: Partial<ChildForm>) =>
    setForm((f) => ({ ...f, children: f.children.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));
  const addChild = () => setForm((f) => (f.children.length >= MAX_CHILDREN ? f : { ...f, children: [...f.children, newChild()] }));
  const removeChild = (i: number) => {
    setForm((f) => ({ ...f, children: f.children.filter((_, j) => j !== i) }));
    setTouched((t) => {
      const next = { ...t };
      for (let j = 0; j < MAX_CHILDREN; j++) delete next[`child-${j}-age`];
      return next;
    });
  };

  const advancedError = ADVANCED_KEYS.some((k) => !!err(k));
  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = request ? (current?.data ?? outcome?.data) : undefined;
  const stale = !!data && loading;
  const shown = data && request ? request : null;
  const hasLoan = parseNumericInput(form.loanMan) > 0;

  function field(
    id: ScalarKey,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" | "text" },
  ) {
    return (
      <NumberField
        id={`lp-${id}`}
        label={label}
        unit={unit}
        value={form[id]}
        onChange={(v) => set(id, v)}
        onBlur={blur(id)}
        step={opts.step}
        hint={opts.hint}
        error={err(id)}
        inputMode={opts.inputMode}
      />
    );
  }

  const last = data ? data.years[data.years.length - 1] : null;
  const notes = data ? lifePlanNoteMessages(data.notes) : [];
  const s = data?.summary;
  const retireAge = shown?.retireAge ?? 65;
  const endAge = shown?.lifeEndAge ?? last?.age ?? 95;

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="ライフプランの条件">
        <p className="info-msg" role="note">
          金額はすべて<strong>現在の価値</strong>で入力（物価上昇は考慮しません）
        </p>

        <fieldset className="fs-group">
          <legend>あなたと家計</legend>
          {field("age", "あなたの年齢", "歳", { step: "1", inputMode: "numeric" })}
          {field("takeHomeMan", "手取り年収", "万円", {
            step: STEP_MAN_LARGE,
            hint: "初期値400万円は年収500万円の手取りの仮の目安（公式の計算値ではありません）",
          })}
          {field("livingMan", "毎月の生活費（住居費を除く）", "万円", {
            step: STEP_MAN_MONTHLY,
          })}
          {field("savingsMan", "現在の貯蓄", "万円", { step: STEP_MAN_LARGE })}
        </fieldset>

        <fieldset className="fs-group">
          <legend>住宅ローン</legend>
          {field("loanMan", "借入額", "万円", {
            step: STEP_MAN_LARGE,
            hint: "借入がなければ0",
          })}
          {hasLoan && (
            <>
              {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "返済期間中は同じ金利として計算" })}
              {field("years", "返済期間", "年", { step: "1", inputMode: "numeric" })}
            </>
          )}
        </fieldset>

        <fieldset className="fs-group">
          <legend>お子さん（教育費）</legend>
          <p className="hint">教育費は全国平均の学習費に基づく目安です。</p>
          {form.children.map((c, i) => {
            const ce = childError(errors, i);
            const ageKey = `child-${i}-age`;
            const ageErr = touched[ageKey] || show ? ce.age : undefined;
            return (
              <fieldset className="child-card" key={i}>
                <legend>お子さん{i + 1}</legend>
                <NumberField
                  id={`lp-child-${i}-age`}
                  label="年齢"
                  unit="歳"
                  value={c.age}
                  onChange={(v) => setChild(i, { age: v })}
                  onBlur={blur(ageKey)}
                  step="1"
                  inputMode="numeric"
                  hint="4月1日時点の年齢"
                  error={ageErr}
                />
                <div className="field">
                  <label htmlFor={`lp-child-${i}-school`}>進路（大学より前）</label>
                  <select
                    id={`lp-child-${i}-school`}
                    value={c.schoolPlan}
                    onChange={(ev) => setChild(i, { schoolPlan: ev.target.value as ChildForm["schoolPlan"] })}
                  >
                    {SCHOOL_PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`lp-child-${i}-univ`}>大学</label>
                  <select
                    id={`lp-child-${i}-univ`}
                    value={c.university}
                    onChange={(ev) => setChild(i, { university: ev.target.value as ChildForm["university"] })}
                  >
                    {UNIVERSITY_PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn-sub" onClick={() => removeChild(i)}>
                  お子さん{i + 1}を削除する
                </button>
              </fieldset>
            );
          })}
          <button type="button" className="btn-sub" onClick={addChild} disabled={form.children.length >= MAX_CHILDREN}>
            お子さんを追加する（{form.children.length}/{MAX_CHILDREN}人）
          </button>
        </fieldset>

        <details
          className="advanced"
          open={advOpen || advancedError}
          onToggle={(e) => setAdvOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary>詳細設定（退職後・運用・住居費など）</summary>

          <fieldset className="fs-group">
            <legend>退職と年金</legend>
            {field("retireAge", "退職年齢", "歳", { step: "1", inputMode: "numeric" })}
            {field("pensionAge", "年金などを受け取り始める年齢", "歳", { step: "1", inputMode: "numeric" })}
            {field("retireIncomeMan", "退職後の年間収入（年金など）", "万円", {
              step: STEP_MAN_LARGE,
              hint: "入力例です。ねんきん定期便などで確認できます",
            })}
            {field("retireLivingMan", "退職後の毎月の生活費（住居費を除く）", "万円", { step: STEP_MAN_MONTHLY, hint: "入力例です" })}
            {field("endAge", "想定する年齢の上限", "歳", {
              step: "1",
              inputMode: "numeric",
              hint: "この年齢までの推移を計算",
            })}
          </fieldset>

          <fieldset className="fs-group">
            <legend>収入と貯蓄</legend>
            {field("growth", "収入の年間上昇率", "%", { step: STEP_PERCENT, hint: "0なら変わらない想定" })}
            {field("returnRate", "貯蓄の運用利回り", "%", {
              step: STEP_PERCENT,
              hint: "0なら利息なしの想定",
            })}
          </fieldset>

          <fieldset className="fs-group">
            <legend>住まいの費用</legend>
            <p className="hint">ここの住居費は、住宅ローンの有無にかかわらず毎年の支出に加えます。</p>
            {field("upfrontMan", "購入時に貯蓄から払う額（頭金・諸費用）", "万円", {
              step: STEP_MAN_LARGE,
            })}
            <fieldset className="field">
              <legend>返済方式</legend>
              <label className="radio">
                <input
                  type="radio"
                  name="lp-method"
                  checked={form.method === "EQUAL_PAYMENT"}
                  onChange={() => set("method", "EQUAL_PAYMENT")}
                />
                元利均等返済
              </label>
              <label className="radio">
                <input
                  type="radio"
                  name="lp-method"
                  checked={form.method === "EQUAL_PRINCIPAL"}
                  onChange={() => set("method", "EQUAL_PRINCIPAL")}
                />
                元金均等返済
              </label>
            </fieldset>
            {field("housingMonthly", "毎月の住居費（ローン以外）", "円", {
              step: STEP_YEN_MONTHLY,
              inputMode: "numeric",
              hint: "初期値は戸建ての目安。マンションは管理費・修繕積立金を入力",
            })}
            {field("housingTaxYearly", "毎年の住居費（固定資産税・保険など）", "円", {
              step: STEP_YEN_YEARLY,
              inputMode: "numeric",
              hint: "初期値は戸建ての目安（固定資産税・火災保険など）",
            })}
          </fieldset>
        </details>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
      </form>

      <section className="results" aria-labelledby="lp-result-h" aria-busy={loading}>
        <h2 id="lp-result-h">試算結果</h2>
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

        {data && shown && last && s && (
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="hint">貯蓄の見通し（{data.years[0].age}歳〜{endAge}歳）</p>
              <p className="rvb-headline">{shortfallSentence(s, endAge)}</p>
              <p className="hint">{ASSUMPTION_LINE}</p>
            </div>

            <div className="lp-cards">
              <section className="lp-card" aria-label="退職時の貯蓄">
                <h3>退職時の貯蓄</h3>
                <p className="lp-val">約{manApprox(s.savingsAtRetirement)}</p>
                <p className="hint">{retireAge - 1}歳の年末</p>
              </section>
              <section className="lp-card" aria-label="最も貯蓄が少なくなる時点">
                <h3>最も貯蓄が少なくなる時点</h3>
                <p className="lp-val">約{manApprox(s.minSavings)}</p>
                <p className="hint">{s.minSavingsAge}歳の年末</p>
              </section>
              <section className="lp-card" aria-label="上限年齢の貯蓄">
                <h3>{endAge}歳の時点の貯蓄</h3>
                <p className="lp-val">約{manApprox(s.savingsAtEnd)}</p>
              </section>
              <section className="lp-card" aria-label="住宅ローン">
                <h3>住宅ローンの完済</h3>
                {s.loanPayoffAge !== null ? (
                  <p className="lp-val">{s.loanPayoffAge}歳</p>
                ) : (
                  <p className="lp-val">―</p>
                )}
                <p className="hint">{loanSentence(s, endAge)}</p>
                {s.totalLoanPayment > 0 ? (
                  <p className="hint">
                    返済額の合計は約{manApprox(s.totalLoanPayment)}（{endAge}歳までに支払う分のみ）。
                  </p>
                ) : null}
              </section>
              <section className="lp-card" aria-label="教育費">
                <h3>教育費</h3>
                {s.totalEducationCost > 0 ? (
                  <>
                    <p className="lp-val">合計 約{manApprox(s.totalEducationCost)}</p>
                    <p className="hint">
                      最大は{s.peakEducationAge}歳のとき、年約{manApprox(s.peakEducationCost ?? 0)}。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="lp-val">―</p>
                    <p className="hint">お子さんの入力がないか、期間内に教育費がかかりません。</p>
                  </>
                )}
              </section>
            </div>

            <h3>貯蓄の推移</h3>
            <SavingsChart years={data.years} summary={s} />
            <p className="hint">年末の貯蓄残高。ゼロ未満は斜線で示します。</p>

            <h3>1年あたりの支出の内訳</h3>
            <OutflowChart years={data.years} />

            <details className="advanced">
              <summary>年ごとの数値の表を見る（{data.years.length}年分）</summary>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="年ごとの数値の表（横にスクロールできます）">
                <table className="compare tc-year-table">
                  <caption className="sr-only">あなたの年齢ごとの収入・支出・年末の貯蓄（円）</caption>
                  <thead>
                    <tr>
                      <th scope="col">年齢</th>
                      <th scope="col">収入</th>
                      <th scope="col">生活費</th>
                      <th scope="col">ローン返済</th>
                      <th scope="col">住居費</th>
                      <th scope="col">教育費</th>
                      <th scope="col">1年の収支</th>
                      <th scope="col">年末の貯蓄</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.years.map((r) => (
                      <tr key={r.age}>
                        <th scope="row">{r.age}歳</th>
                        <td>{cell(r.income)}</td>
                        <td>{cell(r.livingCost)}</td>
                        <td>{cell(r.loanPayment)}</td>
                        <td>{cell(r.housingCost)}</td>
                        <td>{cell(r.educationCost)}</td>
                        <td>{yenSigned(r.netCashFlow)}</td>
                        <td>{yenSigned(r.savingsClosing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="hint">単位は円。マイナスは「−」。</p>

            <h3>前提と含まれないもの</h3>
            <ul className="tc-excluded">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
              <li>
                住宅ローン控除による税の軽減は含みません（<Link href="/tax-deduction">住宅ローン控除の試算</Link>）。
              </li>
            </ul>

            {data.sources.length > 0 && (
              <div className="panel-block">
                <h3>根拠となる統計・制度情報</h3>
                <ul className="src-list">
                  {data.sources.map((src) => (
                    <li key={src.url + src.label}>
                      {src.label}（確認日：{dateLabel(src.verifiedOn)}）：
                      {isHttpUrl(src.url) ? (
                        <>
                          {" "}
                          <a href={src.url} target="_blank" rel="noopener noreferrer">
                            {src.url}
                            <span className="sr-only">（外部サイト・新しいタブで開きます）</span>
                          </a>
                        </>
                      ) : (
                        ` ${src.url}`
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="cta cta-row">
              <Link className="btn-link" href="/total-cost">
                住居費の総額を調べる
              </Link>
              <Link className="btn-link secondary" href="/rent-vs-buy">
                マイホームと賃貸を比べる
              </Link>
              <Link className="btn-link secondary" href={hrefWith("/simulation", sharedNow)}>
                返済額を試算する
              </Link>
            </p>
          </div>
        )}

        <p className="disclaimer">
          目安です。実際の収入・支出・教育費は、ご家庭の状況や将来の制度・物価により異なります。
        </p>
      </section>
    </div>
  );
}
