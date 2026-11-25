import { DISCLAIMER, SAMPLE_NOTICE, STALE_DAYS } from "@/lib/products";

export function SampleNotice() {
  return (
    <p className="notice-sample" role="note">
      <strong>サンプルデータ</strong>
      {SAMPLE_NOTICE}
    </p>
  );
}

export function Disclaimer() {
  return <p className="disclaimer">{DISCLAIMER}</p>;
}

export function StaleBadge() {
  return (
    <span className="badge-stale" title={`金利の適用開始日から${STALE_DAYS}日を超えています`}>
      {`金利が${STALE_DAYS}日以上更新されていません`}
    </span>
  );
}
