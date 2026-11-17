import Link from "next/link";
import { TOOLS } from "@/lib/nav";
import { SITE_NAME } from "@/lib/site";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="footer-name">
          <Link href="/">{SITE_NAME}</Link>
        </p>
        <nav aria-label="フッターメニュー">
          <ul className="footer-nav">
            {TOOLS.map((t) => (
              <li key={t.href}>
                <Link href={t.href}>{t.label}</Link>
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
