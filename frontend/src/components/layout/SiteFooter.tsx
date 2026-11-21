import Link from "next/link";
import { LEGAL_LINKS, NAV_GROUPS, navGroupTools } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-name">
          <Link href="/">{SITE_NAME}</Link>
        </p>
        <nav aria-label="フッターメニュー" className="footer-groups">
          {NAV_GROUPS.map((g, i) => (
            <div key={g.label} className="footer-group">
              <p className="footer-group-title" id={`footer-group-${i}`}>
                {g.label}
              </p>
              <ul className="footer-nav" aria-labelledby={`footer-group-${i}`}>
                {navGroupTools(g.hrefs).map((t) => (
                  <li key={t.href}>
                    <Link href={t.href}>{t.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <nav aria-label="サイト情報" className="footer-legal">
          <ul className="footer-nav">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="footer-note">
          試算結果は目安であり、実際の返済額・借入可否・審査結果を保証するものではありません。最終的な条件は、各金融機関の公式情報でご確認ください。
        </p>
      </div>
    </footer>
  );
}
