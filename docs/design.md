# 住宅ローンWebアプリ 設計書(ドラフト)

## 1. 目的・対象
- 対象: 一般個人(購入検討者)。会員機能なしの公開サイトから開始。
- 機能カテゴリと優先度

| カテゴリ | 優先度 | 概要 |
|---|---|---|
| 返済シミュレーター | P0 | 元利均等/元金均等、ボーナス併用、返済表 |
| 金融機関・商品比較 | P0 | 金利タイプ・手数料・団信で絞り込み/並び替え |
| 借り換え診断 | P1 | 残債・現行金利・諸費用から削減額と損益分岐点 |
| 借入可能額/審査目安 | P1 | 年収・既存借入から返済負担率で目安額 |

## 2. 技術決定
| 項目 | 決定 |
|---|---|
| Backend | Spring Boot 3.x / Java 21 LTS / Maven |
| 永続化 | MyBatis + PostgreSQL 16 |
| Migration | Flyway |
| Frontend | Next.js (TypeScript, App Router) |
| 計算 | サーバー(Java)一本化。ブラウザ側の二重実装はしない |
| データ | 外部連携APIは使わない。CSV/SQL seed と手動更新 |
| ローカル | Docker Compose |

## 3. ディレクトリ構成
```
Mortgage-loan/
├─ docker-compose.yml
├─ .env.example
├─ backend/   (Maven, Dockerfile)
│   └─ src/main/java/com/example/mortgage/{simulation,refinance,eligibility,product,common}
│   └─ src/main/resources/{mapper,db/migration}
├─ frontend/  (Next.js, Dockerfile)
└─ docs/
```

## 4. Docker Compose
サービス: frontend(3000), backend(8080), db(postgres:16), adminer(任意)。
backend は Actuator health で healthcheck、frontend/db に対し depends_on。

## 5. バックエンド方針
- 依存方向: controller → service → domain / mapper。計算ロジック(domain)は Spring/DB 非依存の純Java。
- 金額は BigDecimal。丸めは一元管理(仮置き: 円未満切捨て。要確定)。
- MyBatis: SQL は XML Mapper。動的条件は `<where>/<if>`。並び替えカラムは `${}` を使わず enum ホワイトリスト。
  `map-underscore-to-camel-case=true`。
- API: `/api/v1`、OpenAPI(springdoc)→ openapi-typescript で型生成。エラーは RFC 7807。入力値はログ出力しない。
- テスト: JUnit5 + Testcontainers(Postgres)。計算ロジックは外部の返済表と突合。

### API(案)
- POST /simulations/repayment
- POST /simulations/refinance
- POST /simulations/eligibility
- GET /products?rateType=&sort=&page=
- GET /products/{id}

## 6. データ運用
- `rates` に `effective_from` と `source_url` を持たせ履歴保持。
- 更新は Flyway repeatable migration または CSV取込CLI。管理画面はP2以降。
- 画面に金利更新日と出典を必ず表示。30日超は警告表示を検討。
- 開発中の seed は架空データ。実在金融機関の金利を載せる場合は掲載可否を確認。

## 7. フェーズ
1. 雛形(Compose / Maven / Next.js / Flyway / healthcheck)
2. 返済シミュレーター
3. 商品比較
4. 借り換え診断
5. 借入可能額/審査目安

## 7.1 返済シミュレーター仕様(確定)
- 丸め: 円未満四捨五入(HALF_UP)。`common` の1か所で定義し、変更は1行。最終回で残債を精算して端数を吸収。
- ボーナス払い: 対応。`bonusAmount`(ボーナス返済分の借入額)を年2回(6, 12, 18…ヶ月目)で返済。
  通常分(月利=年利/12, 期間=年×12)とボーナス分(半年利=年利/2, 回数=年×2)を独立したローンとして計算し、ボーナス月は合算。
- 方式: 元利均等 / 元金均等。金利0%は元本÷回数。
- 入力範囲: 借入額 1〜10億円、年利 0〜20%、期間 1〜50年。

## 7.2 商品比較仕様(実装済み)
- rateType: VARIABLE / FIXED_FULL / FIXED_PERIOD(固定期間 3/5/10年)。sort: RATE_ASC(既定)/RATE_DESC/NAME_ASC(enumホワイトリスト、`${}`不使用)。
- 現在金利 = 各商品で `effective_from <= 今日` の最新行。詳細は手数料と金利履歴(新しい順)を返す。
- seed(V3)は架空データのみ。画面にサンプルデータ注記、30日超の未更新警告、免責を常時表示。

## 7.3 借り換え診断仕様(実装済み)
- `POST /api/v1/simulations/refinance`。現在ローン(残債・現行金利・残り期間)と借り換え後(新金利・新期間)を `RepaymentCalculator` で計算し比較。ボーナス併用なし。
- 諸費用は借り換え後ローンに含めず、手元から先払いと仮定。
- 累計損得 net(m) = 現行の累計返済 − 借り換え後の累計返済 − 諸費用。損益分岐月 = net が初めて0以上になる月(なければ null)。
- 返済期間が異なる場合、総額は異なる期間の比較になるため、画面に注意書きを出す。

## 7.4 借入可能額/審査目安仕様(実装済み・仮置き値)
- `POST /api/v1/simulations/eligibility`。返済負担率の上限: 年収400万円未満30% / 以上35%。審査金利は既定3.5%。
- 年間返済可能額 = 年収×上限 − 他の借入の年間返済額。月額 = 年額/12。借入可能額 = 元利均等の逆算(1万円単位で切り捨て)。審査金利と実際の金利の2通りを返す。
- 上限率・審査金利は目安の仮置き値。定数は `EligibilityCalculator` の1か所に集約。実際の審査基準は金融機関ごとに異なる旨を画面に常時表示。

## 8. リスク・未決事項
- ボーナス払いの計算方式は上記の簡易モデル。金融機関の実際の方式とは差が出る場合がある(「目安」表記で対応)。
- 法令・表示(「最安」等の根拠、「目安」明記、更新日表示)は公開前に専門家確認。
- 収益モデル未定。送客を入れる場合は個人情報保護法対応が必要でP2以降。
- 本番は同一オリジンのリバースプロキシでCORSを回避する。
- 計算APIはデバウンス+将来的にレート制限。
