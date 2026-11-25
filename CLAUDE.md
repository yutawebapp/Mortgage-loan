# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

コマンド、作業範囲、利用モデルの制限、Backend/Frontend の規約、Git 運用は AGENTS.md に集約している(重複させない)。

@AGENTS.md

## 追加のコマンド

- Frontend の単体テストは `src/lib/` の純粋ロジックのみ。画面と実 API の契約テストは Playwright(`npm run e2e`、手順は README の「テスト」)。テスト専用の Compose プロジェクト `mortgage-e2e` を使い、ポート 3000 / 5432 / 8080 を占有する。
- Playwright のブラウザや一時ファイルはリポジトリ内の `tmp/` に置く(`PLAYWRIGHT_BROWSERS_PATH`、`TMPDIR`)。
- `.claude/agents/` に `explorer` / `reviewer` / `fixer` / `frontend-fixer` / `test-runner` の定義がある。実装を委任するときは backend は `fixer`、frontend は `frontend-fixer`。

## アーキテクチャ(複数ファイルを読まないと分からない部分)

### Backend(`com.example.mortgage`)

機能ごとに1パッケージ(`simulation` / `refinance` / `eligibility` / `budget` / `prepayment` / `ratescenario` / `taxdeduction` / `totalcost` / `ratetype` / `rentvsbuy` / `lifeplan` / `product`)。各パッケージは `Controller` → `Service` → `domain/`(Spring・DB 非依存の純Java計算)の3層で、Request/Response は同パッケージのレコード。

- 償却計算の中核は `simulation/domain/RepaymentCalculator`。他の機能(借り換え、繰上げ、金利上昇、控除、ライフプラン等)はこれを呼び出す。ペアローンは `PairRepaymentCalculator`。
- DB を使うのは `product`、`taxdeduction`、`lifeplan`(教育費)のみ。それ以外の機能は DB に触れない。
- `taxdeduction` は制度ルールと税パラメータを DB から読み(`TaxParameterLoader`、`TaxDeductionMapper`)、`TaxDeductionCalculator` に渡す。数値をコードに持たない。
- 横断的なものは `common/`(`RoundingPolicy`、`GlobalExceptionHandler`、`BorrowerMode`)。

### Frontend(`frontend/src`)

ツール1つにつき次の4点が対応する。1つを変えたら残りも確認する。

1. `app/<tool>/page.tsx`(サーバーコンポーネント。metadata / JSON-LD)
2. `components/simulation/<Tool>.tsx`(クライアントのUI)+ `<Tool>Chart.tsx`
3. `lib/<tool>.ts`(入力→APIリクエストの変換、表示用ロジック。Vitest の対象)
4. `lib/api/<tool>.ts`(バックエンドのレコードに手で合わせた型)

ツール間の共通条件(借入額・金利・期間・年収など)は `lib/sharedConditions.ts` / `useSharedConditions` / `useUrlInitialValues` と URL クエリで受け渡す。初期値は `lib/defaults.ts`、ナビ・パンくず・SEO は `lib/nav.ts` / `lib/seo.ts`。

## 補足

- 仕様の根拠は `docs/design.md`(節番号 7.x がツールごとの仕様、7.12 が初期値)。計算仕様を変えたらここも更新する。
- AGENTS.md の「V1〜V7 は編集しない」は古い。V8(`V8__tax_deduction_year_range_exclusion.sql`)もコミット済みなので、V1〜V8 は編集せず新しい `V9` 以降を追加する。
