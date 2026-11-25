"use client";

import { useState } from "react";
import { buildShareUrl, type SharedConditions } from "@/lib/sharedConditions";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 下のフォールバックへ
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * 現在のページURL + 有効な共通条件（クエリ）をクリップボードにコピーする。
 * 条件が不正な項目や、このページが受け取らない項目はクエリに含めない。
 * extra は呼び出し側の任意クエリ（例: 物件価格 principal）。label で文言を変えられる。
 */
export default function ShareLinkButton({
  conditions,
  extra,
  label = "この条件のリンクをコピー",
}: {
  conditions: SharedConditions;
  extra?: Record<string, string>;
  label?: string;
}) {
  const [status, setStatus] = useState("");

  async function onClick() {
    const url = buildShareUrl(window.location.origin, window.location.pathname, conditions, extra);
    const ok = await copyText(url);
    setStatus(ok ? "コピーしました" : "コピーできませんでした。アドレス欄のURLをコピーしてください。");
  }

  return (
    <div className="share-link">
      <button type="button" className="btn-sub" onClick={onClick}>
        {label}
      </button>
      <span role="status" aria-live="polite" className="status">
        {status}
      </span>
    </div>
  );
}
