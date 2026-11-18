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

type Outcome = { key: string; data?: RefinanceResponse; error?: string };

const initial: RefinanceForm = {
  balanceMan: "2500",
  currentRate: "1.5",
  remainingYears: "30",
  newRate: "1.0",
  newYears: "30",
  method: "EQUAL_PAYMENT",
  costsMan: "0",
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

export default function Refinancer({ initialValues }: { initialValues?: Partial<RefinanceForm> }) {
  const [form, setForm] = useState<RefinanceForm>({ ...initial, ...initialValues });
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
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;
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
          hint: "例：2500万円 ＝ 25,000,000円",
        })}
        {field("currentRate", "現在の金利（年率）", "%", form.currentRate, (v) => set("currentRate", v), {
          step: STEP_RATE,
          hint: "0〜20%で入力できます。",
        })}
        {field("remainingYears", "現在ローンの残り期間", "年", form.remainingYears, (v) => set("remainingYears", v), {
          step: "1",
          inputMode: "numeric",
          hint: "1〜50年の整数で入力できます。",
        })}

        <h2>借り換え後</h2>
        {field("newRate", "借り換え後の金利（年率）", "%", form.newRate, (v) => set("newRate", v), {
          step: STEP_RATE,
          hint: "0〜20%で入力できます。",
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
              ? "1〜50年の整数で入力できます。"
              : "入力するまでは、現在ローンの残り期間と同じになります。",
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
          <p className="hint">
            {form.method === "EQUAL_PAYMENT"
              ? "毎月の返済額がほぼ一定になる方式です。"
              : "毎月返す元金が一定で、返済額は少しずつ減っていく方式です。"}
          </p>
        </fieldset>
        {field("costsMan", "借り換え諸費用", "万円", form.costsMan, (v) => set("costsMan", v), {
          step: STEP_MAN_LARGE,
          hint: "事務手数料・保証料・登記費用・繰上返済手数料などの合計の目安です。わからない場合は0のままでも試算できます。",
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
          <div className={stale ? "stale" : undefined}>
            <div className="verdict">
              <p className="big">
                {data.totalSaving === 0
                  ? "借り換えによる総支払額の差はない試算です"
                  : `借り換えにより総支払額が${diffPhrase(data.totalSaving)}試算です`}
              </p>
              <p className="hint">借り換え諸費用を含めた、現在のまま返済する場合との差です。</p>
            </div>

            <dl className="summary">
              <div>
                <dt>毎月の差額（返済開始時点）</dt>
                <dd className="big">{diffPhrase(data.monthlySaving)}</dd>
              </div>
              <div>
                <dt>損益分岐点</dt>
                <dd className="big">
                  {data.breakEvenMonth !== null
                    ? monthsLabel(data.breakEvenMonth)
                    : "この条件では諸費用を回収できません"}
                </dd>
              </div>
            </dl>
            <p className="hint">
              損益分岐点は、借り換えによる支払いの減少分が諸費用を上回り始める時期の目安です。
            </p>

            {yearsDiffer && (
              <p className="note" role="note">
                借り換え後の返済期間（{request.newYears}年）が、現在ローンの残り期間（{request.remainingYears}
                年）と異なります。返済期間が違うと、総返済額や利息の合計は単純に比べられません。期間の違いを踏まえて見てください。
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
            <p className="hint">
              {form.method === "EQUAL_PRINCIPAL"
                ? "元金均等返済では、毎月の返済額は返済開始時点の金額で、少しずつ減ります。"
                : "金額の単位は円です。"}
            </p>

            <h3>累計の差額の推移</h3>
            <RefinanceChart points={data.cumulativeSaving} breakEvenMonth={data.breakEvenMonth} />
            <p className="hint">
              諸費用を含めた、現在のまま返済する場合との支払額の差の累計です。0円より上は借り換えの方が支払いが少なく、下は多い状態です。
            </p>
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安であり、実際の借り換え可否・条件・諸費用を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
