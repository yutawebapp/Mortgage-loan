import Link from "next/link";

export type NextStep = { href: string; label: string; hint: string };

/** 結果エリア内の「次に調べる」リンク。最大3件。 */
export default function NextSteps({ items }: { items: NextStep[] }) {
  const shown = items.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <section className="next-steps" aria-labelledby="next-steps-h">
      <h3 id="next-steps-h">次に調べる</h3>
      <ul>
        {shown.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
            <p className="hint">{item.hint}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
