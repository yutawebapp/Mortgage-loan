"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  calculateRepayment,
  type RepaymentRequest,
  type RepaymentResponse,
} from "@/lib/api/simulation";
import {
  ESTIMATE_NOTE,
  aggregateByYear,
  formatDateJa,
  initialPair,
  loanConditionRows,
  validate,
  yen,
  type FormValues,
  type PairOptions,
} from "@/lib/simulation";
import {
  buildScheduleCsv,
  downloadCsv,
  scheduleCsvFilename,
  type ScheduleUnit,
} from "@/lib/scheduleCsv";
import {
  hrefWith,
  sanitizeShared,
  type SharedConditions,
} from "@/lib/sharedConditions";
import { useSharedConditions } from "@/lib/useSharedConditions";
import ShareLinkButton from "./ShareLinkButton";
import NextSteps, { type NextStep } from "./NextSteps";
import SavedConditionsNotice from "./SavedConditionsNotice";
import { BalanceChart, YearlyChart } from "./Charts";
import {
  STEP_MAN_LARGE,
  STEP_PERCENT_WHOLE,
  STEP_RATE,
} from "@/lib/inputSteps";
import { NumberField } from "./NumberField";

// 結果は、それを作った計算条件（request）と試算日を一緒に持つ（表示中の条件を画面・印刷・CSVで揃えるため）。
type Outcome = {
  key: string;
  data?: RepaymentResponse;
  request?: RepaymentRequest;
  date?: string;
  error?: string;
};

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

