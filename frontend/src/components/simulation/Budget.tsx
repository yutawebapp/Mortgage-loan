"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError, calculateBudget, type BudgetRequest, type BudgetResponse } from "@/lib/api/budget";
import { manLabel, simulationHref, validateBudget, type BudgetForm } from "@/lib/budget";
import { yen } from "@/lib/simulation";
import { acceptFor, hrefWith, sanitizeShared, type SharedConditions } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import BudgetChart from "./BudgetChart";
import { STEP_MAN_LARGE, STEP_MAN_MONTHLY, STEP_PERCENT, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import NextSteps, { type NextStep } from "./NextSteps";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { budgetInitialFromQuery } from "@/lib/budget";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: BudgetResponse; error?: string; req: BudgetRequest };

const initial: BudgetForm = {
  downMan: "500",
  monthlyMan: "10",
  rate: "1.2",
  years: "35",
  closingRate: "10",
  incomeMan: "",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

export default function Budget({ initialValues }: { initialValues?: Partial<BudgetForm> }) {
  const [form, setForm] = useState<BudgetForm>({ ...initial, ...initialValues });
  // 共通条件（金利・返済期間のみ。借入額は出力なので共有しない）
  const sharedNow = sanitizeShared({ rate: form.rate, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) => setForm((f) => ({ ...f, rate: patch.rate ?? f.rate, years: patch.years ?? f.years })),
    accept: (c) => acceptFor("/budget", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(budgetInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validateBudget(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: BudgetRequest = request;
    const timer = setTimeout(() => {
      calculateBudget(body, ctrl.signal)
        .then((data) => setOutcome({ key, data, req: body }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return;
          setOutcome({ key, error: errorMessage(e), req: body });
        });
    }, 400);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // request is fully captured by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = <K extends keyof BudgetForm>(k: K, v: BudgetForm[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  // 次に調べるリンクは、表示中の結果を作った request（snap.req）の金利・期間から作る（フォームの現在値は使わない）
  const snap = request ? (current?.data ? current : outcome) : null;
  const data = snap?.data;
  const shown = data && snap?.req ? snap.req : null;
  const sharedShown: SharedConditions = shown
    ? sanitizeShared({ rate: String(shown.annualRatePercent), years: String(shown.years) })
    : {};
  const stale = !!data && loading;

  // 次に調べる: 計算した物件価格（万円未満切り捨て）を総額試算の物件価格として渡す
  const maxPriceMan = data ? Math.floor(data.maxPropertyPrice / 10000) : 0;
  const nextSteps: NextStep[] =
    maxPriceMan >= 1
      ? [
          {
            href: hrefWith("/total-cost", sharedShown, { principal: String(maxPriceMan) }),
            label: "住居費の総額を試算",
            hint: "この物件価格で、諸費用や管理費などを含めた住居費の総額の目安を確認できます。",
          },
        ]
      : [];

  function field(
    id: keyof BudgetForm,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal"; optional?: boolean },
  ) {
    return (
      <NumberField
        id={id}
        label={opts.optional ? `${label}（任意）` : label}
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

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="購入予算の条件">
        <h2>用意できる金額</h2>
        {field("downMan", "頭金", "万円", {
          step: STEP_MAN_LARGE,
          hint: "自己資金から支払う金額です。なければ0で構いません。例：500万円 ＝ 5,000,000円",
        })}
        {field("monthlyMan", "希望する毎月の返済額", "万円", {
          step: STEP_MAN_MONTHLY,
          hint: "小数も入力できます。例：8.5万円 ＝ 85,000円",
        })}

        <h2>借入の条件</h2>
        {field("rate", "金利（年率）", "%", { step: STEP_RATE, hint: "0〜20%で入力できます。" })}
        {field("years", "返済期間", "年", { step: "1", inputMode: "numeric", hint: "1〜50年の整数で入力できます。" })}

        <details className="advanced">
          <summary>詳細設定</summary>
          {field("closingRate", "諸費用の割合（物件価格に対して）", "%", {
            step: STEP_PERCENT,
            hint: "諸費用（登記費用・仲介手数料・保証料・各種税など）は、物件価格の1割前後かかることが多いとされます。物件の種類や条件で大きく変わります。0〜30%で入力できます。",
          })}
          {field("incomeMan", "年収", "万円", {
            step: STEP_MAN_LARGE,
            optional: true,
            hint: "入力すると、返済負担率の目安を表示します。",
          })}
        </details>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">購入予算の目安</h2>
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
              <p className="hint">購入できる物件価格の目安</p>
              <p className="big">{data.maxPropertyPrice > 0 ? `約${manLabel(data.maxPropertyPrice)}` : "約0円"}</p>
              <p>毎月の返済額：{data.maxLoanAmount > 0 ? `約${yen(data.monthlyPayment)}` : "―"}</p>
            </div>

            {data.maxPropertyPrice === 0 && (
              <p className="note" role="note">
                この条件では、物件価格の目安が0円になりました。頭金や毎月の返済額、返済期間などの入力内容を確認してください。
              </p>
            )}

            {data.loanExceedsPrice && (
              <p className="note" role="note">
                借入額が物件価格を上回る計算です。諸費用まで借り入れできるかは金融機関や商品によって異なるため、事前の確認が必要です。
              </p>
            )}

            {data.totalBudget > 0 && (
              <>
                <h3>予算の考え方</h3>
                <ol className="budget-flow">
                  <li>借入額（毎月の返済額から逆算）：{manLabel(data.maxLoanAmount)}</li>
                  <li>頭金：{manLabel(data.downPayment)}</li>
                  <li>
                    <strong>予算の合計（借入額＋頭金）：{manLabel(data.totalBudget)}</strong>
                  </li>
                  <li>
                    うち諸費用（物件価格の{data.closingCostRatePercent}%）：{manLabel(data.closingCosts)}
                  </li>
                  <li>
                    <strong>うち物件価格：{manLabel(data.maxPropertyPrice)}</strong>
                  </li>
                </ol>
                <BudgetChart
                  propertyPrice={data.maxPropertyPrice}
                  closingCosts={data.closingCosts}
                  loan={data.maxLoanAmount}
                  downPayment={data.downPayment}
                  totalBudget={data.totalBudget}
                />
                <p className="hint">
                  金額は万円未満を切り捨てて表示しています。諸費用は予算の合計の中から支払う前提で計算しています。
                </p>
              </>
            )}

            {data.burdenRatioPercent !== null && (
              <>
                <h3>年収に対する返済負担率</h3>
                <dl className="summary">
                  <div>
                    <dt>返済負担率（年間返済額 ÷ 年収）</dt>
                    <dd className="big">{data.burdenRatioPercent}%</dd>
                  </div>
                </dl>
                <p className="hint">
                  年収に占める、住宅ローンの年間返済額の割合です。他の借入がある場合は含まれていません。
                </p>
              </>
            )}

            <p className="cta cta-row">
              {data.maxLoanAmount > 0 && (
                <Link
                  className="btn-link"
                  href={simulationHref(data.maxLoanAmount, request.annualRatePercent, request.years)}
                >
                  この借入額で返済額を試算する
                </Link>
              )}
              <Link className="btn-link secondary" href="/eligibility">
                年収から借入可能額を調べる
              </Link>
            </p>
            <NextSteps items={nextSteps} />
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安です。実際の購入には、物件価格のほか諸費用・税金・購入後の維持費などが別途かかります。審査結果や借入可否を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
