# Mortgage-loan

住宅ローンに関する Web アプリケーション。一般個人(購入検討者)向けに、返済額の試算や金利の比較ができます。

## 機能

| 機能 | 画面 | 概要 |
|---|---|---|
| 返済シミュレーター | `/simulation` | 元利均等/元金均等、ボーナス併用、返済表・グラフ |
| 金融機関・商品比較 | `/products` | 金利タイプ別の絞り込み・並び替え、手数料・金利履歴 |
| 借り換え診断 | `/refinance` | 毎月/総支払額の差、損益分岐点 |
| 借入可能額/審査目安 | `/eligibility` | 返済負担率と審査金利からの借入可能額の目安 |

試算結果はすべて目安であり、実際の返済額・審査結果を保証するものではありません。
商品データは開発用の架空データです。

## 技術スタック

- Backend: Spring Boot 3.5 / Java 21 / Maven / MyBatis / Flyway
- Database: PostgreSQL 16
- Frontend: Next.js (TypeScript, App Router)
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

## テスト

```bash
cd backend && ./mvnw test      # JUnit 5。DB のテストは Testcontainers のため Docker が必要
cd frontend && npm run lint && npm run build
```

## ドキュメント

設計と仕様は [docs/design.md](docs/design.md) を参照してください。

## ブランチ運用

`develop` で開発し、`main` へは squash merge します。
