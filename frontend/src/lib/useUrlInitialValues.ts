"use client";

import { useEffect, useRef } from "react";
import { queryRecordFromSearch, type QueryRecord } from "./urlQuery";

/**
 * URLクエリの値を、マウント後の effect で一度だけ適用する（hydration 安全）。
 *
 * - 描画中には window を読まない。サーバー HTML とクライアントの初回描画は既定値で一致する。
 * - parse が null / undefined を返すか、空のオブジェクトを返したら何もしない。
 * - 優先順位は呼び出し側で決める: 同じマウント時の effect 内で useSharedConditions が保存値を入れ、
 *   このフックの apply が URL の値で上書きする（URL > 保存値 > 既定値）。
 */
export function useUrlInitialValues<T>(
  parse: (q: QueryRecord) => T | null | undefined,
  apply: (value: T) => void,
): void {
  const parseRef = useRef(parse);
  const applyRef = useRef(apply);

  // 参照の更新は effect で行う（描画中に ref を書かない）。定義順に実行される。
  useEffect(() => {
    parseRef.current = parse;
    applyRef.current = apply;
  });

  useEffect(() => {
    const value = parseRef.current(queryRecordFromSearch(window.location.search));
    if (value === null || value === undefined) return;
    if (typeof value === "object" && Object.keys(value).length === 0) return;
    applyRef.current(value);
  }, []);
}
