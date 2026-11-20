# Mortgage-loan

住宅ローンに関する Web アプリケーション。一般個人(購入検討者)向けに、返済額の試算、金利の比較、住宅ローン控除の目安などを提供します。

## 機能

| 機能 | 画面 | 概要 |
|---|---|---|
| 返済シミュレーター | `/simulation` | 元利均等/元金均等、ボーナス併用、返済表・グラフ |
| 金融機関・商品比較 | `/products` | 金利タイプ別の絞り込み・並び替え、手数料・金利履歴 |
| 借り換え診断 | `/refinance` | 毎月/総支払額の差、損益分岐点 |
| 借入可能額/審査目安 | `/eligibility` | 返済負担率と審査金利からの借入可能額の目安(ペアローン・収入合算に対応) |
| 購入予算の逆算 | `/budget` | 毎月の返済額と頭金から、購入できる物件価格の目安 |
| 繰上げ返済シミュレーター | `/prepayment` | 期間短縮型/返済額軽減型の利息軽減額と短縮期間 |
| 金利上昇シミュレーション | `/rate-scenario` | 変動金利が上昇した場合の返済額の推移(簡易モデル) |
| 住宅ローン控除シミュレーター | `/tax-deduction` | 入居年・住宅の性能・年収から、控除額と実質負担の目安(ペアローン・連帯債務・連帯保証に対応) |
| 住居費の総額シミュレーター | `/total-cost` | 頭金・諸費用・管理費・固定資産税などを含めた総額と月平均の目安 |
| 賃貸と購入の比較 | `/rent-vs-buy` | 累計支出と実質負担を、仮定を置いて並べる(結論は示さない) |
| ライフプラン | `/life-plan` | 収入・生活費・住宅ローン・教育費から貯蓄の推移の目安(教育費は文科省の全国平均) |
| 金利タイプの比較 | `/rate-types` | 変動・固定期間選択型・全期間固定を、仮の金利で並べて比較(簡易モデル) |

試算結果はすべて目安であり、実際の返済額・審査結果・控除額を保証するものではありません。
商品データは開発用の架空データです(実在の金融機関・金利ではありません)。
住宅ローン控除の制度データは、入居年別に DB へ保持し、出典 URL と確認日を画面に表示します(入居 2026〜2030 年を対象)。税額は年収からの簡易推計(独身・扶養なしなどの前提)です。

## 技術スタック

- Backend: Spring Boot 3.5 / Java 21 / Maven / MyBatis / Flyway
- Database: PostgreSQL 16
- Frontend: Next.js 16 (TypeScript, App Router)
- テスト: JUnit 5 + Testcontainers(Backend)、Vitest(Frontend)
- ローカル環境: Docker Compose

## 起動方法

```bash
cp .env.example .env
docker compose up --build
```

| URL | 内容 |
|---|---|
| http://localhost:3000 | フロントエンド |
| http://localhost:8080/actuator/health | バックエンドのヘルスチェック |
| http://localhost:8080/swagger-ui.html | API 仕様 (springdoc) |
| http://localhost:8081 | Adminer (DB 確認用) |

DB を初期状態に戻す場合は `docker compose down -v` のあとに再起動します(DB のデータは消えます)。
フロントの `API_BASE_URL` と `NEXT_PUBLIC_SITE_URL` はビルド時に固定されます。変更したときは `--build` で再ビルドしてください。

## API(`/api/v1`)

| メソッド | パス | 内容 |
|---|---|---|
| POST | `/simulations/repayment` | 返済シミュレーター |
| POST | `/simulations/refinance` | 借り換え診断 |
| POST | `/simulations/eligibility` | 借入可能額/審査目安 |
| POST | `/simulations/budget` | 購入予算の逆算 |
| POST | `/simulations/prepayment` | 繰上げ返済 |
| POST | `/simulations/rate-scenarios` | 金利上昇シナリオ |
| POST | `/simulations/tax-deduction` | 住宅ローン控除 |
| POST | `/simulations/total-cost` | 住居費の総額 |
| POST | `/simulations/rate-types` | 金利タイプの比較 |
| POST | `/simulations/rent-vs-buy` | 賃貸と購入の比較 |
| POST | `/simulations/life-plan` | ライフプラン(家計の見通し・教育費・住宅ローン) |
| GET | `/products`, `/products/{id}` | 商品一覧・詳細 |

## テスト

```bash
cd backend && ./mvnw test      # JUnit 5。DB のテストは Testcontainers のため Docker が必要
cd frontend && npm test && npm run lint && npm run build
```

## ドキュメント

設計と仕様は [docs/design.md](docs/design.md) を参照してください。

## ブランチ運用

`develop` で開発し、`main` へは squash merge します。
