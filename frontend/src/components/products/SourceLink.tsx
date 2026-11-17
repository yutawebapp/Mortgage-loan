import { safeUrl } from "@/lib/products";

export default function SourceLink({ url, label = "出典" }: { url: string; label?: string }) {
  const href = safeUrl(url);
  if (!href) return <span>出典情報なし</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label}
      <span className="sr-only">（新しいタブで開きます）</span>
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}
