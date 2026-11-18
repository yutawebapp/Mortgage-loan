import { BORROWER_MODES, type BorrowerMode } from "@/lib/borrowerMode";

/** 借り方の選択（ラジオ）。借入可能額と住宅ローン控除で共通。 */
export function BorrowerModeSelector({
  name,
  value,
  onChange,
}: {
  /** ラジオグループの name（ページ内で一意に）。 */
  name: string;
  value: BorrowerMode;
  onChange: (m: BorrowerMode) => void;
}) {
  return (
    <fieldset className="field">
      <legend>ローンの借り方</legend>
      {BORROWER_MODES.map((m) => (
        <label className="radio-block" key={m.value}>
          <input type="radio" name={name} checked={value === m.value} onChange={() => onChange(m.value)} />
          <span>
            <span className="rb-label">{m.label}</span>
            <span className="rb-desc">{m.desc}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
