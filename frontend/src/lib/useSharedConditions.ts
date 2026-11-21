"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { queryRecordFromSearch } from "./urlQuery";
import {
  SHARED_KEYS,
  STORAGE_KEY,
  decodeStored,
  encodeStored,
  isSharedKey,
  sanitizeShared,
  type SharedConditions,
  type SharedKey,
} from "./sharedConditions";

const SAVE_DELAY_MS = 500;

function readStored(): SharedConditions {
  try {
    return decodeStored(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // プライベートモード等でストレージが使えない場合は保存なしで続行
    return {};
  }
}

function writeStored(c: SharedConditions) {
  try {
    window.localStorage.setItem(STORAGE_KEY, encodeStored(c));
  } catch {
    // 保存できなくても入力は続けられる
  }
}

function removeStored() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}

/**
 * ツール間で共通の借入条件を localStorage に保存・復元する。
 *
 * - 復元・URL読み取りはマウント後の effect でのみ行う（描画中に localStorage / window を読まない＝hydration 安全）。
 *   URLクエリ（window.location.search の共通キー）で指定された項目は上書きしない（URLが優先）。
 *   URLの値そのものの適用は呼び出し側（各ツールの useUrlInitialValues）が行う。
 * - 保存するのは、ユーザーが markEdited(key) で編集した項目だけ。URLクエリや既定値から来ただけの項目は保存しない。
 *   そのため、共有リンクや次に調べるリンクを開いても保存値は書き換わらない。
 * - 保存は有効な値だけを、変更後 500ms のデバウンスで書く。無効な項目は既存の保存値を残す。
 * - 復元した項目は restored（実際にフォームへ入れたキー）で返す。hasSaved は保存値が今あるか。
 *   clearSaved で保存を消すと、ユーザーが再び編集するまで保存しない。
 * - 呼び出し側は、フォームの値を変えるたびに markEdited(key) を呼ぶこと。
 *
 * @param current  現在のフォームの共通条件（有効な値だけ、sanitizeShared 済みでなくても可）
 * @param apply    保存値をフォームへ反映する（例: setForm(f => ({ ...f, ...patch }))）
 * @param accept   遷移先が受け取れる値に絞る（例: acceptFor("/rate-scenario", c)）。省略時は全部受け取る。
 */
export function useSharedConditions({
  current,
  apply,
  accept,
}: {
  current: SharedConditions;
  apply: (patch: SharedConditions) => void;
  accept?: (c: SharedConditions) => SharedConditions;
}) {
  const [restored, setRestored] = useState<SharedKey[]>([]);
  const [hasSaved, setHasSaved] = useState(false);

  const currentRef = useRef(current);
  const applyRef = useRef(apply);
  const acceptRef = useRef(accept);
  const editedRef = useRef(new Set<string>());
  const readyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 参照の更新は effect で行う（描画中に ref を書かない）。定義順に実行される。
  useEffect(() => {
    currentRef.current = current;
    applyRef.current = apply;
    acceptRef.current = accept;
  });

  // マウント後に一度だけ保存値を適用する。
  useEffect(() => {
    const stored = readStored();
    // URLの共通キーは、マウント時点の window.location から読む（描画中には読まない）
    const url = sanitizeShared(queryRecordFromSearch(window.location.search));
    const patch: SharedConditions = {};
    for (const k of SHARED_KEYS) {
      if (stored[k] === undefined) continue;
      if (url[k] !== undefined) continue; // URLが優先
      patch[k] = stored[k];
    }
    const accepted = acceptRef.current ? acceptRef.current(patch) : patch;
    const keys = SHARED_KEYS.filter((k) => accepted[k] !== undefined);
    if (keys.length > 0) {
      const toApply: SharedConditions = {};
      for (const k of keys) toApply[k] = accepted[k];
      applyRef.current(toApply);
    }
    setRestored(keys);
    setHasSaved(Object.keys(stored).length > 0);
    readyRef.current = true;
  }, []);

  // 編集された有効な値の変化をデバウンスして保存する。
  const currentKey = SHARED_KEYS.map((k) => current[k] ?? "").join("|");
  useEffect(() => {
    if (!readyRef.current) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const valid = sanitizeShared(currentRef.current);
      const toSave: SharedConditions = {};
      for (const k of SHARED_KEYS) {
        if (editedRef.current.has(k) && valid[k] !== undefined) toSave[k] = valid[k];
      }
      if (Object.keys(toSave).length === 0) return;
      writeStored({ ...readStored(), ...toSave });
      setHasSaved(true);
    }, SAVE_DELAY_MS);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [currentKey]);

  const markEdited = useCallback((key: string) => {
    if (isSharedKey(key)) editedRef.current.add(key);
  }, []);

  /** 保存済みの条件を消す（フォームの現在値は変えない）。保留中の保存も取り消し、再編集まで保存しない。 */
  const clearSaved = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    editedRef.current.clear();
    removeStored();
    setRestored([]);
    setHasSaved(false);
  }, []);

  return { markEdited, clearSaved, restored, hasSaved };
}
