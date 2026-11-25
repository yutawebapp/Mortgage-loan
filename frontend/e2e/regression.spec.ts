import { expect, test } from "@playwright/test";
import type { BudgetResponse } from "../src/lib/api/budget";
import type { TaxDeductionResponse } from "../src/lib/api/taxDeduction";

test("全角数値を半角に変換して計算する", async ({ page }) => {
  await page.goto("/budget");
  const rate = page.getByLabel("金利（年率）");
  const response = page.waitForResponse((r) =>
    r.url().includes("/api/v1/simulations/budget") && r.ok() &&
    r.request().postDataJSON().annualRatePercent === 1.25);
  await rate.fill("１．２５");
  await expect(rate).toHaveValue("1.25");
  await response;
  await expect(page.getByRole("status").filter({ hasText: "計算結果を更新しました" })).toBeVisible();
  await rate.press("ArrowUp");
  await expect(rate).toHaveValue("1.26");
  await rate.press("ArrowDown");
  await expect(rate).toHaveValue("1.25");
  await rate.dispatchEvent("compositionstart");
  await rate.fill("２．５");
  await expect(rate).toHaveValue("２．５");
  await rate.dispatchEvent("compositionend", { data: "２．５" });
  await expect(rate).toHaveValue("2.5");
  await rate.fill("0x10");
  await expect(rate).toHaveValue("0x10");
  await expect(page.getByRole("status").filter({ hasText: "入力内容に誤りがあります" })).toBeVisible();
});

test("住居費の固定資産税は価格に追従し、手入力と共有URLを優先する", async ({ page }) => {
  await page.goto("/total-cost");
  const price = page.getByLabel("物件価格", { exact: true });
  const tax = page.getByLabel("固定資産税・都市計画税（年額）");
  await expect(tax).toHaveValue("120000");
  await price.fill("5000");
  await expect(tax).toHaveValue("150000");
  await tax.fill("99999");
  await price.fill("6000");
  await expect(tax).toHaveValue("99999");
  await page.getByLabel("マンション", { exact: true }).check();
  await expect(tax).toHaveValue("180000");
  await price.fill("7000");
  await expect(tax).toHaveValue("210000");
  await page.goto("/total-cost?principal=5000&tax=12345");
  await expect(price).toHaveValue("5000");
  await expect(tax).toHaveValue("12345");
  await price.fill("6000");
  await expect(tax).toHaveValue("12345");
  await page.goto("/total-cost?principal=5000");
  await expect(price).toHaveValue("5000");
  await expect(tax).toHaveValue("150000");
});

test("購入予算から結果の借入額・金利・期間を返済画面へ渡す", async ({ page }) => {
  await page.goto("/budget");
  await page.getByLabel("金利（年率）").fill("1.7");
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/v1/simulations/budget") &&
    response.request().postDataJSON().annualRatePercent === 1.7 &&
    response.request().postDataJSON().years === 30 && response.ok());
  await page.getByLabel("返済期間").fill("30");
  const response = await responsePromise;
  const budget: BudgetResponse = await response.json();
  const next = page.getByRole("link", { name: "この借入額で返済額を試算する" });
  await expect(next).toHaveAttribute("href", `/simulation?principal=${budget.maxLoanAmount / 10000}&rate=1.7&years=30`);
  await next.click();
  await expect(page.getByLabel("借入金額", { exact: true })).toHaveValue(String(budget.maxLoanAmount / 10000));
  await expect(page.getByLabel("金利（年率）")).toHaveValue("1.7");
  await expect(page.getByLabel("返済期間")).toHaveValue("30");
  await expect(page.getByRole("status").filter({ hasText: "計算結果を更新しました" })).toBeVisible();
});

test("通信失敗後に旧結果を通常表示しない", async ({ page }) => {
  await page.goto("/simulation");
  const result = page.locator("section.results");
  await expect(result.getByText("毎月の返済額（初回）")).toBeVisible();
  await page.route("**/api/v1/simulations/repayment", (route) => route.abort("failed"));
  await page.getByLabel("金利（年率）").fill("1.7");
  await expect(result.getByRole("alert")).toContainText("通信に失敗しました");
  await expect(result.getByText("毎月の返済額（初回）")).toHaveCount(0);
  await expect(result.getByText("計算結果を更新しました")).toHaveCount(0);
});

test("片方のみ控除対象でも世帯の返済と残高に両方を含む", async ({ page }) => {
  await page.goto("/tax-deduction");
  await page.getByLabel("登記簿上の床面積").selectOption("FROM_40_TO_UNDER_50");
  await page.getByLabel("ペアローン", { exact: true }).check();
  await page.getByLabel("あなたの年収（額面）").fill("600");
  const responsePromise = page.waitForResponse((r) => {
    if (!r.url().includes("/api/v1/simulations/tax-deduction") || !r.ok()) return false;
    const body = r.request().postDataJSON();
    return body.mode === "PAIR_LOAN" && body.annualIncome === 6000000 && body.partnerAnnualIncome === 12000000;
  });
  await page.getByLabel("配偶者・パートナーの年収（額面）").fill("1200");
  const response = await responsePromise;
  const data: TaxDeductionResponse = await response.json();
  expect(data.persons?.map((p) => p.eligible)).toEqual([true, false]);
  expect(data.years[0].annualPayment).toBe(933440);
  expect(data.years[0].yearEndBalance).toBe(39384408);
  expect(data.totals?.totalPayment).toBe(17735360);
  expect(data.totals?.totalDeduction).toBe(data.persons?.[0].totals?.totalDeduction);
  const result = page.locator("section.results");
  await expect(result.getByText("17,735,360円")).toBeVisible();
  await expect(result.getByRole("row", { name: /入居後1年目/ })).toContainText("39,384,408円");
  await expect(result.getByRole("region", { name: "配偶者・パートナー" }).getByRole("note")).toBeVisible();
});
