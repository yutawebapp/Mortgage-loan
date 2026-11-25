"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { NAV_GROUPS, isActivePath, navGroupTools } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

// globals.css のデスクトップ用プルダウン切替幅とそろえる。
const DESKTOP_MEDIA_QUERY = "(min-width: 880px)";
// ポインタがボタンからメニューへ移動する間に閉じないための短い猶予。
const HOVER_CLOSE_DELAY_MS = 160;

// 開いている状態は「どのページで開いたか」と一緒に持つ。ページが変わると自然に閉じる。
type Open = { path: string; group: number | null; menu: boolean };

export default function SiteHeader() {
  const pathname = usePathname();
  const [state, setState] = useState<Open>({ path: pathname, group: null, menu: false });
  const open = state.path === pathname ? state : { path: pathname, group: null, menu: false };
  const headerRef = useRef<HTMLElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const groupBtns = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimer = useRef<number | null>(null);

  const anyOpen = open.group !== null || open.menu;

  const cancelCloseTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const close = () => {
    cancelCloseTimer();
    setState({ path: pathname, group: null, menu: false });
  };

  useEffect(() => cancelCloseTimer, []);

  // 外側をクリック・タップしたら閉じる。
  useEffect(() => {
    if (!anyOpen) return;
    const onDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        cancelCloseTimer();
        setState({ path: pathname, group: null, menu: false });
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [anyOpen, pathname]);

  // Esc で閉じて、開いたボタンにフォーカスを戻す。
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape" || !anyOpen) return;
    e.preventDefault();
    const target = open.group !== null ? groupBtns.current[open.group] : menuBtn.current;
    close();
    target?.focus();
  };

  // Tab でメニューの外に出たら閉じる。
  const onBlur = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next)) close();
  };

  // デスクトップのマウスホバーで開閉する（タッチ・狭い画面の動作には干渉しない）。
  const isDesktopMouse = (e: ReactPointerEvent) =>
    e.pointerType === "mouse" && window.matchMedia(DESKTOP_MEDIA_QUERY).matches;

  const onGroupPointerEnter = (index: number, e: ReactPointerEvent<HTMLLIElement>) => {
    if (!isDesktopMouse(e)) return;
    cancelCloseTimer();
    setState({ path: pathname, group: index, menu: false });
  };

  const onGroupPointerLeave = (index: number, e: ReactPointerEvent<HTMLLIElement>) => {
    if (!isDesktopMouse(e)) return;
    cancelCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setState((prev) => (prev.path === pathname && prev.group === index ? { ...prev, group: null } : prev));
    }, HOVER_CLOSE_DELAY_MS);
  };

  // グループ内から別のグループ等へフォーカスが移ったら、そのグループを閉じる。
  const onGroupBlur = (index: number, e: FocusEvent<HTMLLIElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next)) {
      cancelCloseTimer();
      setState((prev) => (prev.path === pathname && prev.group === index ? { ...prev, group: null } : prev));
    }
  };

  return (
    <header className="site-header" ref={headerRef} onKeyDown={onKeyDown} onBlur={onBlur}>
      <div className="site-header-inner">
        <Link href="/" className="site-name">
          {SITE_NAME}
        </Link>
        <button
          type="button"
          ref={menuBtn}
          className="menu-toggle"
          aria-expanded={open.menu}
          aria-controls="site-nav-list"
          onClick={() => setState({ path: pathname, group: null, menu: !open.menu })}
        >
          メニュー
        </button>
        <nav aria-label="主要メニュー" className={open.menu ? "site-nav-wrap is-open" : "site-nav-wrap"}>
          <ul className="site-nav" id="site-nav-list">
            {NAV_GROUPS.map((g, i) => {
              const tools = navGroupTools(g.hrefs);
              if (tools.length === 1) {
                const t = tools[0];
                const active = isActivePath(pathname, t.href);
                return (
                  <li key={g.label} className="nav-item">
                    <Link
                      href={t.href}
                      aria-current={active ? "page" : undefined}
                      className="nav-link"
                      onClick={close}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              }
              const groupActive = tools.some((t) => isActivePath(pathname, t.href));
              const isOpen = open.group === i;
              const listId = `site-nav-group-${i}`;
              return (
                <li
                  key={g.label}
                  className={`nav-item nav-group${isOpen ? " is-open" : ""}`}
                  onPointerEnter={(e) => onGroupPointerEnter(i, e)}
                  onPointerLeave={(e) => onGroupPointerLeave(i, e)}
                  onBlur={(e) => onGroupBlur(i, e)}
                >
                  <button
                    type="button"
                    ref={(el) => {
                      groupBtns.current[i] = el;
                    }}
                    className={`nav-trigger${groupActive ? " is-active" : ""}`}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    onClick={() => {
                      cancelCloseTimer();
                      setState({ path: pathname, group: isOpen ? null : i, menu: open.menu });
                    }}
                  >
                    {g.label}
                    <span className="nav-caret" aria-hidden="true" />
                  </button>
                  <span className="nav-group-title">
                    {g.label}
                  </span>
                  <ul className="nav-sub" id={listId}>
                    {tools.map((t) => (
                      <li key={t.href}>
                        <Link
                          href={t.href}
                          aria-current={isActivePath(pathname, t.href) ? "page" : undefined}
                          onClick={close}
                        >
                          {t.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
