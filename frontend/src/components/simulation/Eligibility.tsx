"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateEligibility,
  type EligibilityRequest,
  type EligibilityResponse,
} from "@/lib/api/eligibility";
import {
  eligibilityNoteTexts,
  manLabel,
  simulationHref,
  validateEligibility,
  type EligibilityForm,
} from "@/lib/eligibility";
import { PERSON_LABEL, isTwoPerson } from "@/lib/borrowerMode";
import { yen } from "@/lib/simulation";
import { acceptFor, sanitizeShared } from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import { STEP_MAN_LARGE, STEP_PERCENT_WHOLE, STEP_RATE } from "@/lib/inputSteps";
import { NumberField } from "./NumberField";
import { DEFAULT_INCOME_MAN, DEFAULT_RATE, DEFAULT_YEARS } from "@/lib/defaults";
import { BorrowerModeSelector } from "./BorrowerModeFields";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { eligibilityInitialFromQuery } from "@/lib/eligibility";
import { useUrlInitialValues } from "@/lib/useUrlInitialValues";

type Outcome = { key: string; data?: EligibilityResponse; error?: string };

const initial: EligibilityForm = {
  incomeMan: DEFAULT_INCOME_MAN,
  otherMan: "0",
  rate: DEFAULT_RATE,
  years: DEFAULT_YEARS,
  screeningRate: "3.5",
  mode: "SINGLE",
  partnerIncomeMan: "300",
  partnerOtherMan: "0",
  partnerCountPercent: "50",
};

const OTHER_HINT = "自動車・教育・カードローンなどの合計";

type FieldKey = "incomeMan" | "otherMan" | "rate" | "years" | "screeningRate" | "partnerIncomeMan" | "partnerOtherMan" | "partnerCountPercent";

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400)
      return `入力内容を確認してください。${e.message ? `（${e.message}）` : ""}`;
    return "計算サーバーでエラーが発生しました。時間をおいて再度お試しください。";
  }
  return "通信に失敗しました。ネットワークの状態を確認して再度お試しください。";
}

