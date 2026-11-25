// 借り方（ひとりで借りる／ペアローン／収入合算）。借入可能額と住宅ローン控除で共通。

export type BorrowerMode = "SINGLE" | "PAIR_LOAN" | "JOINT_DEBT" | "JOINT_GUARANTEE";
export type PersonRole = "A" | "B";

export const PERSON_LABEL: Record<PersonRole, string> = {
  A: "あなた",
  B: "配偶者・パートナー",
};

export const BORROWER_MODES: { value: BorrowerMode; label: string; desc?: string }[] = [
  { value: "SINGLE", label: "ひとりで借りる" },
  { value: "PAIR_LOAN", label: "ペアローン" },
  { value: "JOINT_DEBT", label: "収入合算（連帯債務）", desc: "二人とも債務者" },
  { value: "JOINT_GUARANTEE", label: "収入合算（連帯保証）", desc: "債務者は1人、もう1人は保証人" },
];

export const isTwoPerson = (m: BorrowerMode) => m !== "SINGLE";

/** 二人で負担割合を決めるローン（ペアローン・収入合算（連帯債務））。 */
export const hasSplitRatio = (m: BorrowerMode) => m === "PAIR_LOAN" || m === "JOINT_DEBT";

const MODES: readonly string[] = ["SINGLE", "PAIR_LOAN", "JOINT_DEBT", "JOINT_GUARANTEE"];
/** 想定外の値は SINGLE として扱う。 */
export function asBorrowerMode(s: unknown): BorrowerMode {
  return typeof s === "string" && MODES.includes(s) ? (s as BorrowerMode) : "SINGLE";
}