export default function Simulator({
  initialValues,
}: {
  initialValues?: Partial<FormValues>;
}) {
  const [form, setForm] = useState<FormValues>({
    ...initial,
    ...initialValues,
  });
  // 共通条件: URLクエリ > 保存値（マウント後に適用） > 既定値
  const sharedNow: SharedConditions = sanitizeShared(form);
  const { markEdited, clearSaved, restored, hasSaved } = useSharedConditions({
    fromUrl: sanitizeShared(initialValues ?? {}),
    current: sharedNow,
    apply: (patch) => setForm((f) => ({ ...f, ...patch })),
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [view, setView] = useState<"year" | "month">("year");
  const [retry, setRetry] = useState(0);
  // 二人で借りる設定は共通条件には含めず、このコンポーネント内だけで持つ（URLには出さない）。
  const [pair, setPair] = useState<PairOptions>(initialPair);

  const { request, errors } = useMemo(() => validate(form, pair), [form, pair]);
  const key = request ? JSON.stringify(request) + retry : null;

  useEffect(() => {
    if (!request || !key) return;
    const ctrl = new AbortController();
    const body: RepaymentRequest = request;
    const timer = setTimeout(() => {
      calculateRepayment(body, ctrl.signal)
        .then((data) =>
          setOutcome({
            key,
            data,
            request: body,
            date: formatDateJa(new Date()),
          }),
        )
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

  const set = <K extends keyof FormValues>(k: K, v: FormValues[K]) => {
    markEdited(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const err = (k: keyof typeof errors) =>
    touched[k] || outcome ? errors[k] : undefined;

  const current = outcome && outcome.key === key ? outcome : null;
  const loading = !!request && !current;
  // 表示中の結果と、その計算条件（shown）。ライブの入力(form/request)とはずれうる。
  const shownOutcome = request && outcome?.data ? outcome : null;
  const data = shownOutcome?.data;
  const shown = shownOutcome?.request;
  const shownDate = shownOutcome?.date ?? "";
  const stale = !!data && loading;
  const yearRows = useMemo(
    () => (data ? aggregateByYear(data.schedule) : []),
    [data],
  );
  const hasBonus = !!data && data.bonusPayment > 0;
  const pairData =
    shown?.selfSharePercent !== undefined ? data?.pairBreakdown : null;
  const selfPercent = shown?.selfSharePercent ?? 0;
  const pairNotesProvisional = !!pairData?.notes.includes(
    "PAIR_SHARE_PROVISIONAL",
  );

  function exportCsv(unit: ScheduleUnit) {
    if (!data || !shown) return;
    const rows =
      unit === "year"
        ? yearRows.map((r) => ({ ...r, period: r.year }))
        : data.schedule.map((r) => ({ ...r, period: r.month }));
    downloadCsv(
      scheduleCsvFilename(unit),
      buildScheduleCsv(rows, {
        unit,
        hasBonus,
        meta: [
          ...loanConditionRows(shown, shownDate, true),
          ["注記", ESTIMATE_NOTE],
        ],
      }),
    );
  }
  const nextSteps: NextStep[] = [
    {
      href: hrefWith("/prepayment", sharedNow),
      label: "繰上げ返済の効果を試算",
      hint: "まとまった金額を返済に充てた場合の、期間や利息の目安を比べられます。",
    },
    {
      href: hrefWith("/rate-scenario", sharedNow),
      label: "金利が上がった場合を試算",
      hint: "金利が上昇したときの毎月の返済額の目安を確認できます。",
    },
    {
      href: hrefWith("/total-cost", sharedNow),
      label: "住居費の総額を試算",
      hint: "諸費用なども含めた住居費の総額の目安を確認できます。",
    },
  ];

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
      <form
        className="panel no-print"
        onSubmit={(e) => e.preventDefault()}
        noValidate
        aria-label="借入条件"
      >
        <h2>借入条件</h2>
        {field(
          "principalMan",
          "借入金額",
          "万円",
          form.principalMan,
          (v) => set("principalMan", v),
          {
            step: STEP_MAN_LARGE,
            hint: "例：3000万円 ＝ 30,000,000円",
          },
        )}
        {field("rate", "金利（年率）", "%", form.rate, (v) => set("rate", v), {
          step: STEP_RATE,
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
              {field(
                "bonusMan",
                "ボーナス返済分の借入額",
                "万円",
                form.bonusMan,
                (v) => set("bonusMan", v),
                {
                  step: STEP_MAN_LARGE,
                  hint: "借入金額のうち、ボーナス月（6か月ごと）に返す分です。",
                },
              )}
            </div>
          )}
        </div>
        <div className="field">
          <label className="check">
            <input
              type="checkbox"
              checked={pair.enabled}
              onChange={(e) =>
                setPair((p) => ({ ...p, enabled: e.target.checked }))
              }
            />
            二人で借りる（負担割合を分けて見る）
          </label>
          {pair.enabled && (
            <div className="bonus-field">
              <NumberField
                id="selfSharePercent"
                label="あなたの負担割合"
                unit="%"
                value={pair.selfPercent}
                onChange={(v) => setPair((p) => ({ ...p, selfPercent: v }))}
                onBlur={blur("selfSharePercent")}
                step={STEP_PERCENT_WHOLE}
                inputMode="numeric"
                hint="1〜99%の整数で入力できます。残りをパートナーの負担として計算します。"
                error={err("selfSharePercent")}
              />
            </div>
          )}
        </div>
        <SavedConditionsNotice
          restored={restored}
          hasSaved={hasSaved}
          onClear={clearSaved}
        />
      </form>

      <section
        className="results print-area"
        aria-labelledby="result-h"
        aria-busy={loading}
      >
        <h2 id="result-h">試算結果</h2>
        <div aria-live="polite" role="status" className="status no-print">
          {!request &&
            "入力内容に誤りがあります。左（上）のエラーを確認してください。"}
          {request && loading && "計算しています…"}
          {request && !loading && current?.data && "計算結果を更新しました。"}
        </div>

        {current?.error && (
          <div className="alert no-print" role="alert">
            <p>{current.error}</p>
            <button type="button" onClick={() => setRetry((r) => r + 1)}>
              再計算する
            </button>
          </div>
        )}

        {data && shown && (
          <div className={stale ? "stale" : undefined}>
            <div className="print-only">
              <h3>借入条件</h3>
              <dl className="print-conditions">
                {loanConditionRows(shown, shownDate, false).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="hint">{ESTIMATE_NOTE}</p>
            </div>
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
            {shown.method === "EQUAL_PRINCIPAL" && (
              <p className="hint">
                元金均等返済では、毎月の返済額は少しずつ減ります。
              </p>
            )}

            <h3>残高推移</h3>
            <BalanceChart
              schedule={data.schedule}
              principal={shown.principal}
              years={shown.years}
            />

            <h3>年ごとの返済額の内訳</h3>
            <YearlyChart rows={yearRows} />
            <p className="legend">
              <span className="sw sw-p" /> 元金 <span className="sw sw-i" />{" "}
              利息
            </p>

            {pairData && (
              <div className="pair-breakdown">
                <h3>二人の負担内訳</h3>
                <p className="hint">
                  あなた {selfPercent}% ／ パートナー {100 - selfPercent}%
                </p>
                <div
                  className="table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="二人の負担内訳（横にスクロールできます）"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">項目</th>
                        <th scope="col">あなた</th>
                        <th scope="col">パートナー</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">借入額</th>
                        <td>{yen(pairData.self.principal)}</td>
                        <td>{yen(pairData.partner.principal)}</td>
                      </tr>
                      <tr>
                        <th scope="row">毎月の返済額（初回）</th>
                        <td>{yen(pairData.self.monthlyPayment)}</td>
                        <td>{yen(pairData.partner.monthlyPayment)}</td>
                      </tr>
                      {hasBonus && (
                        <tr>
                          <th scope="row">ボーナス返済（初回）</th>
                          <td>{yen(pairData.self.bonusPayment)}</td>
                          <td>{yen(pairData.partner.bonusPayment)}</td>
                        </tr>
                      )}
                      <tr>
                        <th scope="row">返済総額</th>
                        <td>{yen(pairData.self.totalPayment)}</td>
                        <td>{yen(pairData.partner.totalPayment)}</td>
                      </tr>
                      <tr>
                        <th scope="row">利息総額</th>
                        <td>{yen(pairData.self.totalInterest)}</td>
                        <td>{yen(pairData.partner.totalInterest)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {pairNotesProvisional && (
                  <p className="hint">
                    それぞれが自分の負担分を別のローンとして返す、簡易的な計算です。実際のペアローン・連帯債務の扱いは金融機関によって異なります。
                  </p>
                )}
                <p className="hint">
                  円未満の四捨五入のため、二人の合計が全体の計算と数円ずれることがあります。
                </p>
              </div>
            )}

            <div className="table-head">
              <h3>返済表</h3>
              <div
                role="group"
                aria-label="表示単位"
                className="toggle no-print"
              >
                <button
                  type="button"
                  aria-pressed={view === "year"}
                  onClick={() => setView("year")}
                >
                  年次
                </button>
                <button
                  type="button"
                  aria-pressed={view === "month"}
                  onClick={() => setView("month")}
                >
                  月次
                </button>
              </div>
            </div>
            <div
              className="table-wrap"
              tabIndex={0}
              role="region"
              aria-label="返済表（横にスクロールできます）"
            >
              <table>
                <caption className="sr-only">
                  {view === "year" ? "年次の返済表" : "月次の返済表"}
                </caption>
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
                    ? yearRows.map((r) => ({
                        k: r.year,
                        label: `${r.year}年目`,
                        ...r,
                      }))
                    : data.schedule.map((r) => ({
                        k: r.month,
                        label: `${r.month}回`,
                        ...r,
                      }))
                  ).map((r) => (
                    <tr key={r.k}>
                      <th scope="row">{r.label}</th>
                      <td>{r.payment.toLocaleString("ja-JP")}</td>
                      {hasBonus && (
                        <td>{r.bonusPayment.toLocaleString("ja-JP")}</td>
                      )}
                      <td>{r.principal.toLocaleString("ja-JP")}</td>
                      <td>{r.interest.toLocaleString("ja-JP")}</td>
                      <td>{r.balance.toLocaleString("ja-JP")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="hint">金額の単位は円です。</p>
            <div className="export-actions">
              <button
                type="button"
                className="btn-sub no-print"
                onClick={() => exportCsv(view)}
              >
                CSVでダウンロード
              </button>
              <button
                type="button"
                className="btn-sub no-print"
                onClick={() => window.print()}
              >
                印刷する
              </button>
            </div>
            <div className="no-print">
              <NextSteps items={nextSteps} />
            </div>
          </div>
        )}

        {request && (
          <div className="result-actions no-print">
            <ShareLinkButton conditions={sharedNow} />
          </div>
        )}

        <p className="disclaimer">
          試算結果は目安であり、実際の返済額・審査結果を保証するものではありません。
        </p>
      </section>
    </div>
  );
}
