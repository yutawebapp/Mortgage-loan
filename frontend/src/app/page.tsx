import Link from "next/link";

const categories = [
  { href: "/simulation", label: "返済シミュレーター" },
  { href: "/products", label: "金融機関・商品比較" },
  { href: "/refinance", label: "借り換え診断" },
  { href: "/eligibility", label: "借入可能額/審査目安" },
];

export default function Home() {
  return (
    <main>
      <h1>住宅ローン比較・シミュレーション</h1>
      <ul className="category-list">
        {categories.map((c) => (
          <li key={c.href}>
            <Link href={c.href}>{c.label}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
