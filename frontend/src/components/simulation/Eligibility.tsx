"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateEligibility,
  type EligibilityRequest,
  type EligibilityResponse,
} from "@/lib/api/eligibility";
import { manLabel, simulationHref, validateEligibility, type EligibilityForm } from "@/lib/eligibility";
import { yen } from "@/lib/simulation";
import { STEP_MAN_LARGE, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";

type Outcome = { key: string; data?: EligibilityResponse; error?: string };

const initial: EligibilityForm = {
  incomeMan: "500",
  otherMan: "0",
  rate: "1.2",
  years: "35",
  screeningRate: "3.5",
};

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

export default function Eligibility({ initialValues }: { initialValues?: Partial<EligibilityForm> }) {
  const [form, setForm] = useState<EligibilityForm>({ ...initial, ...initialValues });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retry, setRetry] = useState(0);

  const { request, errors } = useMemo(() => validateEligibility(form), [form]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: EligibilityRequest = request;
    const timer = setTimeout(() => {
      calculateEligibility(body, ctrl.signal)
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

  const set = <K extends keyof EligibilityForm>(k: K, v: EligibilityForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) => (touched[k] || outcome ? errors[k] : undefined);

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  const data = current?.data ?? (request ? outcome?.data : undefined);
  const stale = !!data && loading;

  function field(
    id: keyof EligibilityForm,
    label: string,
    unit: string,
    opts: { step: string; hint?: string; inputMode?: "numeric" | "decimal" },
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
      />
    );
  }

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="借入可能額の条件">
        <h2>収入と他の借入</h2>
        {field("incomeMan", "年収（額面）", "万円", {
          step: STEP_MAN_LARGE,
          hint: "税金などを引く前の金額です。例：500万円 ＝ 5,000,000円",
        })}
        {field("otherMan", "他の借入の年間返済額", "万円", {
          step: STEP_MAN_LARGE,
          hint: "自動車ローン・教育ローン・カードローンなどの年間返済額の合計です。なければ0のままで構いません。",
        })}

        <h2>借入予定の条件</h2>
        {field("rate", "借入予定の金利（年率）", "%", {
          step: STEP_RATE,
          hint: "0〜20%で入力できます。",
        })}
        {field("years", "返済期間", "年", {
          step: "1",
          inputMode: "numeric",
          hint: "1〜50年の整数で入力できます。",
        })}

        <details className="advanced">
          <summary>詳細設定</summary>
          {field("screeningRate", "審査金利（年率）", "%", {
            step: STEP_RATE,
            hint: "金融機関は、実際の金利より高い金利で返済能力を確認することが多いため、その想定の金利です。0〜20%で入力できます。",
          })}
        </details>
      </form>

      <section className="results" aria-labelledby="result-h" aria-busy={loading}>
        <h2 id="result-h">借入可能額の目安</h2>
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
              <p className="hint">審査金利（年{data.atScreeningRate.ratePercent}%）で試算した場合</p>
              <p className="big">
                {data.atScreeningRate.maxPrincipal > 0
                  ? `約${manLabel(data.atScreeningRate.maxPrincipal)}`
                  : "約0円"}
              </p>
              <p>
                毎月の返済額：{data.atScreeningRate.maxPrincipal > 0 ? `約${yen(data.atScreeningRate.monthlyPayment)}` : "―"}
              </p>
            </div>

            {data.atScreeningRate.maxPrincipal === 0 && (
              <p className="note" role="note">
                他の借入の年間返済額が大きいため、この条件では借入可能額の目安が0円になりました。他の借入の返済額や年収の入力内容を確認してください。
              </p>
            )}

            <h3>参考：実際の金利で試算した場合</h3>
            <dl className="summary">
              <div>
                <dt>借入可能額の目安（年{data.atActualRate.ratePercent}%）</dt>
                <dd className="big">
                  {data.atActualRate.maxPrincipal > 0 ? `約${manLabel(data.atActualRate.maxPrincipal)}` : "約0円"}
                </dd>
              </div>
              <div>
                <dt>毎月の返済額</dt>
                <dd className="big">
                  {data.atActualRate.maxPrincipal > 0 ? `約${yen(data.atActualRate.monthlyPayment)}` : "―"}
                </dd>
              </div>
            </dl>
            <p className="hint">
              実際の金利で計算した参考値です。金融機関の審査では、より高い審査金利が使われることがあります。
            </p>

            <h3>返済負担率と返済可能額</h3>
            <dl className="summary">
              <div>
                <dt>適用した返済負担率</dt>
                <dd className="big">{data.burdenRatioLimitPercent}%</dd>
              </div>
              <div>
                <dt>年収に対する年間返済額の上限</dt>
                <dd>{yen(data.maxAnnualRepayment)}</dd>
              </div>
              <div>
                <dt>年間返済可能額</dt>
                <dd>{yen(data.availableAnnualRepayment)}</dd>
              </div>
              <div>
                <dt>月額返済可能額</dt>
                <dd>{yen(data.availableMonthlyRepayment)}</dd>
              </div>
            </dl>
            <p className="hint">
              返済負担率は、年収に占める年間返済額の割合です。この目安では、年収400万円未満は30%、400万円以上は35%を上限としています。年間返済可能額は、上限額から他の借入の年間返済額を引いた金額です。
            </p>

            {data.atScreeningRate.maxPrincipal > 0 && (
              <p className="cta">
                <Link
                  className="btn-link"
                  href={simulationHref(data.atScreeningRate.maxPrincipal, request.annualRatePercent, request.years)}
                >
                  この金額で返済額を試算する
                </Link>
              </p>
            )}
          </div>
        )}

        <p className="disclaimer">
          本診断は目安であり、実際の審査結果・借入可能額を保証するものではありません。金融機関ごとに審査基準は異なります。
        </p>
      </section>
    </div>
  );
}
