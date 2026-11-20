// 運営者情報。/about と /privacy に表示する。
// null の項目は画面に表示しない。架空の名称・住所・連絡先を入れないこと。
// 公開前に、実際の情報を記入する（TODO(公開前に記入) の箇所すべて）。

// TODO(公開前に記入): 運営者名（個人で運営する場合は屋号または氏名）
export const OPERATOR_NAME: string | null = null;

// TODO(公開前に記入): 所在地（個人の住所を載せない場合は、都道府県までなど運営者の判断で決める）
export const OPERATOR_ADDRESS: string | null = null;

// TODO(公開前に記入): お問い合わせ先（メールアドレス、または問い合わせフォームのURL）
export const OPERATOR_CONTACT: string | null = null;

// TODO(公開前に記入): 最終更新日（YYYY-MM-DD）。公開するページ内容を最後に見直した日。
export const LAST_UPDATED: string | null = null;

export type OperatorInfo = {
  name: string | null;
  address: string | null;
  contact: string | null;
};

export const OPERATOR: OperatorInfo = {
  name: OPERATOR_NAME,
  address: OPERATOR_ADDRESS,
  contact: OPERATOR_CONTACT,
};

export type OperatorRow = { label: string; value: string };

function clean(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/** 値が入っている項目だけを、表示用の行にして返す（null・空白だけの項目は含めない）。 */
export function operatorRows(op: OperatorInfo = OPERATOR): OperatorRow[] {
  const rows: OperatorRow[] = [];
  const name = clean(op.name);
  const address = clean(op.address);
  const contact = clean(op.contact);
  if (name) rows.push({ label: "運営者", value: name });
  if (address) rows.push({ label: "所在地", value: address });
  if (contact) rows.push({ label: "お問い合わせ", value: contact });
  return rows;
}

/** YYYY-MM-DD を「2026年11月17日」の形にする。不正な値・未設定なら null。 */
export function formatLastUpdated(iso: string | null = LAST_UPDATED): string | null {
  const v = clean(iso);
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}
