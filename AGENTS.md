# Mortgage-loan

住宅ローンWebアプリ(一般個人向け)。`backend/`(Spring Boot 3.5 / Java 21 / Maven / MyBatis / Flyway / PostgreSQL 16)と `frontend/`(Next.js 16 App Router)の2構成。設計の決定事項と仕様は `docs/design.md`。

## 作業範囲
- `~/Documents/GitHub/Mortgage-loan` 以外のディレクトリ(`~/Documents/GitHub/` 配下の他プロジェクト、ホーム直下など)は参照・読み取り・編集しない。ファイルの探索・検索も、このリポジトリ内に限定する。
- テスト用の一時ファイルなどもリポジトリの外に書かない(必要ならリポジトリ内の `tmp/`(gitignore 済み)を使う)。

## 利用モデル
- 利用してよいモデルは Anthropic / OpenAI / Google 製のみ。それ以外のモデル(`opencode/big-pickle`、GLM 等の無料・他社モデルを含む)は、メインでもサブエージェントでも使わない。
- OpenRouter 等の経由サービスを使う場合も、モデル提供元が上記3社のものに限る。
- `model` を指定するときは提供元を確認し、上記以外なら選ばない。

## Commands
- 起動: `cp .env.example .env && docker compose up --build`(`.env` が無いと `DB_PASSWORD` 未設定で compose が失敗する)。リポジトリルートで実行。
- DB を初期化して migration をやり直す: `docker compose down -v`(架空データのみなので消えて問題ない)。
- Backend(`backend/`): `./mvnw test` / 単体: `./mvnw test -Dtest=RepaymentCalculatorTest`。DB を使うテスト(`ProductMapperTest`、`TaxDeduction*Test` など)は Testcontainers で Docker が必要。`ProductMapperTest` は `disabledWithoutDocker=true` なので Docker が無いとスキップされ、緑でも未検証。`TaxDeduction*Test` は Docker が無いと失敗する。
- Frontend(`frontend/`): `npm test && npm run lint && npm run build`。単体テストは Vitest(`src/**/*.test.ts`、`globals` 無効なので `describe/it/expect` は `vitest` から import)。単体実行: `npx vitest run src/lib/simulation.test.ts`。テスト対象は `src/lib/` の純粋ロジックのみ(コンポーネントテストは未導入)。
- CI は `.github/workflows/ci.yml`(GitHub Actions。main/develop への push と PR で backend の `./mvnw test` と frontend の test / lint / build を実行)。ローカルでの実行確認も省略しない。opencode.json は無い。

## Next.js 16 に注意
- 学習データと異なる破壊的変更あり。Next 固有のコードを書く前に `frontend/node_modules/next/dist/docs/` を読む(`frontend/AGENTS.md` も同旨で、`next dev` が再生成するため差分に出ることがある)。
- `API_BASE_URL` と `NEXT_PUBLIC_SITE_URL` は **ビルド時に固定**される(rewrites・静的ページのメタデータ)。コンテナ実行時の環境変数だけでは反映されない。compose の `build.args` と `frontend/Dockerfile` の `ARG` で渡す。
- ブラウザの `/api/*` は `next.config.ts` の rewrites でバックエンドへ中継。サーバーコンポーネントは `API_BASE_URL` を直接 fetch する。
- `gen:api` はバックエンド起動中のみ可。現状 API 型は `frontend/src/lib/api/*.ts` に手書き(バックエンドのレコードと手動で同期する)。

## Backend の規約
- 計算ロジックは Spring/DB 非依存の純Java(`*.domain` パッケージ)。借り換え・繰上げ・金利上昇・住宅ローン控除などは `RepaymentCalculator`(`calculate` / `singleLoanSchedule`)を再利用する。償却計算を二重実装しない。
- 金額は `BigDecimal`。丸めは `common/RoundingPolicy` の1か所(円未満四捨五入 HALF_UP)。借入可能額のみ意図的に切り捨て(`EligibilityCalculator` の定数に集約)。
- 計算APIは `/api/v1/simulations/{repayment,refinance,eligibility,budget,prepayment,rate-scenarios,tax-deduction,total-cost,rate-types,rent-vs-buy}`、商品は `/api/v1/products`(一覧は README の表)。入力検証は Bean Validation、エラーは `GlobalExceptionHandler` で RFC 7807(ProblemDetail)。リクエストの入力値はログに出さない。
- MyBatis の SQL は `src/main/resources/mapper/*.xml`。並び替えは enum ホワイトリスト + `<choose>`。ユーザー入力を `${}` に使わない。XML 内の `<=` は `&lt;=` にエスケープ。
- Flyway: コミット済みの `V1`〜`V5` は編集せず、新しい `V<n>` を追加する(未コミットの migration は直してよい)。
- 計算仕様(ボーナス払いの簡易モデル、返済負担率 30%/35%・審査金利 3.5%・諸費用10%は仮置き値)を変えたら `docs/design.md` の該当節も更新し、Python 等で独立に出した期待値でテストを書く(テスト対象コードで期待値を作らない)。
- 住宅ローン控除(`taxdeduction`)の制度ルール・税パラメータは DB(Flyway V4/V5)に出典 URL・確認日つきで持ち、コードに数値を埋め込まない。税・制度の数値は必ず公式ページ(国税庁・国交省・総務省・財務省)の原文で確認してから登録する。調査用エージェントの報告は誤りが混じるため、そのまま使わない(実際に基礎控除額・復興特別所得税の期間などの誤りがあった)。制度は令和8・9年分が続く前提で2026〜2030年に適用しており、改正時は新しい migration で行を追加する。調整控除2,500円・社会保険料率15%は公式値ではない仮置き。

## Frontend の規約
- 日本語UI。金融系のため「最安/おすすめ/必ず/確実」等の断定表現は使わない。試算は「目安」で保証しない旨の免責を維持する。
- 商品データは**架空のサンプル**。`src/lib/products.ts` の `SAMPLE_DATA_NOINDEX = true` の間、`/products` 系は noindex かつ sitemap 除外。実データ化するときに false にする。
- パンくずは `components/layout/Breadcrumb` が表示と JSON-LD を同じ配列から出す。ページ追加時は `lib/nav.ts`・`lib/seo.ts` も更新。
- 配色は `globals.css` 冒頭の CSS 変数に集約。
- ツール(ページ)を追加するときは `lib/nav.ts`(ヘッダー・フッター・ホームのカード)、`app/sitemap.ts`、ページの metadata / JSON-LD、`src/lib/api/*.ts` の手書き型、Vitest のテストをそろえる。

## Git
- 作業ブランチは `develop`。`main` へは squash merge する運用。push はユーザーの明示指示があるまでしない。
- コミットはユーザーが差分を確認してから(依頼されるまでコミット・ステージしない)。コミットは機能単位(バックエンド・フロント・テストをまとめて1コミット)。同じファイルに複数機能の変更が混ざったときは `git apply --cached` で分ける。
- 委任したエージェントの報告は、成果物と最後のテスト(`./mvnw test`、`npm test`、`npm run lint`、`npm run build`)で自分で確認する。
