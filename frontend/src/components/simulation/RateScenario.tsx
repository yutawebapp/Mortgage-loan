"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRateScenarios,
  type RateScenarioRequest,
  type RateScenarioResponse,
} from "@/lib/api/rate-scenario";
import {
  RISE_PRESETS,
  risePointLabel,
  signedYen,
  validateRateScenario,
  type RateScenarioForm,
} from "@/lib/rate-scenario";
import { yen } from "@/lib/simulation";
import { acceptFor, hrefWith, sanitizeShared, type SharedConditions } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import RateScenarioChart, { seriesName } from "./RateScenarioChart";
import ShareLinkButton from "./ShareLinkButton";
import NextSteps, { type NextStep } from "./NextSteps";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { STEP_MAN_LARGE, STEP_RATE, STEP_RATE_RISE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import { DEFAULT_METHOD, DEFAULT_PRINCIPAL_MAN, DEFAULT_RATE, DEFAULT_YEARS } from "@/lib/defaults";
import { rateScenarioInitialFromQuery } from "@/lib/rate-scenario";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: RateScenarioResponse; error?: string };

const initial: RateScenarioForm = {
  principalMan: DEFAULT_PRINCIPAL_MAN,
  rate: DEFAULT_RATE,
  years: DEFAULT_YEARS,
  method: DEFAULT_METHOD,
  riseAfterYears: "5",
  presets: [...RISE_PRESETS],
  custom: "",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

const n = (v: number) => v.toLocaleString("ja-JP");

export default function RateScenario() {
  const [form, setForm] = useState<RateScenarioForm>(initial);
  // 共通条件: URLクエリ > 保存値（マウント後に適用） > 既定値。年は2年以上のみ適用する。
  const sharedNow: SharedConditions = sanitizeShared(form);
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) =>
      setForm((f) => ({
        ...f,
        ...(patch.principalMan !== undefined ? { principalMan: patch.principalMan } : {}),
        ...(patch.rate !== undefined ? { rate: patch.rate } : {}),
        ...(patch.years !== undefined && Number(patch.years) >= 2 ? { years: patch.years } : {}),
      })),
    accept: (c) => acceptFor("/rate-scenario", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(rateScenarioInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validateRateScenario(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RateScenarioRequest = request;
    const timer = setTimeout(() => {
      calculateRateScenarios(body, ctrl.signal)
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

  const set = <K extends keyof RateScenarioForm>(k: K, v: RateScenarioForm[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;

  function field(
    id: "principalMan" | "rate" | "years" | "riseAfterYears",
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal"; pre?: string },
  ) {
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
        pre={opts.pre}
      />
    );
  }

  const toggle = (p: number) =>
    set("presets", form.presets.includes(p) ? form.presets.filter((x) => x !== p) : [...form.presets, p]);
  const pointsErr = err("risePoints");

  const rows = data ? [data.baseline, ...data.scenarios] : [];
  const nextSteps: NextStep[] = [
    {
      href: hrefWith("/rate-types", sharedNow),
      label: "金利タイプごとに比べる",
      hint: "同じ条件で金利タイプを比較",
    },
  ];

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="金利上昇シミュレーションの条件">
        <h2>ローンの条件</h2>
        {field("principalMan", "借入金額", "万円", { step: STEP_MAN_LARGE })}
        {field("rate", "当初金利（年率）", "%", { step: STEP_RATE, hint: "0〜20%。変動金利型の現在の金利を想定" })}
        {field("years", "返済期間", "年", { step: "1", inputMode: "numeric", hint: "2〜50年" })}
        <fieldset className="field">
          <legend>返済方式</legend>
          <label className="radio">
            <input
              type="radio"
              name="rs-method"
              checked={form.method === "EQUAL_PAYMENT"}
              onChange={() => set("method", "EQUAL_PAYMENT")}
            />
            元利均等返済
          </label>
          <label className="radio">
            <input
              type="radio"
              name="rs-method"
              checked={form.method === "EQUAL_PRINCIPAL"}
              onChange={() => set("method", "EQUAL_PRINCIPAL")}
            />
            元金均等返済
          </label>
        </fieldset>

        <h2>金利が上昇する場合</h2>
        {field("riseAfterYears", "金利が上昇する時期", "年後", {
          step: "1",
          inputMode: "numeric",
          pre: "返済開始から",
          hint: "1年以上・返済期間より前。一度だけ上昇する想定",
        })}
        <fieldset className="field" aria-describedby="rise-hint">
          <legend>金利の上昇幅（%ポイント）</legend>
          <ul className="chips" role="group" aria-label="上昇幅の選択">
            {RISE_PRESETS.map((p) => (
              <li key={p}>
                <label className="chip chip-check">
                  <input type="checkbox" checked={form.presets.includes(p)} onChange={() => toggle(p)} />
                  {risePointLabel(p)}%
                </label>
              </li>
            ))}
          </ul>
          <div className="field custom-rise">
            <label htmlFor="custom">上昇幅を自分で指定する（任意）</label>
            <div className="input-row">
              <span className="unit-pre">+</span>
              <input
                id="custom"
                type="number"
                inputMode="decimal"
                step={STEP_RATE_RISE}
                min={0}
                value={form.custom}
                onChange={(ev) => set("custom", ev.target.value)}
                onBlur={blur("risePoints")}
                aria-invalid={pointsErr ? true : undefined}
                aria-describedby={pointsErr ? "rise-hint rise-err" : "rise-hint"}
              />
              <span className="unit">%</span>
            </div>
          </div>
          <p className="hint" id="rise-hint">
            1〜5つ選択。自分で指定する場合は0より大きく10以下。
          </p>
          {pointsErr && (
            <p className="field-error" id="rise-err">
              {pointsErr}
            </p>
          )}
        </fieldset>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">試算結果</h2>
        <p className="note" role="note">
          金利が一度だけ上昇する簡易モデルです。5年ルール・125%ルールなどは反映していません。
        </p>
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
            <div className="table-wrap plain" tabIndex={0} role="region" aria-label="金利上昇シナリオの比較表（横にスクロールできます）">
              <table className="compare">
                <caption className="sr-only">金利上昇シナリオ別の返済額の比較</caption>
                <thead>
                  <tr>
                    <th scope="col">シナリオ</th>
                    <th scope="col">上昇後の金利</th>
                    <th scope="col">毎月の返済額（上昇前 → 上昇後）</th>
                    <th scope="col">毎月の増加額</th>
                    <th scope="col">総返済額</th>
                    <th scope="col">追加の利息</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{seriesName(r, i === 0)}</th>
                      <td>{r.rateAfterPercent}%</td>
                      <td>
                        {n(r.monthlyPaymentBefore)}円 → {n(r.monthlyPaymentAfter)}円
                      </td>
                      <td className="diff">{i === 0 ? "―" : signedYen(r.monthlyPaymentIncrease)}</td>
                      <td>{yen(r.totalPayment)}</td>
                      <td className="diff">{i === 0 ? "―" : signedYen(r.extraInterestVsBaseline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">
              増加額・追加の利息は、金利が変わらない場合との差です。
              {request.method === "EQUAL_PRINCIPAL" &&
                "元金均等返済では、上昇後の金額が上昇前より小さく表示されることがあります。"}
            </p>

            <h3>毎月の返済額の推移</h3>
            <RateScenarioChart
              baseline={data.baseline}
              scenarios={data.scenarios}
              riseAfterYears={request.riseAfterYears}
            />
            <p className="hint">点線は金利が上昇する時期。</p>
            <NextSteps items={nextSteps} />
          </div>
        )}

        {request && (
          <div className="result-actions">
            <ShareLinkButton conditions={sharedNow} />
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。将来の金利や返済額を予測・保証するものではありません。
        </p>
      </section>
    </div>
  );
}
