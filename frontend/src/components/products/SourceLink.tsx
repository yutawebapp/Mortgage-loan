import { safeUrl } from "@/lib/products";

export default function SourceLink({ url, label = "出典", context }: { url: string; label?: string; context?: string }) {
  const href = safeUrl(url);
  if (!href) return <span>出典情報なし</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label}
      {context && <span className="sr-only">（{context}）</span>}
      <span className="sr-only">（新しいタブで開きます）</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