export default function Eligibility() {
  const [form, setForm] = useState<EligibilityForm>(initial);
  // 共通条件（金利・返済期間のみ。借入額は借入可能額の出力なので共有しない）
  const sharedNow = sanitizeShared({ rate: form.rate, years: form.years });
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    current: sharedNow,
    apply: (patch) => setForm((f) => ({ ...f, rate: patch.rate ?? f.rate, years: patch.years ?? f.years })),
    accept: (c) => acceptFor("/eligibility", c),
  });
  // URLクエリの値はマウント後に一度だけ適用する（URL > 保存値 > 既定値）
  useUrlInitialValues(eligibilityInitialFromQuery, (patch) => setForm((f) => ({ ...f, ...patch })));
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

  const set = <K extends keyof EligibilityForm>(k: K, v: EligibilityForm[K]) => {
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
    id: FieldKey,
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

  const two = isTwoPerson(form.mode);
  const shownMode = data?.mode ?? "SINGLE";
  const noteTexts = eligibilityNoteTexts(data?.notes);

  return (
    <div className="sim">
      <form className="panel" onSubmit={(e) => e.preventDefault()} noValidate aria-label="借入可能額の条件">
        <BorrowerModeSelector name="el-mode" value={form.mode} onChange={(m) => set("mode", m)} />

        {two ? (
          <fieldset className="fs-group">
            <legend>{PERSON_LABEL.A}</legend>
            {field("incomeMan", "年収（額面）", "万円", { step: STEP_MAN_LARGE, hint: "税引前" })}
            {field("otherMan", "他の借入の年間返済額", "万円", { step: STEP_MAN_LARGE, hint: OTHER_HINT })}
          </fieldset>
        ) : (
          <>
            <h2>収入と他の借入</h2>
            {field("incomeMan", "年収（額面）", "万円", { step: STEP_MAN_LARGE, hint: "税引前" })}
            {field("otherMan", "他の借入の年間返済額", "万円", { step: STEP_MAN_LARGE, hint: OTHER_HINT })}
          </>
        )}

        {two && (
          <fieldset className="fs-group">
            <legend>{PERSON_LABEL.B}</legend>
            {field("partnerIncomeMan", "年収（額面）", "万円", { step: STEP_MAN_LARGE, hint: "税引前" })}
            {field("partnerOtherMan", "他の借入の年間返済額", "万円", { step: STEP_MAN_LARGE })}
            {form.mode === "JOINT_GUARANTEE" &&
              field("partnerCountPercent", "保証人の収入を審査で見る割合", "%", {
                step: STEP_PERCENT_WHOLE,
                inputMode: "numeric",
                hint: "仮の値（金融機関により異なる）",
              })}
          </fieldset>
        )}

        <h2>借入予定の条件</h2>
        {field("rate", "借入予定の金利（年率）", "%", {
          step: STEP_RATE,
        })}
        {field("years", "返済期間", "年", {
          step: "1",
          inputMode: "numeric",
        })}

        <details className="advanced">
          <summary>詳細設定</summary>
          {field("screeningRate", "審査金利（年率）", "%", {
            step: STEP_RATE,
            hint: "実際の金利より高めに設定して返済能力を見る想定",
          })}
        </details>
        <SavedConditionsNotice restored={restored} hasSaved={hasSaved} onClear={clearSaved} />
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
            {isTwoPerson(shownMode) && (
              <div className="note" role="note">
                <p style={{ margin: 0 }}>
                  {shownMode === "PAIR_LOAN" ? "下の金額は二人分の合計です。" : "下の金額は二人の収入を合わせた結果です。"}
                </p>
                {noteTexts.length > 0 && (
                  <ul style={{ margin: "6px 0 0", paddingLeft: "1.2em" }}>
                    {noteTexts.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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
                他の借入の返済額が大きく、借入可能額の目安は0円です。
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

            {data.persons && data.persons.length > 0 && (
              <>
                <h3>お二人それぞれの目安</h3>
                <div className="person-cards">
                  {data.persons.map((p) => (
                    <section className="person-card" key={p.role} aria-label={PERSON_LABEL[p.role]}>
                      <h4>{PERSON_LABEL[p.role]}</h4>
                      <dl>
                        <dt>毎月の返済可能額</dt>
                        <dd>{yen(p.availableMonthlyRepayment)}</dd>
                        <dt>借入可能額（審査金利 年{p.atScreeningRate.ratePercent}%）</dt>
                        <dd className="big">
                          {p.atScreeningRate.maxPrincipal > 0 ? `約${manLabel(p.atScreeningRate.maxPrincipal)}` : "約0円"}
                        </dd>
                        <dt>借入可能額（実際の金利 年{p.atActualRate.ratePercent}%）</dt>
                        <dd>{p.atActualRate.maxPrincipal > 0 ? `約${manLabel(p.atActualRate.maxPrincipal)}` : "約0円"}</dd>
                        <dt>適用した返済負担率</dt>
                        <dd>{p.burdenRatioLimitPercent}%</dd>
                      </dl>
                    </section>
                  ))}
                </div>
              </>
            )}

            <h3>返済負担率と返済可能額</h3>
            <dl className="summary">
              {data.burdenRatioLimitPercent !== null && (
                <div>
                  <dt>適用した返済負担率</dt>
                  <dd className="big">{data.burdenRatioLimitPercent}%</dd>
                </div>
              )}
              <div>
                <dt>{data.persons ? "二人分を合計した年間返済額の上限" : "年収に対する年間返済額の上限"}</dt>
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
              返済負担率の上限は、年収400万円未満で30%、400万円以上で35%（仮置き）。年間返済可能額は、上限額から他の借入の返済額を引いた金額です。
            </p>

            {data.atScreeningRate.maxPrincipal > 0 && (
              <p className="cta">
                <Link
                  className="btn-link"
                  href={simulationHref(data.atScreeningRate.maxPrincipal, request.annualRatePercent, request.years, {
                    mode: shownMode,
                  })}
                >
                  この金額で返済額を試算する
                </Link>
              </p>
            )}
          </div>
        )}

        <p className="disclaimer">
          目安です。実際の審査結果・借入可能額を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
