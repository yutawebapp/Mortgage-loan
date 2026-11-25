import { useRef, useState, type ComponentProps } from "react";
import { normalizeNumericInput, stepNumericInput } from "@/lib/numericInput";

type Props = Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "step" | "min" | "max"> & {
  value: string;
  onChange: (value: string) => void;
  step: string | number;
  min?: number;
  max?: number;
};

/** IME 変換中は親の値を更新せず、確定時に正規化する。 */
export function NumericInput({ value, onChange, step, min, max, inputMode = "decimal", onKeyDown, onCompositionStart, onCompositionEnd, ...props }: Props) {
  const composing = useRef(false);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <input
      {...props}
      type="text"
      inputMode={inputMode}
      value={draft ?? value}
      onChange={(event) => {
        if (composing.current) setDraft(event.target.value);
        else onChange(normalizeNumericInput(event.target.value));
      }}
      onCompositionStart={(event) => {
        composing.current = true;
        setDraft(event.currentTarget.value);
        onCompositionStart?.(event);
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        setDraft(null);
        onChange(normalizeNumericInput(event.currentTarget.value));
        onCompositionEnd?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || composing.current || event.nativeEvent.isComposing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        const next = stepNumericInput(value, step, min, max, event.key === "ArrowUp" ? 1 : -1);
        if (next !== null) onChange(next);
      }}
    />
  );
}
