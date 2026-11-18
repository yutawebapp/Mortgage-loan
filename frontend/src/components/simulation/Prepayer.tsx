"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculatePrepayment,
  type PrepaymentRequest,
  type PrepaymentResponse,
} from "@/lib/api/prepayment";
import { monthSpanLabel, validatePrepayment, type PrepaymentForm } from "@/lib/prepayment";
import { yen } from "@/lib/simulation";
import PrepaymentChart from "./PrepaymentChart";
import { STEP_MAN_LARGE, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";

type Outcome = { key: string; data?: PrepaymentResponse; error?: string };

const initial: PrepaymentForm = {
  principalMan: "3000",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  afterYears: "5",
  afterMonths: "0",
  prepayMan: "300",
  type: "SHORTEN_TERM",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

/** 繰上げなし − 繰上げあり。正なら「少ない」。 */
function diffCell(n: number): string {
  if (n === 0) return "差なし";
  return `${Math.abs(n).toLocaleString("ja-JP")}円${n > 0 ? "少ない" : "多い"}`;
}

export default function Prepayer({ initialValues }: { initialValues?: Partial<PrepaymentForm> }) {
  const [form, setForm] = useState<PrepaymentForm>({ ...initial, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validatePrepayment(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: PrepaymentRequest = request;
    const timer = setTimeout(() => {
      calculatePrepayment(body, ctrl.signal)
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

  const set = <K extends keyof PrepaymentForm>(k: K, v: PrepaymentForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;
  // Results belong to the request they were computed for, not to the form as currently edited.
  const shown = data && request ? request : null;

  type NumKey = "principalMan" | "rate" | "years" | "prepayMan";
  function field(id: NumKey, label: string, unit: string, opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" }) {
    return (
      <NumberField
        id={id}
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

  const timingError = err("afterYears") ?? err("afterMonths");
  const timingErrorId = err("afterYears") ? "afterYears-err" : "afterMonths-err";

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="繰上げ返済の条件">
        <h2>現在のローン</h2>
        {field("principalMan", "借入金額", "万円", { step: STEP_MAN_LARGE, hint: "例：3000万円 ＝ 30,000,000円" })}
        {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "0〜20%で入力できます。繰上げ後も同じ金利で計算します。" })}
        {field("years", "返済期間", "年", { step: "1", inputMode: "numeric", hint: "1〜50年の整数で入力できます。" })}
        <fieldset className="field">
          <legend>返済方式</legend>
          <label className="radio">
            <input
              type="radio"
              name="pp-method"
              checked={form.method === "EQUAL_PAYMENT"}
              onChange={() => set("method", "EQUAL_PAYMENT")}
            />
            元利均等返済
          </label>
          <label className="radio">
            <input
              type="radio"
              name="pp-method"
              checked={form.method === "EQUAL_PRINCIPAL"}
              onChange={() => set("method", "EQUAL_PRINCIPAL")}
            />
            元金均等返済
          </label>
          <p className="hint">
            {form.method === "EQUAL_PAYMENT"
              ? "毎月の返済額がほぼ一定になる方式です。"
              : "毎月返す元金が一定で、返済額は少しずつ減っていく方式です。"}
          </p>
        </fieldset>

        <h2>繰上げ返済</h2>
        <fieldset className="field" aria-describedby="timing-hint">
          <legend>繰上げ返済をする時期</legend>
          <div className="input-row timing-row">
            <span className="unit-pre">返済開始から</span>
            <input
              id="afterYears"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              aria-label="繰上げ返済をする時期（年）"
              value={form.afterYears}
              onChange={(ev) => set("afterYears", ev.target.value)}
              onBlur={blur("afterYears")}
              aria-invalid={errors.afterYears && (touched.afterYears || outcome) ? true : undefined}
              aria-describedby={timingError ? timingErrorId : undefined}
            />
            <span className="unit">年</span>
            <input
              id="afterMonths"
              type="number"
              inputMode="numeric"
              step={1}
              min={0}
              max={11}
              aria-label="繰上げ返済をする時期（か月）"
              value={form.afterMonths}
              onChange={(ev) => set("afterMonths", ev.target.value)}
              onBlur={blur("afterMonths")}
              aria-invalid={errors.afterMonths && (touched.afterMonths || outcome) ? true : undefined}
              aria-describedby={timingError ? timingErrorId : undefined}
            />
            <span className="unit">か月後</span>
          </div>
          <p className="hint" id="timing-hint">
            指定した回の支払いが終わった直後に繰上げ返済をする想定です。返済期間の範囲内で、1か月後以降を指定できます。
          </p>
          {timingError && (
            <p className="field-error" id={timingErrorId}>
              {timingError}
            </p>
          )}
        </fieldset>
        {field("prepayMan", "繰上げ返済額", "万円", {
          step: STEP_MAN_LARGE,
          hint: "その時点のローン残高を上回る場合は、残高の全額を繰上げ返済するものとして計算します。",
        })}
        <fieldset className="field">
          <legend>繰上げ返済の種類</legend>
          <label className="radio">
            <input
              type="radio"
              name="pp-type"
              checked={form.type === "SHORTEN_TERM"}
              onChange={() => set("type", "SHORTEN_TERM")}
            />
            期間短縮型
          </label>
          <label className="radio">
            <input
              type="radio"
              name="pp-type"
              checked={form.type === "REDUCE_PAYMENT"}
              onChange={() => set("type", "REDUCE_PAYMENT")}
            />
            返済額軽減型
          </label>
          <p className="hint">
            {form.type === "SHORTEN_TERM"
              ? "毎月の返済額を変えずに、完済の時期を早める方法です。"
              : "返済期間を変えずに、毎月の返済額を下げる方法です。"}
          </p>
        </fieldset>
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">試算結果</h2>
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

        {data && shown && (
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="hint">利息の軽減額（目安）</p>
              <p className="big">約{yen(data.interestSaving)}</p>
              <p className="hint">繰上げ返済をしない場合と比べた、支払う利息の合計の差です。</p>
            </div>

            {data.appliedPrepayment < shown.prepaymentAmount && (
              <p className="note" role="note">
                残高を上回るため、全額繰上げ返済として計算しています（繰上げ返済額：{yen(data.appliedPrepayment)}）。
              </p>
            )}

            <dl className="summary">
              <div>
                <dt>短縮される期間</dt>
                <dd className="big">
                  {monthSpanLabel(data.monthsShortened)}
                </dd>
              </div>
              <div>
                <dt>毎月の返済額（繰上げ前 → 繰上げ後）</dt>
                <dd className="big">
                  {data.afterPrepayment.monthlyPaymentBefore.toLocaleString("ja-JP")}円 →{" "}
                  {data.afterPrepayment.monthlyPaymentAfter.toLocaleString("ja-JP")}円
                </dd>
              </div>
            </dl>
            <p className="hint">
              {shown.prepaymentType === "SHORTEN_TERM"
                ? "期間短縮型では、毎月の返済額は変わらず、完済の時期が早まります。"
                : "返済額軽減型では、返済期間は変わらず、繰上げ返済の後の毎月の返済額が下がります。"}
              {shown.method === "EQUAL_PRINCIPAL" &&
                "元金均等返済では毎月の返済額が少しずつ減るため、表示の金額は1回分の目安です。"}
            </p>

            <div className="table-wrap plain" tabIndex={0} role="region" aria-label="繰上げ返済なしとありの比較表（横にスクロールできます）">
              <table className="compare">
                <caption className="sr-only">繰上げ返済なしとありの比較</caption>
                <thead>
                  <tr>
                    <th scope="col">項目</th>
                    <th scope="col">繰上げなし</th>
                    <th scope="col">繰上げあり</th>
                    <th scope="col">差（なし − あり）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">返済期間</th>
                    <td>{monthSpanLabel(data.baseline.months)}</td>
                    <td>{monthSpanLabel(data.afterPrepayment.months)}</td>
                    <td className="diff">
                      {data.monthsShortened === 0 ? "差なし" : `${monthSpanLabel(data.monthsShortened)}短い`}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">総返済額（繰上げ返済額を除く）</th>
                    <td>{yen(data.baseline.totalPayment)}</td>
                    <td>{yen(data.afterPrepayment.totalPayment)}</td>
                    <td className="diff">{diffCell(data.baseline.totalPayment - data.afterPrepayment.totalPayment)}</td>
                  </tr>
                  <tr>
                    <th scope="row">うち利息の合計</th>
                    <td>{yen(data.baseline.totalInterest)}</td>
                    <td>{yen(data.afterPrepayment.totalInterest)}</td>
                    <td className="diff">{diffCell(data.baseline.totalInterest - data.afterPrepayment.totalInterest)}</td>
                  </tr>
                  <tr>
                    <th scope="row">繰上げ返済額（別に支払う金額）</th>
                    <td>―</td>
                    <td>{yen(data.appliedPrepayment)}</td>
                    <td>―</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="hint">
              「繰上げあり」の総返済額には、繰上げ返済額そのものは含まれません。繰上げ返済額は、表の最下行のとおり別に支払う金額です。
            </p>

            <h3>繰上げ返済後のローン残高の推移</h3>
            <PrepaymentChart
              schedule={data.schedule}
              principal={shown.principal}
              baselineMonths={data.baseline.months}
              prepaymentMonth={shown.prepaymentAfterMonth}
            />
            <p className="hint">
              繰上げ返済をした場合の残高です。横軸は繰上げ返済をしない場合の返済期間までで、点線は繰上げ返済をする時期を示します。
            </p>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安であり、金融機関の繰上げ返済手数料や取扱条件は含まれません。実際の条件は、お借入れの金融機関にご確認ください。
        </p>
      </section>
    </div>
  );
}
