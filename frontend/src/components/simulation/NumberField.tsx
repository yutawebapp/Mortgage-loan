import type { ReactNode } from "react";
import { NumericInput } from "./NumericInput";

type Props = {
  /** input の id。ヒント・エラーの id は `${id}-hint` / `${id}-err` になる。 */
  id: string;
  label: ReactNode;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  /** スピナーの増減幅（src/lib/inputSteps.ts の定数を渡す）。 */
  step: string;
  hint?: string;
  error?: string;
  inputMode?: "numeric" | "decimal" | "text";
  /** 入力できる最小値（既定は 0。マイナスを許す欄だけ指定する）。 */
  min?: number;
  /** 入力欄の前に出す文字（例：「+」）。 */
  pre?: string;
  /** ヒントとエラーの間に出す追加の要素。 */
  extra?: ReactNode;
};

/** 数値入力1項目（ラベル・入力欄・単位・ヒント・エラー）。各ツールで共通。 */
export function NumberField({
  id,
  label,
  unit,
  value,
  onChange,
  onBlur,
  step,
  hint,
  error,
  inputMode = "decimal",
  min = 0,
  pre,
  extra,
}: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        {pre && <span className="unit-pre">{pre}</span>}
        <NumericInput
          id={id}
          inputMode={inputMode}
          step={step}
          min={min}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
        />
        <span className="unit">{unit}</span>
      </div>
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : (
        <span id={`${id}-hint`} hidden />
      )}
      {extra}
      {error && (
        <p className="field-error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}
