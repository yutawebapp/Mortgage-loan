# Mortgage-loan

住宅ローンWebアプリ(一般個人向け)。`backend/`(Spring Boot 3.5 / Java 21 / Maven / MyBatis / Flyway / PostgreSQL 16)と `frontend/`(Next.js 16 App Router)の2構成。設計の決定事項と仕様は `docs/design.md`。

## 作業範囲
- `~/Documents/GitHub/Mortgage-loan` 以外のディレクトリ(`~/Documents/GitHub/` 配下の他プロジェクト、ホーム直下など)は参照・読み取り・編集しない。ファイルの探索・検索も、このリポジトリ内に限定する。
- テスト用の一時ファイルなどもリポジトリの外に書かない(必要ならリポジトリ内の `tmp/`(gitignore 済み)を使う)。

## Commands
- 起動: `cp .env.example .env && docker compose up --build`(`.env` が無いと `DB_PASSWORD` 未設定で compose が失敗する)。リポジトリルートで実行。
- DB を初期化して migration をやり直す: `docker compose down -v`(架空データのみなので消えて問題ない)。
- Backend(`backend/`): `./mvnw test` / 単体: `./mvnw test -Dtest=RepaymentCalculatorTest`。`ProductMapperTest` は Testcontainers で Docker が必要(`disabledWithoutDocker=true` のため無ければスキップされ、緑でも未検証)。
- Frontend(`frontend/`): `npm run lint && npm run build`。単体テストフレームワークは未導入。
- CI・opencode.json は無い。変更後は上記の test / lint / build を自分で実行して確認する。

## Next.js 16 に注意
- 学習データと異なる破壊的変更あり。Next 固有のコードを書く前に `frontend/node_modules/next/dist/docs/` を読む(`frontend/AGENTS.md` も同旨で、`next dev` が再生成するため差分に出ることがある)。
- `API_BASE_URL` と `NEXT_PUBLIC_SITE_URL` は **ビルド時に固定**される(rewrites・静的ページのメタデータ)。コンテナ実行時の環境変数だけでは反映されない。compose の `build.args` と `frontend/Dockerfile` の `ARG` で渡す。
- ブラウザの `/api/*` は `next.config.ts` の rewrites でバックエンドへ中継。サーバーコンポーネントは `API_BASE_URL` を直接 fetch する。
- `gen:api` はバックエンド起動中のみ可。現状 API 型は `frontend/src/lib/api/*.ts` に手書き(バックエンドのレコードと手動で同期する)。

## Backend の規約
- 計算ロジックは Spring/DB 非依存の純Java(`simulation.domain`、`refinance.domain`、`eligibility.domain`)。借り換え・借入可能額は `RepaymentCalculator` を再利用する。二重実装しない。
- 金額は `BigDecimal`。丸めは `common/RoundingPolicy` の1か所(円未満四捨五入 HALF_UP)。借入可能額のみ意図的に切り捨て(`EligibilityCalculator` の定数に集約)。
- 計算APIは `/api/v1/simulations/{repayment,refinance,eligibility}`、商品は `/api/v1/products`。入力検証は Bean Validation、エラーは `GlobalExceptionHandler` で RFC 7807(ProblemDetail)。リクエストの入力値はログに出さない。
- MyBatis の SQL は `src/main/resources/mapper/*.xml`。並び替えは enum ホワイトリスト + `<choose>`。ユーザー入力を `${}` に使わない。XML 内の `<=` は `&lt;=` にエスケープ。
- Flyway: 既存 `V1`〜`V3` は編集せず、新しい `V<n>` を追加する。
- 計算仕様(ボーナス払いの簡易モデル、返済負担率 30%/35%・審査金利 3.5% は仮置き値)を変えたら `docs/design.md` の該当節も更新し、Python 等で独立に出した期待値でテストを書く(テスト対象コードで期待値を作らない)。

## Frontend の規約
- 日本語UI。金融系のため「最安/おすすめ/必ず/確実」等の断定表現は使わない。試算は「目安」で保証しない旨の免責を維持する。
- 商品データは**架空のサンプル**。`src/lib/products.ts` の `SAMPLE_DATA_NOINDEX = true` の間、`/products` 系は noindex かつ sitemap 除外。実データ化するときに false にする。
- パンくずは `components/layout/Breadcrumb` が表示と JSON-LD を同じ配列から出す。ページ追加時は `lib/nav.ts`・`lib/seo.ts` も更新。
- 配色は `globals.css` 冒頭の CSS 変数に集約。

## Git
- 作業ブランチは `develop`。`main` へは squash merge する運用。push はユーザーの明示指示があるまでしない。
- コミットはユーザーが差分を確認してから(依頼されるまでコミット・ステージしない)。
