// 借り方（ひとりで借りる／ペアローン／収入合算）。借入可能額と住宅ローン控除で共通。

export type BorrowerMode = "SINGLE" | "PAIR_LOAN" | "JOINT_DEBT" | "JOINT_GUARANTEE";
export type PersonRole = "A" | "B";

export const PERSON_LABEL: Record<PersonRole, string> = {
  A: "あなた",
  B: "配偶者・パートナー",
};

export const BORROWER_MODES: { value: BorrowerMode; label: string; desc: string }[] = [
  { value: "SINGLE", label: "ひとりで借りる", desc: "あなたひとりの名義で、1本のローンを借ります。" },
  { value: "PAIR_LOAN", label: "ペアローン", desc: "夫婦などが、それぞれ自分名義のローンを組みます（2本）。" },
  { value: "JOINT_DEBT", label: "収入合算（連帯債務）", desc: "1本のローンを、二人で負担します。" },
  { value: "JOINT_GUARANTEE", label: "収入合算（連帯保証）", desc: "1人が借り、もう1人は保証人になります。" },
];

export const isTwoPerson = (m: BorrowerMode) => m !== "SINGLE";

const MODES: readonly string[] = ["SINGLE", "PAIR_LOAN", "JOINT_DEBT", "JOINT_GUARANTEE"];
/** 想定外の値は SINGLE として扱う。 */
export function asBorrowerMode(s: unknown): BorrowerMode {
  return typeof s === "string" && MODES.includes(s) ? (s as BorrowerMode) : "SINGLE";
}
