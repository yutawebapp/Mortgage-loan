"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRepayment,
  type RepaymentRequest,
  type RepaymentResponse,
} from "@/lib/api/simulation";
import { aggregateByYear, validate, yen, type FormValues } from "@/lib/simulation";
import { BalanceChart, YearlyChart } from "./Charts";

type Outcome = { key: string; data?: RepaymentResponse; error?: string };

const initial: FormValues = {
  principalMan: "3000",
  rate: "1.2",
  years: "35",
  method: "EQUAL_PAYMENT",
  useBonus: false,
  bonusMan: "0",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

export default function Simulator({ initialValues }: { initialValues?: Partial<FormValues> }) {
  const [form, setForm] = useState<FormValues>({ ...initial, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [view, setView] = useState<"year" | "month">("year");
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validate(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RepaymentRequest = request;
    const timer = setTimeout(() => {
      calculateRepayment(body, ctrl.signal)
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

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;
  const yearRows = useMemo(() => (data ? aggregateByYear(data.schedule) : []), [data]);
  const hasBonus = !!data && data.bonusPayment > 0;

  function field(
    id: keyof typeof errors,
    label: string,
    unit: string,
    value: string,
    onChange: (v: string) => void,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" },
  ) {
    const e = err(id);
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <div className="input-row">
          <input
            id={id}
            type="number"
            inputMode={opts.inputMode ?? "decimal"}
            step={opts.step}
            min={0}
            value={value}
            onChange={(ev) => onChange(ev.target.value)}
            onBlur={blur(id)}
            aria-invalid={e ? true : undefined}
            aria-describedby={`${id}-hint${e ? ` ${id}-err` : ""}`}
          />
          <span className="unit">{unit}</span>
        </div>
        {opts.hint && (
          <p className="hint" id={`${id}-hint`}>
            {opts.hint}
          </p>
        )}
        {!opts.hint && <span id={`${id}-hint`} hidden />}
        {e && (
          <p className="field-error" id={`${id}-err`}>
            {e}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="借入条件">
        <h2>借入条件</h2>
        {field("principalMan", "借入金額", "万円", form.principalMan, (v) => set("principalMan", v), {
          step: "any",
          hint: "例：3000万円 ＝ 30,000,000円",
        })}
        {field("rate", "金利（年率）", "%", form.rate, (v) => set("rate", v), {
          step: "0.001",
          hint: "0〜20%で入力できます。",
        })}
        {field("years", "返済期間", "年", form.years, (v) => set("years", v), {
          step: "1",
          inputMode: "numeric",
          hint: "1〜50年の整数で入力できます。",
        })}
        <fieldset className="field">
          <legend>返済方式</legend>
          <label className="radio">
            <input
              type="radio"
              name="method"
              checked={form.method === "EQUAL_PAYMENT"}
              onChange={() => set("method", "EQUAL_PAYMENT")}
            />
            元利均等返済
          </label>
          <label className="radio">
            <input
              type="radio"
              name="method"
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
        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              checked={form.useBonus}
              onChange={(e) => set("useBonus", e.target.checked)}
            />
            ボーナス併用
          </label>
          {form.useBonus && (
            <div className="bonus-field">
              {field("bonusMan", "ボーナス返済分の借入額", "万円", form.bonusMan, (v) => set("bonusMan", v), {
                step: "any",
                hint: "借入金額のうち、ボーナス月（6か月ごと）に返す分です。",
              })}
            </div>
          )}
        </div>
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

        {data && request && (
          <div className={stale ? "stale" : undefined}>
            <dl className="summary">
              <div>
                <dt>毎月の返済額（初回）</dt>
                <dd className="big">{yen(data.monthlyPayment)}</dd>
              </div>
              {hasBonus && (
                <div>
                  <dt>ボーナス月の加算額（初回）</dt>
                  <dd className="big">{yen(data.bonusPayment)}</dd>
                </div>
              )}
              <div>
                <dt>総返済額</dt>
                <dd>{yen(data.totalPayment)}</dd>
              </div>
              <div>
                <dt>うち利息の合計</dt>
                <dd>{yen(data.totalInterest)}</dd>
              </div>
            </dl>
            {form.method === "EQUAL_PRINCIPAL" && (
              <p className="hint">元金均等返済では、毎月の返済額は少しずつ減ります。</p>
            )}

            <h3>残高推移</h3>
            <BalanceChart schedule={data.schedule} principal={request.principal} years={request.years} />

            <h3>年ごとの返済額の内訳</h3>
            <YearlyChart rows={yearRows} />
            <p className="legend">
              <span className="sw sw-p" /> 元金 <span className="sw sw-i" /> 利息
            </p>

            <div className="table-head">
              <h3>返済表</h3>
              <div role="group" aria-label="表示単位" className="toggle">
                <button type="button" aria-pressed={view === "year"} onClick={() => setView("year")}>
                  年次
                </button>
                <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
                  月次
                </button>
              </div>
            </div>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="返済表（横にスクロールできます）">
              <table>
                <caption className="sr-only">{view === "year" ? "年次の返済表" : "月次の返済表"}</caption>
                <thead>
                  <tr>
                    <th scope="col">{view === "year" ? "年" : "回"}</th>
                    <th scope="col">返済額</th>
                    {hasBonus && <th scope="col">うちボーナス</th>}
                    <th scope="col">元金</th>
                    <th scope="col">利息</th>
                    <th scope="col">残高</th>
                  </tr>
                </thead>
                <tbody>
                  {(view === "year"
                    ? yearRows.map((r) => ({ k: r.year, label: `${r.year}年目`, ...r }))
                    : data.schedule.map((r) => ({ k: r.month, label: `${r.month}回`, ...r }))
                  ).map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.label}</th>
                      <td>{r.payment.toLocaleString("ja-JP")}</td>
                      {hasBonus && <td>{r.bonusPayment.toLocaleString("ja-JP")}</td>}
                      <td>{r.principal.toLocaleString("ja-JP")}</td>
                      <td>{r.interest.toLocaleString("ja-JP")}</td>
                      <td>{r.balance.toLocaleString("ja-JP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">金額の単位は円です。</p>
          </div>
        )}

        <p className="disclaimer">試算結果は目安であり、実際の返済額・審査結果を保証するものではありません。</p>
      </section>
    </div>
  );
}
