"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRefinance,
  type RefinanceRequest,
  type RefinanceResponse,
} from "@/lib/api/refinance";
import { diffPhrase, monthsLabel, validateRefinance, type RefinanceForm } from "@/lib/refinance";
import { yen } from "@/lib/simulation";
import RefinanceChart from "./RefinanceChart";
import { STEP_MAN_LARGE, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import { refinanceInitialFromQuery } from "@/lib/refinance";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";
import { DEFAULT_REFINANCE_COSTS_MAN } from "@/lib/defaults";

type Outcome = { key: string; data?: RefinanceResponse; error?: string };

const initial: RefinanceForm = {
  balanceMan: "3000",
  currentRate: "1.5",
  remainingYears: "30",
  newRate: "1.0",
  newYears: "30",
  method: "EQUAL_PAYMENT",
  costsMan: DEFAULT_REFINANCE_COSTS_MAN,
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

/** current − refinanced, shown as "◯円少ない／多い" (positive = refinanced is lower). */
function diffCell(n: number): string {
  if (n === 0) return "差なし";
  return `${Math.abs(n).toLocaleString("ja-JP")}円${n > 0 ? "少ない" : "多い"}`;
}

export default function Refinancer() {
  const [form, setForm] = useState<RefinanceForm>(initial);
  // URLクエリの値はマウント後に一度だけ適用する（URL > 既定値）
  useUrlInitialValues(refinanceInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [newYearsEdited, setNewYearsEdited] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const effective: RefinanceForm = useMemo(
    () => (newYearsEdited ? form : { ...form, newYears: form.remainingYears }),
    [form, newYearsEdited],
  );
  const { request, errors } = useMemo(() => validateRefinance(effective), [effective]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RefinanceRequest = request;
    const timer = setTimeout(() => {
      calculateRefinance(body, ctrl.signal)
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

  const set = <K extends keyof RefinanceForm>(k: K, v: RefinanceForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data;
  const yearsDiffer = !!request && request.newYears !== request.remainingYears;

  function field(
    id: keyof typeof errors,
    label: string,
    unit: string,
    value: string,
    onChange: (v: string) => void,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" },
  ) {
    return (
      <NumberField
        id={id}
        label={label}
        unit={unit}
        value={value}
        onChange={onChange}
        onBlur={blur(id)}
        step={opts.step}
        hint={opts.hint}
        error={err(id)}
        inputMode={opts.inputMode}
      />
    );
  }

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="借り換えの条件">
        <h2>現在のローン</h2>
        {field("balanceMan", "現在の残債", "万円", form.balanceMan, (v) => set("balanceMan", v), {
          step: STEP_MAN_LARGE,
        })}
        {field("currentRate", "現在の金利（年率）", "%", form.currentRate, (v) => set("currentRate", v), {
          step: STEP_RATE,
          hint: "0〜20%",
        })}
        {field("remainingYears", "現在ローンの残り期間", "年", form.remainingYears, (v) => set("remainingYears", v), {
          step: "1",
          inputMode: "numeric",
          hint: "1〜50年",
        })}

        <h2>借り換え後</h2>
        {field("newRate", "借り換え後の金利（年率）", "%", form.newRate, (v) => set("newRate", v), {
          step: STEP_RATE,
          hint: "0〜20%",
        })}
        {field(
          "newYears",
          "借り換え後の返済期間",
          "年",
          effective.newYears,
          (v) => {
            setNewYearsEdited(true);
            set("newYears", v);
          },
          {
            step: "1",
            inputMode: "numeric",
            hint: newYearsEdited
              ? "1〜50年"
              : "未入力の間は現在の残り期間と同じ",
          },
        )}
        <fieldset className="field">
          <legend>返済方式（現在・借り換え後とも）</legend>
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
        </fieldset>
        {field("costsMan", "借り換え諸費用", "万円", form.costsMan, (v) => set("costsMan", v), {
          step: STEP_MAN_LARGE,
          hint: "初期値は借入額の2〜3%程度（約75万円）の目安。金融機関で大きく異なります。事務手数料・登録免許税・司法書士報酬・印紙税などを含みます。現在のローンの保証料が戻る場合は差し引いて入力。不明なら0でも試算できます。",
        })}
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">診断結果</h2>
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
          <div>
            <div className="verdict">
              <p className="big">
                {data.totalSaving === 0
                  ? "完済までの総支払額に差はない試算です"
                  : `完済までの総支払額は借り換えにより${diffPhrase(data.totalSaving)}試算です`}
              </p>
              <p className="hint">諸費用を含む、現在のまま返済する場合との差</p>
            </div>

            <dl className="summary">
              <div>
                <dt>毎月の差額（返済開始時点）</dt>
                <dd className="big">{diffPhrase(data.monthlySaving)}</dd>
              </div>
              <div>
                <dt>累計の現金支出が初めて同額以下になる時期</dt>
                <dd className="big">
                  {data.breakEvenMonth !== null
                    ? monthsLabel(data.breakEvenMonth)
                    : "返済期間中にはありません"}
                </dd>
              </div>
            </dl>
            <p className="hint">借り換え諸費用を含む累計支出が、現在のままの場合と初めて同額以下になる時期です。残債を含まず、その後の支出や完済までの総額で有利になることを示すものではありません。</p>

            {yearsDiffer && (
              <p className="note" role="note">
                返済期間が異なります（現在の残り{request.remainingYears}年／借り換え後{request.newYears}年）。総返済額や利息は単純に比べられません。
              </p>
            )}

            <div className="table-wrap plain" tabIndex={0} role="region" aria-label="現在と借り換え後の比較表（横にスクロールできます）">
              <table className="compare">
                <caption className="sr-only">現在と借り換え後の比較</caption>
                <thead>
                  <tr>
                    <th scope="col">項目</th>
                    <th scope="col">現在のまま</th>
                    <th scope="col">借り換え後</th>
                    <th scope="col">差（現在 − 借り換え後）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">毎月の返済額</th>
                    <td>{yen(data.current.monthlyPayment)}</td>
                    <td>{yen(data.refinanced.monthlyPayment)}</td>
                    <td className="diff">{diffCell(data.monthlySaving)}</td>
                  </tr>
                  <tr>
                    <th scope="row">総返済額</th>
                    <td>{yen(data.current.totalPayment)}</td>
                    <td>{yen(data.refinanced.totalPayment)}</td>
                    <td className="diff">{diffCell(data.current.totalPayment - data.refinanced.totalPayment)}</td>
                  </tr>
                  <tr>
                    <th scope="row">うち利息の合計</th>
                    <td>{yen(data.current.totalInterest)}</td>
                    <td>{yen(data.refinanced.totalInterest)}</td>
                    <td className="diff">{diffCell(data.current.totalInterest - data.refinanced.totalInterest)}</td>
                  </tr>
                  <tr>
                    <th scope="row">借り換え諸費用</th>
                    <td>―</td>
                    <td>{yen(data.refinanceCosts)}</td>
                    <td>―</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {form.method === "EQUAL_PRINCIPAL" && (
              <p className="hint">毎月の返済額は返済開始時点の金額です（以降は減ります）。</p>
            )}

            <h3>累計の現金支出の差の推移</h3>
            <RefinanceChart points={data.cumulativeSaving} breakEvenMonth={data.breakEvenMonth} />
            <p className="hint">0円より上は借り換えの方がそれまでの支出が少ない状態です。残債は含みません。</p>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。借り換えの可否・条件・諸費用を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
