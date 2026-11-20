"use client";

import { useState } from "react";
import type { SharedKey } from "@/lib/sharedConditions";

const LABEL: Record<SharedKey, string> = {
  principalMan: "借入額",
  rate: "金利",
  years: "返済期間",
};

/**
 * 借入条件の保存に関する注記と「保存した条件を消す」操作。
 * - 復元した項目（restored）があるときは、どの項目を入れたかを示す。
 * - 何も保存されておらず復元もないときは何も出さない。
 */
export default function SavedConditionsNotice({
  restored,
  hasSaved,
  onClear,
}: {
  restored: SharedKey[];
  hasSaved: boolean;
  onClear: () => void;
}) {
  const [cleared, setCleared] = useState(false);

  if (!hasSaved && restored.length === 0) {
    return cleared ? (
      <p className="hint saved-conditions" role="status" aria-live="polite">
        保存した条件を消しました。
      </p>
    ) : null;
  }

  function clear() {
    onClear();
    setCleared(true);
  }

  const labels = restored.map((k) => LABEL[k]).join("・");

  return (
    <div className="hint saved-conditions">
      <p>
        {restored.length > 0
          ? `前回入力した${labels}を入れてあります（この端末のブラウザにだけ保存）`
          : "入力した条件は、この端末のブラウザにだけ保存されます。"}
      </p>
      {hasSaved && (
        <button type="button" className="btn-sub" onClick={clear}>
          保存した条件を消す
        </button>
      )}
    </div>
  );
}
