# AI 伴侶聊天與照片生成網頁 App — 完整工作計劃

## TL;DR

> **Quick Summary**: 從零開始建立一個 AI 伴侶聊天 + 照片生成全端網頁 App，用戶可自訂 AI 角色、與其聊天（NVIDIA MiniMax M2.7），並請求生成具備視覺一致性的自拍照（Agnes-Image-2.1-Flash）。
>
> **Deliverables**:
> - Next.js 14+ (App Router) 全端專案，部署於 Vercel
> - Supabase PostgreSQL 資料庫 + Storage 儲存桶 + Google OAuth 登入
> - 聊天 UI（訊息列表、輸入框、角色選擇）
> - 角色個人資料與寫真畫廊
> - `/api/chat-with-image` 後端路由（MiniMax 對話 + Agnes 生圖 + 圖片轉存）
> - 視覺一致性：`visual_template` + `[DRAW_PROMPT: ...]` 模式
> - TDD 全覆蓋測試（vitest）
>
> **Estimated Effort**: XL（100+ tasks across 5 waves）
> **Parallel Execution**: YES — 5 waves（Wave 1: 6 tasks, Wave 2: 7 tasks, Wave 3: 6 tasks, Wave 4: 5 tasks, Wave FINAL: 4 tasks）
> **Critical Path**: Task 1 → Task 6 → Task 11 → Task 16 → Task 21 → Task 24 → F1-F4

---

## Context

### Original Request
從零開始建立「AI 伴侶聊天與照片生成網頁 App」，包含完整前端 UI、後端 API、資料庫、身份驗證、第三方 AI 模型整合以及部署。

### Interview Summary
**Key Discussions**:
- **Tech Stack**: Next.js 14+ App Router, Tailwind CSS + Shadcn UI, Supabase (PostgreSQL + Auth + Storage), NVIDIA MiniMax M2.7, Agnes-Image-2.1-Flash, Vercel deploy
- **Test Strategy**: TDD（測試驅動開發）— 先用 vitest 寫測試再實作，每個 TODO 含完整 RED→GREEN→REFACTOR 流程
- **Priority**: 核心體驗優先 — 聊天 + 生圖流程最重要，UI 華麗度可簡化
- **Scope**: 全部涵蓋，無明確排除項目

**Research Findings**:
- 專案目前完全綠地（greenfield）：無程式碼、無套件、無設定檔
- 計劃書提供完整 SQL DDL、OAuth 設定步驟、API 路由代碼範例、Storage RLS 規則
- AGENTS.md 已建立，記錄了專案狀態與架構約束

### Metis Review
> Metis 暫時無法使用。以下為自主缺口分析：
> - **已處理**: 測試策略（TDD）、優先級（核心體驗優先）、範圍（全涵蓋）
> - **無需處理**: 技術決策已由計劃書完整定義，無歧義

---

## Work Objectives

### Core Objective
從零建立一個具備 AI 伴侶角色客製、對話聊天、視覺一致性寫真生成與雲端同步的全端網頁應用程式。

### Concrete Deliverables
- Next.js 14+ 專案（`app/`、`components/`、`lib/`、`types/` 目錄結構）
- Supabase 資料庫 migration SQL（characters, chats, images tables + RLS policies）
- Google OAuth 登入流程（登入頁面 + callback handler + middleware）
- 聊天頁面（角色選擇 → 對話 → 顯示生成照片）
- 角色管理（創建、編輯、瀏覽角色卡片）
- 寫真畫廊（瀏覽已生成的照片）
- `/api/chat-with-image` — MiniMax 對話 + Agnes 生圖 + DRAW_PROMPT 解析
- 圖片轉存服務（Agnes 臨時 URL → 下載 → Supabase Storage → 永久 URL）
- 完整測試套件（vitest: components, API routes, services）
- Vercel 部署設定

### Definition of Done
- [ ] `npm run dev` 啟動後，可完成完整的「登入 → 創建角色 → 聊天 → 要求拍照 → 看到照片」流程
- [ ] `npm run test` 全部測試通過（vitest）
- [ ] `npm run build` 無錯誤
- [ ] Vercel 部署成功，`.env.local` 未包含在 git
- [ ] RLS 策略有效：用戶 A 無法讀取用戶 B 的資料

### Must Have
- Google OAuth 登入（Supabase Auth）
- 角色 CRUD（建立、讀取、更新、刪除）
- 聊天對話（NVIDIA MiniMax M2.7）
- DRAW_PROMPT 生圖觸發與 Agnes AI 整合
- 圖片轉存至 Supabase Storage（永久保存）
- RLS 資料安全（多用戶隔離）
- 所有 API 路由在服務端執行，金鑰不暴露
- TDD：每個模組皆有對應測試

### Must NOT Have (Guardrails)
- API 金鑰不得出現在前端程式碼或 client component 中
- 不得使用未經 RLS 保護的 Supabase 查詢
- 不得依賴 Agnes AI 臨時 URL 作為永久儲存（必須轉存）
- 不得跳過測試直接實作（TDD 流程強制）
- 不得儲存用戶密碼（僅 Google OAuth）
- 不得在生產環境使用 `console.log`、`as any`、`@ts-ignore`

### Spec Framework Integration
> 未偵測到 SDD 框架。

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO（需建立）
- **Automated tests**: TDD（vitest）
- **Framework**: vitest + @testing-library/react + @testing-library/jest-dom
- **TDD**: 每個 task 依 RED（先寫測試）→ GREEN（最小實作）→ REFACTOR 流程

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Playwright — Navigate, interact, assert DOM, screenshot
- **API/Backend**: Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Bash (bun/node) — Import, call functions, compare output
- **CLI**: interactive_bash (tmux) — Run commands, validate output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — all parallel):
├── 1: Next.js 專案初始化 + 依賴安裝 [quick]
├── 2: 專案目錄結構 + 共用型別 + ESLint 設定 [quick]
├── 3: Tailwind CSS + Shadcn UI 設定與主題 [quick]
├── 4: vitest 測試基礎建設 [quick]
├── 5: Supabase 客戶端 SDK 基礎建設 [quick]
└── 6: git 初始化 + .gitignore + .env.local template [quick]

Wave 2 (Database + Auth + Base Components — parallel after Wave 1):
├── 7: DB schema migration SQL + RLS policies + 型別定義 [quick]
├── 8: Supabase Admin 初始化腳本（create bucket, apply RLS） [quick]
├── 9: Google OAuth 登入頁面 + callback handler + middleware [unspecified-high]
├── 10: Auth 相關 test（login flow, auth guard, session） [quick]
├── 11: 角色 CRUD API routes + service layer [unspecified-high]
├── 12: 聊天 CRUD API routes + service layer [unspecified-high]
└── 13: 基座 UI 元件（layout, navbar, loading skeleton） [visual-engineering]

Wave 3 (Core Logic — parallel after Wave 2):
├── 14: NVIDIA MiniMax M2.7 chat API route（TDD） [deep]
├── 15: Agnes AI 生圖整合 + DRAW_PROMPT parser（TDD） [deep]
├── 16: 圖片轉存服務（download → Storage → DB）（TDD） [deep]
├── 17: 角色選擇頁面 + 角色卡片元件 [visual-engineering]
├── 18: 聊天頁面（訊息列表 + 輸入框 + 角色顯示） [visual-engineering]
└── 19: 寫真畫廊頁面 [visual-engineering]

Wave 4 (Integration + Polish — after Wave 3):
├── 20: API route 整合：chat → generate → persist → display [deep]
├── 21: 前端 image display + inline 照片顯示 [visual-engineering]
├── 22: 即時同步（Supabase Realtime）for 跨裝置 [unspecified-high]
├── 23: Error handling + empty states + edge cases [unspecified-high]
└── 24: Vercel 部署設定 + environment variables [quick]

Wave FINAL (Parallel Review — after ALL tasks):
├── F1: Plan Compliance Audit (oracle/unspecified-high)
├── F2: Code Quality Review (unspecified-high)
├── F3: Real Manual QA (unspecified-high + playwright)
└── F4: Scope Fidelity Check (deep)
→ Present results → Get explicit user okay

Critical Path: 1 → 5 → 7 → 11 → 14 → 16 → 20 → 24 → F1-F4 → user okay
```

### Dependency Matrix
| Task | Depends On | Blocks |
|------|-----------|--------|
| 1-6 | — | 7-13 |
| 7-8 | 1, 5 | 11, 12 |
| 9-10 | 1, 5 | 20 |
| 11-12 | 1, 5, 7-8 | 14-16 |
| 13 | 1, 3 | 17-19 |
| 14 | 1, 5, 11 | 20 |
| 15-16 | 1, 5, 12 | 20 |
| 17-19 | 1, 13 | 20 |
| 20 | 14, 15, 16, 17, 18 | 22, 23 |
| 21 | 18, 19 | 22 |
| 22 | 20, 21 | 23 |
| 23 | 20, 22 | 24 |
| 24 | 23 | F1-F4 |
| F1-F4 | 24 | user okay |

---

## TODOs

- [ ] 1. Next.js 14+ 專案初始化 + 依賴安裝

  **What to do**:
  - 執行 `npx create-next-app@latest .` 使用 TypeScript + App Router + ESLint + Tailwind CSS + src/ 目錄
  - 安裝核心依賴：`@supabase/supabase-js`, `@supabase/ssr`, `@supabase/auth-helpers-nextjs`
  - 安裝 UI 依賴：`next-themes`（黑暗模式）、`lucide-react`（圖示）、`class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`
  - 安裝測試依賴：`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`
  - 確認 `npm run dev` 啟動成功（localhost:3000）
  - 確認 `npx tsc --noEmit` 無錯誤

  **Must NOT do**:
  - 不要安裝已過時的套件（檢查最新版本）
  - 不要在 client component 中引用任何 API key

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準專案初始化流程，無特殊複雜度
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: 無需特殊 skill

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1, with Tasks 2-6)
  - **Parallel Group**: Wave 1 (Tasks 2, 3, 4, 5, 6)
  - **Blocks**: Tasks 7-24
  - **Blocked By**: None

  **References**:
  - AGENTS.md — 專案狀態與技術棧確認
  - Plan doc: `AI 伴侶聊天與照片生成網頁 App 建立計劃書.md` — 完整技術規格

  **Acceptance Criteria**:
  - [ ] `package.json` 存在且包含所有上述依賴
  - [ ] `next.config.js`, `tsconfig.json`, `tailwind.config.ts` 已產生
  - [ ] `npm run dev` → localhost:3000 顯示 Next.js 預設頁面
  - [ ] `npx tsc --noEmit` → 無錯誤

  **QA Scenarios**:
  ```
  Scenario: Verify project boots and TypeScript compiles
    Tool: Bash
    Preconditions: Project directory exists at C:\GitHub\aigf-online
    Steps:
      1. npm install (if needed)
      2. npm run build (next build)
    Expected Result: Build succeeds, no TypeScript errors
    Evidence: .omo/evidence/task-1-project-build.txt

  Scenario: Verify dev server starts
    Tool: interactive_bash (tmux)
    Preconditions: npm install completed
    Steps:
      1. npm run dev in tmux pane 1
      2. curl http://localhost:3000
    Expected Result: HTTP 200, HTML response from Next.js
    Evidence: .omo/evidence/task-1-dev-server.txt
  ```

  **Commit**: NO (group with Task 6 initial commit)

- [ ] 2. 專案目錄結構 + 共用型別 + ESLint 設定

  **What to do**:
  - 建立目錄結構：
    ```
    src/
      app/           (Next.js App Router pages + API routes)
        api/
          chat-with-image/route.ts
          characters/[id]/route.ts
          characters/route.ts
        auth/callback/route.ts
        login/page.tsx
        chat/[characterId]/page.tsx
        gallery/page.tsx
        layout.tsx
        page.tsx (redirect to /login or /chat)
      components/
        ui/          (Shadcn UI components)
        chat/
        character/
        gallery/
        layout/
      lib/
        supabase.ts
        supabase-server.ts
        supabase-client.ts
        nvidia.ts
        agnes.ts
        storage.ts
        types.ts
        utils.ts
      types/ (shared types)
        database.ts
      __tests__/ (mirrors src/ structure)
    ```
  - 建立共用型別檔案（`src/types/database.ts`）：
    - `Character`, `Chat`, `Image`, `UserProfile` interfaces
    - 對應 Supabase DB schema
  - 設定 ESLint rules（Next.js 標準 + 自訂）
  - 設定 `.prettierrc`

  **Must NOT do**:
  - 不要建立不屬於上述結構的目錄
  - 不要在型別中加入實際實作邏輯

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 目錄結構與型別定義，標準化工作
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7-24
  - **Blocked By**: Task 1

  **References**:
  - AGENTS.md: database schema
  - Plan doc 4.1: SQL DDL → 映射為 TypeScript types

  **Acceptance Criteria**:
  - [ ] All directories in the structure exist
  - [ ] `src/types/database.ts` contains Character, Chat, Image interfaces
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Verify directory structure
    Tool: Bash
    Preconditions: None
    Steps:
      1. Get-ChildItem -Recurse -Directory src/ | Select FullName
    Expected Result: All planned directories present
    Evidence: .omo/evidence/task-2-dir-structure.txt

  Scenario: Verify types compile
    Tool: Bash
    Preconditions: src/types/database.ts exists
    Steps:
      1. npx tsc --noEmit src/types/database.ts
    Expected Result: No TypeScript errors
    Evidence: .omo/evidence/task-2-types-ok.txt
  ```

  **Commit**: NO (group with Task 6)

- [ ] 3. Tailwind CSS + Shadcn UI 設定與主題

  **What to do**:
  - 執行 `npx shadcn-ui@latest init` 初始化 Shadcn UI
  - 選擇：New York style, Neutral color scheme, CSS variables mode
  - 設定黑暗模式支援（`next-themes` + `ThemeProvider`）
  - 在 `tailwind.config.ts` 中設定自訂顏色（參考 plan doc 的深色主題風格：zinc-950 背景）
  - 安裝常用 Shadcn 元件：Button, Card, Input, Dialog, Select, Avatar, ScrollArea, Separator, Skeleton, Tabs, Sheet, DropdownMenu
  - 建立 `components/ui/` 中的元件的 barrel export
  - 設定 `globals.css`（深色主題 base styles）

  **Must NOT do**:
  - 不要修改 Shadcn 元件的原始碼（不客製化元件，僅使用 props）
  - 不要安裝不需要的元件

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準化 UI framework 初始化
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 13, 17-19, 21
  - **Blocked By**: Task 1

  **References**:
  - Plan doc LoginPage: `bg-zinc-950`, `bg-zinc-900`, `text-zinc-400`, `rounded-2xl`, `border-zinc-800` 等 Tailwind classes
  - Official: `https://ui.shadcn.com/docs`

  **Acceptance Criteria**:
  - [ ] `components.json` exists
  - [ ] Required Shadcn components in `components/ui/`
  - [ ] Dark mode toggle works (light ↔ dark switch)
  - [ ] `npx tsc --noEmit` passes

  **QA Scenarios**:
  ```
  Scenario: Verify Shadcn components importable
    Tool: Bash
    Preconditions: Shadcn init completed
    Steps:
      1. Create temporary test file importing Button from components/ui/button
      2. npx tsc --noEmit temp-test.tsx
    Expected Result: No import errors
    Evidence: .omo/evidence/task-3-shadcn-import.txt

  Scenario: Verify dark mode toggle works
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to localhost:3000
      2. Check html class (should be light or dark based on system)
      3. Toggle theme
    Expected Result: html class changes between light/dark
    Evidence: .omo/evidence/task-3-darkmode.png
  ```

  **Commit**: NO (group with Task 6)

- [ ] 4. vitest 測試基礎建設

  **What to do**:
  - 建立 `vitest.config.ts`（使用 `@vitejs/plugin-react`, jsdom environment, `src/` 作為 root）
  - 在 `package.json` 中加入 `"test": "vitest"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"` scripts
  - 建立 `src/__tests__/setup.ts`（@testing-library/jest-dom imports, 全域 mock）
  - 在 `vitest.config.ts` 中設定測試路徑 alias（`@/` 對應 `src/`）
  - 建立一個範例測試檔 `src/__tests__/example.test.ts` 確認設定正確
  - 確認 `npm run test:run` 通過（範例測試 green）

  **Must NOT do**:
  - 不要安裝多餘的測試工具（僅 vitest + testing-library）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準測試基礎建設設定
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7-24（所有 TDD tasks 依賴測試基礎建設）
  - **Blocked By**: Task 1

  **References**:
  - Official: `https://vitest.dev/guide/`

  **Acceptance Criteria**:
  - [ ] `vitest.config.ts` 存在且配置正確
  - [ ] `npm run test:run` → PASS (1 pass, 0 fail)
  - [ ] `npm run test` → 進入 watch mode
  - [ ] 範例測試 RED→GREEN 流程可執行

  **QA Scenarios**:
  ```
  Scenario: Verify test runner works
    Tool: Bash
    Preconditions: vitest installed
    Steps:
      1. Create example.test.ts with expect(1+1).toBe(2)
      2. npm run test:run
    Expected Result: Tests passing (1 passed)
    Evidence: .omo/evidence/task-4-vitest-works.txt
  ```

  **Commit**: NO (group with Task 6)

- [ ] 5. Supabase 客戶端 SDK 基礎建設

  **What to do**:
  - 建立 `src/lib/supabase.ts`（server client — `createServerClient` from `@supabase/ssr`）
  - 建立 `src/lib/supabase-client.ts`（browser client — `createBrowserClient` from `@supabase/ssr`）
  - 使用 Next.js cookies helpers 處理 session 管理
  - 建立 `src/types/database.ts`（Supabase schema types — `Database` type generated from schema 或手動定義）
  - 確保匯出以下 API：`supabaseAdmin`（service_role for admin ops）, `createClient`（per-request server client）, `createBrowserClient`（client-side)
  - 加入錯誤處理：Session 過期自動刷新、網路錯誤重試

  **Must NOT do**:
  - 不要在 client component 中使用 server client
  - 不要在程式碼中硬編碼 Supabase URL/anon key（從 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 讀取）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準第三方 SDK 初始化模式
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7-24
  - **Blocked By**: Task 1

  **References**:
  - Official: `https://supabase.com/docs/guides/auth/server-side/nextjs`
  - Plan doc 6.2: Supabase 整合範例

  **Acceptance Criteria**:
  - [ ] `src/lib/supabase.ts` 和 `src/lib/supabase-client.ts` 存在
  - [ ] `npx tsc --noEmit` 通過（無未解析依賴）
  - [ ] 建立測試驗證 client 實例化成功（mock env vars）

  **QA Scenarios**:
  ```
  Scenario: Verify Supabase client compiles
    Tool: Bash
    Preconditions: Supabase modules created
    Steps:
      1. Create test file that imports and instantiates createBrowserClient
      2. npx tsc --noEmit
    Expected Result: No TypeScript errors
    Evidence: .omo/evidence/task-5-supabase-ts.txt
  ```

  **Commit**: NO (group with Task 6)

- [ ] 6. git 初始化 + .gitignore + .env.local template

  **What to do**:
  - `git init` 初始化儲存庫
  - 建立 `.gitignore`（包含 `node_modules/`, `.next/`, `.env.local`, `.env`, `*.log`, `.vercel`, `coverage/`, `.omo/evidence/`）
  - 建立 `.env.local.example`（模板檔案，含說明註解）：
    ```
    # Supabase
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

    # NVIDIA NIM
    NVIDIA_API_KEY=your-nvidia-api-key

    # Agnes AI
    AGNES_API_KEY=your-agnes-api-key

    # Next.js
    NODE_ENV=development
    ```
  - 建立 `.env.local`（複製自 `.env.local.example`，填入 placeholder 值）
  - `git add . && git commit -m "chore: initial project scaffold"`

  **Must NOT do**:
  - 絕對不能將 `.env.local` 加入 git
  - 不要在 commit message 中包含任何敏感資訊

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準 git init + 設定檔
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 7-24
  - **Blocked By**: Task 1

  **References**:
  - Standard Next.js .gitignore template
  - AGENTS.md: API keys server-side only constraint

  **Acceptance Criteria**:
  - [ ] `git log` 顯示初始 commit
  - [ ] `.env.local` 不在 git tracking 中（`git status` 不顯示）
  - [ ] `.env.local.example` 包含所有必要的環境變數名稱（不含真實值）

  **QA Scenarios**:
  ```
  Scenario: Verify git repo initialized correctly
    Tool: Bash
    Preconditions: None
    Steps:
      1. git status
      2. Check .env.local is NOT listed
      3. git log --oneline
    Expected Result: Clean working tree, .env.local not tracked, initial commit exists
    Evidence: .omo/evidence/task-6-git-init.txt

  Scenario: Verify project builds from clean state
    Tool: Bash
    Preconditions: npm install completed
    Steps:
      1. npm run build
    Expected Result: Build succeeds
    Evidence: .omo/evidence/task-6-clean-build.txt
  ```

  **Commit**: YES
  - Message: `chore: initial project scaffold with Next.js 14+, Supabase, Shadcn UI, vitest`
  - Files: all Wave 1 files
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

---

- [ ] 7. DB schema migration SQL + RLS policies + 型別定義

  **What to do**:
  - 建立 `supabase/migrations/` 目錄
  - 建立 migration SQL 檔（如 `20240616_initial_schema.sql`）：
    - `characters` table: id (uuid PK), user_id (FK→auth.users), name (varchar), avatar_url (text), personality_prompt (text), visual_template (text), relation_points (int default 0), created_at (timestamptz)
    - `chats` table: id (uuid PK), character_id (FK→characters), user_id (FK→auth.users), messages (jsonb), updated_at (timestamptz)
    - `images` table: id (uuid PK), character_id (FK→characters), user_id (FK→auth.users), prompt (text), storage_url (text), scene_description (text), created_at (timestamptz)
    - Enable RLS on all 3 tables
    - CREATE POLICY for each table: `USING (auth.uid() = user_id)`
    - Storage bucket RLS policy for `companion-photos` bucket
  - 在 `src/types/database.ts` 中建立對應的 TypeScript 型別（Character, Chat, Image 介面）
  - 建立 TDD 測試：驗證 migration SQL 語法解析正確（於 CI 中用 pgTAP 或模擬驗證）

  **Must NOT do**:
  - 不要在 SQL 中硬編碼任何 UUID 或用戶 ID
  - 不要省略任何 table 的 RLS 啟用（三張表都必須）
  - 不要使用 `auth.uid() = user_id` 以外的 RLS 策略（多用戶隔離）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL schema 已由計劃書完整定義，僅需轉錄
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, with Tasks 8-13)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 12, 14-16
  - **Blocked By**: Tasks 1, 5

  **References**:
  - Plan doc §4.1: 完整 SQL DDL + RLS policies
  - Plan doc §4.2: Storage bucket RLS rules

  **Acceptance Criteria**:
  - [ ] `supabase/migrations/20240616_initial_schema.sql` 存在
  - [ ] SQL 包含 3 個 CREATE TABLE + 3 個 ALTER TABLE ENABLE RLS + 3 個 CREATE POLICY
  - [ ] TypeScript 型別與 SQL schema 欄位一一對應
  - [ ] TDD test: 驗證型別符合所有必要欄位

  **QA Scenarios**:
  ```
  Scenario: Verify SQL migration readability
    Tool: Bash
    Preconditions: SQL file exists
    Steps:
      1. Read the SQL file
      2. Count CREATE TABLE statements (expect 3)
      3. Count ENABLE ROW LEVEL SECURITY (expect 3)
      4. Count CREATE POLICY (expect 3)
    Expected Result: All 9 key statements present
    Evidence: .omo/evidence/task-7-sql-verify.txt

  Scenario: Verify TypeScript types match SQL schema
    Tool: Bash
    Preconditions: types/database.ts exists
    Steps:
      1. npx tsc --noEmit
      2. Unit test: new Character() has all required fields
    Expected Result: No TS errors, test passes
    Evidence: .omo/evidence/task-7-types-verify.txt
  ```

  **Commit**: NO (group with Task 8 after Supabase setup)

---

- [ ] 8. Supabase Admin 初始化腳本（create bucket, apply RLS）

  **What to do**:
  - 建立 `scripts/init-supabase.ts` 腳本：
    - 使用 `SUPABASE_SERVICE_ROLE_KEY` 連線
    - 執行 migration SQL（或輸出給用戶貼到 Supabase SQL Editor）
    - 建立 `companion-photos` Storage bucket（public bucket）
    - 設定 Storage bucket RLS policy（INSERT: `bucket_id = 'companion-photos' AND (storage.foldername(name))[1] = auth.uid()::text`, SELECT: `bucket_id = 'companion-photos'`）
    - 如果 bucket 已存在則跳過
  - 建立 README 說明（`supabase/README.md`）逐步引導用戶設定 Supabase 專案

  **Must NOT do**:
  - 不要在任何程式碼中寫入真實的 Supabase 金鑰
  - 不要自動執行 migration（由用戶手動執行 SQL 或透過 Supabase CLI）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 腳本化設定流程，邏輯清晰
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14-16, 20
  - **Blocked By**: Tasks 1, 5, 7

  **References**:
  - Plan doc §4.2: Storage policies

  **Acceptance Criteria**:
  - [ ] `scripts/init-supabase.ts` 存在且可編譯
  - [ ] 腳本包含 bucket 建立與 RLS 設定邏輯

  **QA Scenarios**:
  ```
  Scenario: Verify init script compiles
    Tool: Bash
    Preconditions: Supabase packages installed
    Steps:
      1. npx tsc --noEmit scripts/init-supabase.ts
    Expected Result: No errors
    Evidence: .omo/evidence/task-8-script-compile.txt
  ```

  **Commit**: YES
  - Message: `feat: add database schema, RLS policies, and Supabase init script`
  - Files: all Task 7-8 files
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 9. Google OAuth 登入頁面 + callback handler + middleware

  **What to do**:
  - `src/app/login/page.tsx`：Google 登入按鈕（參考 plan doc §5.2 的範例，使用 `@supabase/ssr` 的 `createBrowserClient`）
  - `src/app/auth/callback/route.ts`：GET route 處理 OAuth 回呼，設定 session cookie，重導向至 `/chat`
  - `src/middleware.ts`：Next.js middleware 檢查 session，未登入重導向至 `/login`，已登入重導向至 `/chat`
  - TDD: 測試 middleware 邏輯（mock session cookie）、callback handler
  - 登入按鈕 loading state（disabled + 文字切換為「正在跳轉...」）

  **Must NOT do**:
  - 不要在 client side 處理金鑰或 token
  - 不要使用 localStorage 儲存 session（Supabase 自動管理 cookies）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: OAuth 流程需要正確配置多個端點
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 20, 22-23
  - **Blocked By**: Tasks 1, 5

  **References**:
  - Plan doc §5.2: Login page implementation with Google SVG icon, dark theme styling
  - Official: `https://supabase.com/docs/guides/auth/server-side/nextjs`

  **Acceptance Criteria**:
  - [ ] `GET /login` 顯示 Google 登入按鈕
  - [ ] 點擊按鈕觸發 Supabase `signInWithOAuth({ provider: 'google' })`
  - [ ] `GET /auth/callback` 正確處理 session 設定
  - [ ] `GET /chat` 未登入時重導向至 `/login`
  - [ ] 所有測試通過

  **QA Scenarios**:
  ```
  Scenario: Login page renders correctly
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:3000
      2. Verify redirect to /login
      3. Verify Google sign-in button exists with text "使用 Google 帳號登入"
      4. Check dark theme styling (bg-zinc-950, button bg-white)
    Expected Result: Login page matches plan doc design
    Evidence: .omo/evidence/task-9-login-page.png

  Scenario: Auth callback compiles and deploys
    Tool: Bash
    Preconditions: None
    Steps:
      1. npx tsc --noEmit
      2. Check route.ts exports correct handler
    Expected Result: No errors
    Evidence: .omo/evidence/task-9-auth-route.txt
  ```

  **Commit**: YES (group with Task 10)
  - Message: `feat: add Google OAuth login, callback handler, middleware, and auth tests`
  - Files: login/page.tsx, auth/callback/route.ts, middleware.ts, __tests__/auth/*
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 10. Auth 相關測試（TDD）

  **What to do**:
  - 先寫 test RED：`src/__tests__/auth/login.test.ts`
    - `LoginPage` renders Google sign-in button
    - `signInWithOAuth` 被呼叫時 loading state 為 true
    - OAuth 錯誤時顯示錯誤訊息
  - 先寫 test RED：`src/__tests__/auth/middleware.test.ts`
    - 無 session cookie → redirect to `/login`
    - 有效的 session → pass through
    - 過期的 session → redirect to `/login`
  - 實作 middleware 與 login page 使測試 GREEN
  - REFACTOR：抽出公用的 auth helpers

  **Must NOT do**:
  - 不要 mock supabase client 過度複雜（僅 mock `signInWithOAuth`）
  - 不要在測試中使用真實的 Supabase 專案

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準 TDD 測試流程
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 20, 22
  - **Blocked By**: Tasks 1, 5

  **References**:
  - Task 9 code will implement the actual components
  - `@testing-library/react` patterns for component tests

  **Acceptance Criteria**:
  - [ ] 3+ auth tests written and passing
  - [ ] `npm run test:run` → 全部通過
  - [ ] RED→GREEN→REFACTOR 流程完整執行

  **QA Scenarios**:
  ```
  Scenario: All auth tests pass
    Tool: Bash
    Preconditions: vitest configured
    Steps:
      1. npm run test:run -- --reporter=verbose
    Expected Result: All auth tests pass
    Evidence: .omo/evidence/task-10-auth-tests.txt
  ```

  **Commit**: YES (group with Task 9)

- [ ] 11. 角色 CRUD API routes + service layer（TDD）

  **What to do**:
  - **RED**: 先寫測試（`src/__tests__/api/characters.test.ts`）
    - `POST /api/characters` with valid data → 201 + 回傳新角色
    - `POST /api/characters` with missing name → 400
    - `GET /api/characters` → 200 + 回傳用戶的角色列表
    - `GET /api/characters/[id]` → 200 + 角色資料
    - `GET /api/characters/[id]` 不存在的 id → 404
    - `PUT /api/characters/[id]` → 200 + 更新後的資料
    - `DELETE /api/characters/[id]` → 200
    - 未認證請求 → 401
  - **GREEN**: 實作 API routes
    - `src/app/api/characters/route.ts`（GET list + POST create）
    - `src/app/api/characters/[id]/route.ts`（GET + PUT + DELETE）
    - `src/lib/services/character-service.ts`（Supabase query logic）
    - 所有請求驗證 user_id = auth.uid()
  - **REFACTOR**: 抽公用的 request validation + error handling

  **Must NOT do**:
  - 不要直接從 API route 呼叫 supabase client（透過 service layer）
  - 不要讓非該角色的用戶讀取或修改角色資料

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: CRUD API + service layer + TDD 流程
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14, 17, 18, 20
  - **Blocked By**: Tasks 1, 5, 7

  **References**:
  - AGENTS.md: characters table schema
  - Plan doc §4.1: DDL + RLS design
  - Task 7: database types

  **Acceptance Criteria**:
  - [ ] 8+ API tests passing
  - [ ] All CRUD operations working
  - [ ] Auth guard: 401 for unauthenticated requests
  - [ ] RLS respect: user B cannot access user A's characters

  **QA Scenarios**:
  ```
  Scenario: Character CRUD API works via curl
    Tool: Bash (curl)
    Preconditions: Dev server running, mock session token available
    Steps:
      1. POST /api/characters with valid JSON body
      2. GET /api/characters to verify list
      3. GET /api/characters/[id] to verify single
      4. PUT /api/characters/[id] to update name
      5. DELETE /api/characters/[id]
    Expected Result: All operations return correct status codes and data
    Evidence: .omo/evidence/task-11-character-crud.txt

  Scenario: Auth guard blocks unauthenticated requests
    Tool: Bash (curl)
    Preconditions: Dev server running, no auth cookie
    Steps:
      1. POST /api/characters (no auth)
    Expected Result: 401 response
    Evidence: .omo/evidence/task-11-auth-guard.txt
  ```

  **Commit**: YES
  - Message: `feat: add character CRUD API with service layer and TDD tests`
  - Files: api/characters/*, lib/services/character-service.ts, __tests__/api/characters.test.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 12. 聊天 CRUD API routes + service layer（TDD）

  **What to do**:
  - **RED**: 先寫測試（`src/__tests__/api/chats.test.ts`）
    - `GET /api/chats?character_id=X` → 200 + 聊天紀錄
    - `POST /api/chats` with character_id + message → 200 + 更新後的 messages
    - `POST /api/chats` without auth → 401
    - `POST /api/chats` with non-existent character_id → 404
    - `PATCH /api/chats` with additional message → 200
  - **GREEN**: 實作 API routes
    - `src/app/api/chats/route.ts`（GET + POST + PATCH）
    - `src/lib/services/chat-service.ts`（Supabase query logic）
    - messages 以 JSONB 格式儲存（`Array<{role: 'user'|'assistant', content: string, image_url?: string, timestamp: string}>`）
  - **REFACTOR**: 共用 validation 邏輯

  **Must NOT do**:
  - 不要一次載入整個 messages 陣列（可能很大，分頁處理）
  - 不要讓非該聊天所屬用戶讀取聊天

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Chat service with JSONB operations is more nuanced
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 14, 15, 18, 20
  - **Blocked By**: Tasks 1, 5, 7

  **References**:
  - AGENTS.md: chats table schema (character_id FK, messages jsonb)
  - Task 7: database types

  **Acceptance Criteria**:
  - [ ] 5+ chat tests passing
  - [ ] GET, POST, PATCH endpoints working
  - [ ] messages 格式正確（含 role, content, timestamp）

  **QA Scenarios**:
  ```
  Scenario: Chat API works via curl
    Tool: Bash (curl)
    Preconditions: Dev server running, auth session, existing character
    Steps:
      1. POST /api/chats with { character_id, message: "Hello" }
      2. GET /api/chats?character_id=X to verify messages stored
      3. PATCH /api/chats to append another message
    Expected Result: Messages correctly stored and retrieved
    Evidence: .omo/evidence/task-12-chat-crud.txt
  ```

  **Commit**: YES
  - Message: `feat: add chat CRUD API with service layer and TDD tests`
  - Files: api/chats/*, lib/services/chat-service.ts, __tests__/api/chats.test.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 13. 基座 UI 元件（layout, navbar, loading skeleton）

  **What to do**:
  - `src/components/layout/AppLayout.tsx`：主要應用程式佈局（navbar + sidebar + main content）
  - `src/components/layout/Navbar.tsx`：頂部導航列（logo + 用戶頭像 + 登出按鈕 + 主題切換）
  - `src/components/layout/Sidebar.tsx`：側邊欄（角色列表快速切換）
  - `src/components/ui/Skeleton.tsx`：載入骨架螢幕（使用 Shadcn Skeleton）
  - `src/app/layout.tsx`：根佈局整合 AppLayout + ThemeProvider + Supabase Listener
  - 使用 Shadcn UI 元件 + 統一的深色主題（參考 plan doc 的色票：`bg-zinc-950`, `bg-zinc-900`, `border-zinc-800`）

  **Must NOT do**:
  - 不要在 layout 中加入實際業務邏輯（僅 UI/UX 結構）
  - 不要實作角色列表的實際資料載入（sidebar 僅為結構，資料由後續 tasks 實現）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 前端 UI 佈局與主題設定
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 17-19, 21
  - **Blocked By**: Tasks 1, 3

  **References**:
  - Plan doc §5.2: Color palette (`bg-zinc-950`, `bg-zinc-900`, `rounded-2xl`, etc.)
  - Shadcn UI documentation for layout patterns

  **Acceptance Criteria**:
  - [ ] AppLayout renders with navbar + sidebar + main area
  - [ ] Theme toggle works (light ↔ dark)
  - [ ] Navbar shows user avatar when logged in
  - [ ] Empty state for sidebar (no characters yet) shows appropriate message
  - [ ] `npx tsc --noEmit` passes
  - [ ] All component tests pass

  **QA Scenarios**:
  ```
  Scenario: Layout renders correctly in browser
    Tool: Playwright
    Preconditions: Dev server running, mock auth
    Steps:
      1. Navigate to http://localhost:3000
      2. Verify navbar renders with theme toggle
      3. Toggle theme and verify class changes
      4. Verify sidebar renders (empty state)
    Expected Result: Layout matches design spec
    Evidence: .omo/evidence/task-13-layout.png

  Scenario: Theme toggle persistence
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Toggle to dark mode
      2. Reload page
      3. Check persisted theme
    Expected Result: Theme persists across reload
    Evidence: .omo/evidence/task-13-theme-persist.png
  ```

  **Commit**: YES
  - Message: `feat: add app layout, navbar, sidebar, and loading skeletons`
  - Files: components/layout/*, app/layout.tsx
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 14. NVIDIA MiniMax M2.7 chat API route（TDD）

  **What to do**:
  - **RED**: 先寫測試（`src/__tests__/api/chat-with-image.test.ts`）
    - `POST /api/chat-with-image` with valid messages → 200 + text + (optional) imageUrl
    - `POST /api/chat-with-image` with message containing photo request → response contains `[DRAW_PROMPT: ...]` parsed and removed
    - `POST /api/chat-with-image` without auth → 401
    - `POST /api/chat-with-image` with empty messages → 400
    - NVIDIA API failure → graceful error（500 with message, no crash）
    - Mock 外部 API 調用以隔離測試
  - **GREEN**: 實作 API route
    - `src/app/api/chat-with-image/route.ts`
    - `src/lib/nvidia.ts`：NVIDIA NIM API client（呼叫 `nvidia/minimax-m2.7`）
    - System prompt 結構：角色 personality + `visual_template` + DRAW_PROMPT 指令
    - Regex parser：`/\[DRAW_PROMPT:\s*([\s\S]*?)\]/`
    - 從 request 取得 character_id → 查 DB 取得 `personality_prompt` 與 `visual_template`
    - 串接完整的 system prompt
    - 回傳 `{ text: string, tempImageUrl: string | null, hasImage: boolean }`
  - **REFACTOR**: 抽 NVIDIA service client + prompt builder

  **Must NOT do**:
  - 不要在前端暴露 `NVIDIA_API_KEY`
  - 不要讓 system prompt 洩漏給前端
  - 不要 blocking 等待圖片生成（文字先回，圖片非同步處理）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 複雜的第三方 API 整合 + prompt engineering + regex parsing
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 22-23
  - **Blocked By**: Tasks 1, 5, 11, 12

  **References**:
  - Plan doc §6.2: 完整的 NVIDIA MiniMax API 調用範例（URL, headers, request/response format）
  - Plan doc §6.2: System prompt 結構（personality + visual_template + DRAW_PROMPT 指令）
  - Plan doc §6.2: Regex pattern: `/\[DRAW_PROMPT:\s*([\s\S]*?)\]/`
  - Official: `https://build.nvidia.com/` for NVIDIA NIM API docs

  **Acceptance Criteria**:
  - [ ] 4+ tests passing
  - [ ] `POST /api/chat-with-image` returns correct format
  - [ ] DRAW_PROMPT tag correctly parsed and removed from response text
  - [ ] NVIDIA API failure handled gracefully
  - [ ] No API key exposure in client bundle

  **QA Scenarios**:
  ```
  Scenario: Chat API returns correct format
    Tool: Bash (curl)
    Preconditions: Dev server running, auth session, existing character, NVIDIA_API_KEY set
    Steps:
      1. POST /api/chat-with-image with { character_id, messages: [{ role: "user", content: "你好" }] }
    Expected Result: 200 with { text: string, tempImageUrl: null, hasImage: false }
    Evidence: .omo/evidence/task-14-chat-api.txt

  Scenario: API rejects unauthenticated requests
    Tool: Bash (curl)
    Preconditions: Dev server running, no auth cookie
    Steps:
      1. POST /api/chat-with-image (no auth)
    Expected Result: 401 response
    Evidence: .omo/evidence/task-14-chat-auth.txt
  ```

  **Commit**: YES
  - Message: `feat: add NVIDIA MiniMax M2.7 chat API with DRAW_PROMPT parsing`
  - Files: api/chat-with-image/*, lib/nvidia.ts, __tests__/api/chat-with-image.test.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 15. Agnes AI 生圖整合 + DRAW_PROMPT parser（TDD）

  **What to do**:
  - **RED**: 先寫測試（`src/__tests__/lib/agnes.test.ts`）
    - `generateImage(prompt)` → 回傳 image URL
    - `generateImage` with invalid prompt → error handling
    - `parseDrawPrompt(text)` → 擷取 prompt string（或 null）
    - `parseDrawPrompt` 有多個標籤 → 只取第一個
    - `parseDrawPrompt` 無標籤 → 回傳 null
    - Agnes API failure → graceful 錯誤
  - **GREEN**: 實作
    - `src/lib/agnes.ts`：
      - `generateImage(prompt: string, options?: { aspect_ratio?: string, size?: string }): Promise<string>`
      - 呼叫 `https://apihub.agnes-ai.com/v1/images/generations` 使用 `agnes-image-2.1-flash` model
      - 回傳 Agnes 回覆中的 image URL
    - `src/lib/draw-prompt.ts`：
      - `parseDrawPrompt(text: string): string | null` — 正則解析
      - `stripDrawPrompt(text: string): string` — 移除 tag，回傳純淨文字
      - `hasDrawPrompt(text: string): boolean`
  - **REFACTOR**: 抽公用的 Agnes API client

  **Must NOT do**:
  - 不要在前端暴露 `AGNES_API_KEY`
  - 不要直接將 Agnes 臨時 URL 存入資料庫（後續由 Task 16 處理轉存）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 第三方 API 整合 + regex pattern 精確性測試
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 22-23
  - **Blocked By**: Tasks 1, 5, 12

  **References**:
  - Plan doc §6.2: Agnes AI API call example（URL, headers, request/response format）
  - Plan doc §6.2: Regex pattern `/\[DRAW_PROMPT:\s*([\s\S]*?)\]/`
  - Plan doc §6.1: Full draw prompt flow description
  - Official: `https://apihub.agnes-ai.com/v1/images/generations` API docs

  **Acceptance Criteria**:
  - [ ] 6+ tests passing
  - [ ] `generateImage()` returns valid URL string
  - [ ] `parseDrawPrompt()` correctly extracts prompt
  - [ ] `stripDrawPrompt()` removes tag cleanly
  - [ ] `hasDrawPrompt()` detects presence correctly

  **QA Scenarios**:
  ```
  Scenario: DRAW_PROMPT parsing works correctly
    Tool: Bash
    Preconditions: draw-prompt.ts module exists
    Steps:
      1. Write quick test: parseDrawPrompt("Hello [DRAW_PROMPT: test prompt] world")
      2. Assert result is "test prompt"
      3. Assert stripDrawPrompt returns "Hello world"
    Expected Result: Parsing works correctly
    Evidence: .omo/evidence/task-15-parse-prompt.txt

  Scenario: generateImage returns a URL (with valid API key)
    Tool: Bash
    Preconditions: AGNES_API_KEY set in .env.local
    Steps:
      1. Call generateImage("test prompt 1girl, portrait")
    Expected Result: Returns string starting with http
    Evidence: .omo/evidence/task-15-agnes-url.txt
  ```

  **Commit**: YES
  - Message: `feat: add Agnes AI image generation and DRAW_PROMPT parser`
  - Files: lib/agnes.ts, lib/draw-prompt.ts, __tests__/lib/agnes.test.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 16. 圖片轉存服務（download → Storage → DB）（TDD）

  **What to do**:
  - **RED**: 先寫測試（`src/__tests__/lib/storage.test.ts`）
    - `persistImage(tempUrl, userId, characterId)` → 下載、上傳、寫 DB、回傳 permanentUrl
    - `persistImage` with invalid tempUrl → graceful error
    - `persistImage` 上傳至正確的 Storage 路徑 → `companion-photos/{userId}/{characterId}/{timestamp}.png`
    - 成功後 images table 新增一筆記錄
  - **GREEN**: 實作
    - `src/lib/storage.ts`：
      - `downloadImage(tempUrl: string): Promise<Buffer>` — fetch 圖片二進位
      - `uploadToStorage(buffer: Buffer, userId: string, characterId: string): Promise<string>` — Supabase Storage SDK
      - `saveImageRecord(userId: string, characterId: string, storageUrl: string, prompt: string, sceneDescription?: string): Promise<void>` — 寫入 images table
      - `persistImage(...)` — 組合以上三步驟
    - 檔案路徑格式：`companion-photos/{userId}/{characterId}/{Date.now()}.png`
  - **REFACTOR**: 錯誤重試邏輯（fetch failures, upload conflicts）

  **Must NOT do**:
  - 不要直接儲存 Agnes 臨時 URL（一定永久保存）
  - 不要阻塞聊天回應（圖片轉存應非同步進行或回應後觸發）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 多步驟非同步流程（download → upload → DB write），需 TDD
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 22-23
  - **Blocked By**: Tasks 1, 5, 7, 8

  **References**:
  - AGENTS.md: Image permanence constraint（download → re-upload → permanent URL）
  - Plan doc §6.1: Step 5（自動轉存到 Supabase Storage）
  - Plan doc §4.2: Storage bucket path structure `companion-photos/{user_id}/{character_id}/{timestamp}.png`

  **Acceptance Criteria**:
  - [ ] 4+ tests passing
  - [ ] `persistImage()` 完整流程可執行
  - [ ] 圖片儲存至正確的 Storage 路徑
  - [ ] images table 中新增記錄含永久 storage_url

  **QA Scenarios**:
  ```
  Scenario: persistImage stores image correctly (with valid Supabase)
    Tool: Bash
    Preconditions: Valid Supabase connection, test temp image available
    Steps:
      1. Call persistImage("https://temp-agnes-url/test.png", "user-1", "char-1")
    Expected Result: Returns permanent Supabase Storage URL
    Evidence: .omo/evidence/task-16-persist-image.txt
  ```

  **Commit**: YES
  - Message: `feat: add image persistence service (download → Storage → DB)`
  - Files: lib/storage.ts, __tests__/lib/storage.test.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 17. 角色選擇頁面 + 角色卡片元件

  **What to do**:
  - `src/components/character/CharacterCard.tsx`：
    - 顯示角色頭像（avatar_url）、名稱、簡短 personality 摘要
    - Hover 效果、點擊進入聊天
    - 使用 Shadcn Card 元件
    - 空狀態（無角色）顯示「創建你的第一個 AI 伴侶」
  - `src/components/character/CharacterCreateDialog.tsx`：
    - Dialog 或 Sheet 表單：名稱、頭像 URL、personality_prompt、visual_template
    - 表單驗證（名稱必填）
    - 提交後呼叫 `POST /api/characters`
  - `src/app/chat/page.tsx`（角色選擇頁面）：
    - 載入用戶的角色列表（`GET /api/characters`）
    - 顯示角色卡片 grid
    - 點擊角色 → 導航至 `/chat/[characterId]`
    - 加入「創建角色」按鈕
    - Loading skeleton（使用 Task 13 的 Skeleton 元件）
  - **TDD**: 測試 CharacterCard renders, CharacterCreateDialog validates form

  **Must NOT do**:
  - 不要在同一頁面實作聊天功能（聊天在 Task 18）
  - 不要使用靜態 mock 資料（從 API 載入）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 前端 UI 元件 + 對話框表單
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3 (with 18, 19)
  - **Blocks**: Tasks 18, 20
  - **Blocked By**: Tasks 11, 13

  **References**:
  - Plan doc §5.2: Color palette (zinc-950, zinc-900, rounded-2xl)
  - Shadcn UI Card, Dialog, Avatar components

  **Acceptance Criteria**:
  - [ ] CharacterCard renders name, avatar, personality summary
  - [ ] CharacterCreateDialog validates required fields
  - [ ] Character list page loads from API and displays cards
  - [ ] Clicking card navigates to `/chat/[characterId]`
  - [ ] Empty state shows creation prompt
  - [ ] Component tests pass

  **QA Scenarios**:
  ```
  Scenario: Character selection page renders
    Tool: Playwright
    Preconditions: Dev server running, auth session, at least one character
    Steps:
      1. Navigate to /chat or /chat page
      2. Verify character cards display
      3. Click "創建角色" button
    Expected Result: Character list visible, create dialog opens
    Evidence: .omo/evidence/task-17-character-page.png
  ```

  **Commit**: YES
  - Message: `feat: add character selection page and character card components`
  - Files: components/character/*, app/chat/page.tsx
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 18. 聊天頁面（訊息列表 + 輸入框 + 角色顯示）

  **What to do**:
  - `src/components/chat/MessageList.tsx`：
    - 顯示對話泡泡（user left, assistant right）
    - 支援文字 + 圖片內嵌顯示
    - auto-scroll 到最新訊息
    - 使用 ScrollArea 元件
  - `src/components/chat/MessageInput.tsx`：
    - textarea 輸入框 + 送出按鈕
    - Enter 送出（Shift+Enter 換行）
    - 送出時 disabled + loading 狀態
    - 支援快速操作按鈕（如「傳自拍給我」）
  - `src/components/chat/ChatHeader.tsx`：
    - 顯示角色名稱 + 頭像 + 關係點數
    - 返回角色選擇頁面的按鈕
  - `src/app/chat/[characterId]/page.tsx`（聊天頁面）：
    - 載入聊天紀錄（`GET /api/chats?character_id=X`）
    - 載入角色資訊（`GET /api/characters/[id]`）
    - 組合 ChatHeader + MessageList + MessageInput
    - 連接 `/api/chat-with-image`（Task 14）
    - 顯示圖片生成中的 loading 動畫
  - **TDD**: 測試 MessageList renders, MessageInput handles submit

  **Must NOT do**:
  - 不要實作即時同步（Task 22 處理）
  - 不要實作 inline image 顯示（Task 21 處理）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 複雜的聊天 UI 元件組合
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 21, 22
  - **Blocked By**: Tasks 12, 13, 14, 17

  **References**:
  - Plan doc §5.2: Design patterns（rounded-2xl, border-zinc-800, 深色主題）
  - Plan doc §6.1: 完整的聊天 → 生圖 → 顯示流程

  **Acceptance Criteria**:
  - [ ] Chat renders header, messages, input
  - [ ] Auto-scroll to latest message
  - [ ] Enter sends message, Shift+Enter newline
  - [ ] Loading state during message send
  - [ ] Image loading animation during generation
  - [ ] Component tests pass

  **QA Scenarios**:
  ```
  Scenario: Chat page renders and sends message
    Tool: Playwright
    Preconditions: Dev server running, auth session, existing character
    Steps:
      1. Navigate to /chat/[characterId]
      2. Verify header shows character name
      3. Type "你好" in input
      4. Press Enter
    Expected Result: Message appears in chat, loading state shows
    Evidence: .omo/evidence/task-18-chat-ui.png
  ```

  **Commit**: YES
  - Message: `feat: add chat page with message list, input, and character header`
  - Files: components/chat/*, app/chat/[characterId]/page.tsx
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 19. 寫真畫廊頁面

  **What to do**:
  - `src/components/gallery/ImageGrid.tsx`：
    - 照片網格顯示（每張含場景描述、生成時間）
    - 點擊放大檢視（lightbox）
    - 使用 Shadcn Dialog 或自訂 lightbox
    - 空狀態顯示「還沒收到自拍喔～」
  - `src/components/gallery/ImageCard.tsx`：
    - 縮圖 + scene_description + created_at
    - 使用 Shadcn Card
  - `src/app/gallery/page.tsx`：
    - 從 API 載入照片（`GET /api/images?character_id=X` 或全部）
    - 角色下拉篩選
    - Grid 顯示 + lightbox 互動
  - 建立對應的 API route（`src/app/api/images/route.ts`）：GET images for user/character

  **Must NOT do**:
  - 不要顯示其他用戶的照片（RLS 確保）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 圖片展示 UI + lightbox 互動
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 20, 21, 22
  - **Blocked By**: Tasks 13

  **References**:
  - Plan doc roadmap Week 1: 寫真畫廊 UI
  - AGENTS.md: images table schema

  **Acceptance Criteria**:
  - [ ] ImageGrid displays photos with descriptions
  - [ ] Click opens lightbox
  - [ ] Character filter works
  - [ ] Empty state shows correct message
  - [ ] `GET /api/images` returns user's images
  - [ ] Component tests pass

  **QA Scenarios**:
  ```
  Scenario: Gallery page renders
    Tool: Playwright
    Preconditions: Dev server running, auth session, existing character with photos
    Steps:
      1. Navigate to /gallery
      2. Verify image grid displays photos
      3. Click photo → lightbox opens
      4. Close lightbox
    Expected Result: Gallery displays correctly, lightbox works
    Evidence: .omo/evidence/task-19-gallery.png
  ```

  **Commit**: YES
  - Message: `feat: add gallery page with photo grid and lightbox`
  - Files: components/gallery/*, app/gallery/page.tsx, api/images/route.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 20. API route 整合：chat → generate → persist → display

  **What to do**:
  - 整合 `/api/chat-with-image` 流程：
    1. 用戶發送訊息 → chat API
    2. MiniMax 回應文字 + 可能含 DRAW_PROMPT
    3. 如果有 DRAW_PROMPT → 呼叫 Agnes AI 生圖
    4. 非同步啟動圖片轉存（Task 16）
    5. 回傳 `{ text, tempImageUrl }`
    6. 前端顯示文字 + 圖片（臨時 URL 先顯示，永久 URL 替換）
  - 修改 `src/app/api/chat-with-image/route.ts`：
    - 整合 Task 14（NVIDIA）+ Task 15（Agnes）+ Task 16（persist）
    - 串接完整的 system prompt（personality + visual_template + DRAW_PROMPT 指令）
    - 非同步觸發 persist（不阻塞回應）
    - 回傳格式：`{ text, hasImage, tempImageUrl, permanentImageUrl?, imageId? }`
  - 修改前端 chat page（`app/chat/[characterId]/page.tsx`）：
    - 發送訊息 → 呼叫整合後的 API
    - 顯示文字回應
    - 如果有 image → 顯示圖片（先用 temp URL，後替換為 permanent）
    - 儲存 assistant message + image info 到 chats table
  - **TDD**: 整合測試（mock 外部 API，驗證完整流程）

  **Must NOT do**:
  - 不要讓用戶端等待圖片轉存完成（非同步處理）
  - 不要跳過錯誤處理（任一環節失敗應有 fallback）

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 最複雜的整合任務，串接 3 個子系統 + 非同步流程
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 22, 23, 24
  - **Blocked By**: Tasks 14, 15, 16, 17, 18

  **References**:
  - Plan doc §6.1: 完整流程（步驟 1-5）
  - Plan doc §6.2: API route 實作範例
  - All previous Tasks 14-19 implementation

  **Acceptance Criteria**:
  - [ ] 完整端到端流程可執行（chat → image gen → persist → display）
  - [ ] 非同步 persist 不影響回應速度
  - [ ] 圖片最終顯示永久 Supabase Storage URL
  - [ ] 任一環節失敗時回傳適當錯誤訊息
  - [ ] 整合測試通過

  **QA Scenarios**:
  ```
  Scenario: End-to-end chat with image generation
    Tool: Playwright
    Preconditions: Dev server running, auth session, existing character, all API keys set
    Steps:
      1. Navigate to /chat/[characterId]
      2. Send message: "傳一張自拍給我看看"
      3. Wait for response with image
    Expected Result: Text response + generated image displayed
    Evidence: .omo/evidence/task-20-e2e-chat.png
  ```

  **Commit**: YES
  - Message: `feat: integrate chat → image gen → persist → display flow`
  - Files: api/chat-with-image/*, app/chat/[characterId]/page.tsx, lib/*.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 21. 前端 image display + inline 照片顯示

  **What to do**:
  - `src/components/chat/ChatImage.tsx`：
    - 在聊天泡泡中內嵌顯示生成的圖片
    - 支援 temp URL → permanent URL 替換
    - 圖片載入中的 placeholder（Skeleton）
    - 點擊放大檢視（可複用 Task 19 的 lightbox）
  - `src/components/chat/ImageGenerationIndicator.tsx`：
    - 圖片生成中的動畫指示器（打字中... 拍照中...）
    - 進度狀態：generating → uploaded → complete
    - 失敗時顯示重試按鈕
  - 修改 MessageList 與 MessageInput 以支援上述元件
  - 動畫：圖片載入時的 fade-in 效果

  **Must NOT do**:
  - 不要阻塞文字回應等待圖片生成完成

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 圖片顯示 UI + 動畫效果
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Parallel Group**: Wave 4 (with Tasks 20, 22)
  - **Blocks**: Tasks 22, 23
  - **Blocked By**: Tasks 18, 19

  **References**:
  - Plan doc §6.1: 步驟 4-5（顯示加載動畫 → 呈現圖片）

  **Acceptance Criteria**:
  - [ ] ChatImage renders inline in message bubble
  - [ ] Image loads with placeholder/fade-in
  - [ ] Click opens lightbox preview
  - [ ] Retry button shows on generation failure
  - [ ] Component tests pass

  **QA Scenarios**:
  ```
  Scenario: Image displays inline in chat
    Tool: Playwright
    Preconditions: Dev server running, auth session, existing character
    Steps:
      1. Navigate to /chat/[characterId]
      2. Send message requesting photo
      3. Wait for generation
    Expected Result: Image appears inline in chat bubble with fade-in
    Evidence: .omo/evidence/task-21-inline-image.png
  ```

  **Commit**: YES
  - Message: `feat: add inline image display and generation indicator in chat`
  - Files: components/chat/ChatImage.tsx, components/chat/ImageGenerationIndicator.tsx
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 22. 即時同步（Supabase Realtime）for 跨裝置

  **What to do**:
  - 啟用 Supabase Realtime 對 `chats` 和 `images` tables 的變更監聽
  - `src/lib/realtime.ts`：
    - `subscribeToChat(characterId, callback)` — 監聽聊天變更
    - `subscribeToImages(characterId, callback)` — 監聽新照片
    - 取消訂閱的 cleanup function
  - 修改 `app/chat/[characterId]/page.tsx`：
    - 使用 Realtime 訂閱接收其他裝置的變更
    - 收到新訊息時自動追加到 MessageList
    - 收到新照片時更新顯示
  - 修改 `app/gallery/page.tsx`：
    - 使用 Realtime 訂閱接收新照片
    - 自動更新 gallery grid
  - **TDD**: 測試 Realtime subscription 邏輯（mock Supabase channel）

  **Must NOT do**:
  - 不要訂閱不必要的 channel（僅 chats 和 images）
  - 不要讓用戶訂閱其他人的資料（RLS 在 Realtime 層也生效）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Supabase Realtime 整合，需正確處理訂閱生命週期
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 23, 24
  - **Blocked By**: Tasks 20, 21

  **References**:
  - Official: `https://supabase.com/docs/guides/realtime`
  - Plan doc roadmap Week 3: 即時監聽

  **Acceptance Criteria**:
  - [ ] Chat page updates when new message received via Realtime
  - [ ] Gallery page updates when new image added
  - [ ] Subscriptions cleaned up on unmount
  - [ ] RLS respected（不能收到其他用戶的資料）
  - [ ] Tests pass

  **QA Scenarios**:
  ```
  Scenario: Real-time sync works across tabs
    Tool: Playwright (two pages)
    Preconditions: Dev server running, two browser contexts with same user
    Steps:
      1. Tab 1: Open chat with character
      2. Tab 2: Open same chat
      3. Tab 2: Send message
    Expected Result: Tab 1 receives message in real-time without refresh
    Evidence: .omo/evidence/task-22-realtime-sync.png
  ```

  **Commit**: YES
  - Message: `feat: add Supabase Realtime sync for chats and images`
  - Files: lib/realtime.ts, app/chat/[characterId]/page.tsx, app/gallery/page.tsx
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 23. Error handling + empty states + edge cases

  **What to do**:
  - 全域錯誤處理：
    - `src/app/error.tsx` — Next.js error boundary（顯示友善錯誤頁面 + 重試按鈕）
    - `src/app/not-found.tsx` — 404 頁面
    - `src/lib/errors.ts` — 統一錯誤類別（AuthError, ApiError, NotFoundError）
    - API routes 統一 error response 格式：`{ error: string, code: string }`
  - Empty states：
    - 無角色：引導創建第一個角色
    - 無聊天：引導開始對話
    - 無照片：引導要求自拍
  - Edge cases：
    - 網路離線狀態提示
    - API timeout（30s timeout on external API calls）
    - 生圖失敗 → 顯示錯誤訊息 + 重試按鈕
    - Session 過期 → 自動重新導向登入
    - 角色被刪除 → 回到角色選擇頁面
  - 批次請求限制：聊天歷史分頁載入（limit=50, offset）

  **Must NOT do**:
  - 不要使用 `console.log` 作為錯誤處理（使用 proper error reporting）
  - 不要顯示技術性錯誤訊息給用戶（使用中文友善訊息）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要考慮多種邊界情況和錯誤場景
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 4)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 24
  - **Blocked By**: Tasks 20, 22

  **References**:
  - Standard Next.js error handling patterns

  **Acceptance Criteria**:
  - [ ] Error boundary catches rendering errors
  - [ ] 404 page shows for unknown routes
  - [ ] API returns consistent error format
  - [ ] Empty states show helpful CTAs
  - [ ] Session expiry redirects to login
  - [ ] API timeout handled gracefully
  - [ ] Tests pass

  **QA Scenarios**:
  ```
  Scenario: Error page shows on bad route
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to /nonexistent-route
    Expected Result: 404 page with friendly message
    Evidence: .omo/evidence/task-23-404.png

  Scenario: Empty state for new user
    Tool: Playwright
    Preconditions: Dev server running, auth session, no characters
    Steps:
      1. Navigate to /chat
    Expected Result: Empty state with CTA to create character
    Evidence: .omo/evidence/task-23-empty-state.png
  ```

  **Commit**: YES
  - Message: `feat: add error handling, empty states, and edge case coverage`
  - Files: app/error.tsx, app/not-found.tsx, lib/errors.ts
  - Pre-commit: `npm run test:run && npx tsc --noEmit`

- [ ] 24. Vercel 部署設定 + environment variables

  **What to do**:
  - 建立 `vercel.json`（如有必要，Next.js 多數自動偵測）
  - 確保 `next.config.js` 正確設定：
    - `output: 'standalone'`（選擇性）
    - `images.remotePatterns` 允許 Agnes AI 和 Supabase 圖片來源
  - 設定 `package.json` build script 相容
  - 建立 `DEPLOY.md` 部署說明：
    - 1. 推送至 GitHub
    - 2. 在 Vercel 匯入專案
    - 3. 設定環境變數（NVIDIA_API_KEY, AGNES_API_KEY, SUPABASE 變數）
    - 4. 設定 Supabase 專案
    - 5. 設定 Google OAuth redirect URI（Vercel Production URL）
  - 確認 `npm run build` 無錯誤
  - 確認 `next lint` 無 error/warning

  **Must NOT do**:
  - 不要將 `.env.local` 加入 git
  - 不要在程式碼中硬編碼任何環境依賴的路徑

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 標準 Vercel 部署設定
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO（最後一個實作 task）
  - **Parallel Group**: Sequential (after Tasks 20-23)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 20, 23

  **References**:
  - Vercel Next.js deployment docs
  - AGENTS.md: Vercel deploy requirement

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] `npm run lint` passes
  - [ ] DEPLOY.md covers all setup steps
  - [ ] `next.config.js` has correct image remotePatterns

  **QA Scenarios**:
  ```
  Scenario: Production build succeeds
    Tool: Bash
    Preconditions: All env vars set
    Steps:
      1. npm run build
    Expected Result: Build succeeds, no errors
    Evidence: .omo/evidence/task-24-build.txt
  ```

  **Commit**: YES
  - Message: `chore: add Vercel deployment configuration and deploy guide`
  - Files: vercel.json, next.config.js, DEPLOY.md
  - Pre-commit: `npm run build && npm run test:run && next lint`

---

## Final Verification Wave (MANDATORY)

> 4 個審查 agent 並行執行。全部必須 APPROVE。向用戶展示結果並取得明確確認後才算完成。

- [ ] F1. **Plan Compliance Audit** — `oracle` / `unspecified-high`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `next lint` + `npm run test:run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | When | Message | Files | Pre-check |
|--------|------|---------|-------|-----------|
| 1 | After Tasks 1-6 | `chore: initial project scaffold with Next.js 14+, Supabase, Shadcn UI, vitest` | All Wave 1 files | `npm run test:run && npx tsc --noEmit` |
| 2 | After Tasks 7-8 | `feat: add database schema, RLS policies, and Supabase init script` | SQL, types, scripts | `npx tsc --noEmit` |
| 3 | After Tasks 9-10 | `feat: add Google OAuth login, callback handler, middleware, and auth tests` | Auth files | `npm run test:run && npx tsc --noEmit` |
| 4 | After Task 11 | `feat: add character CRUD API with service layer and TDD tests` | Character API | `npm run test:run && npx tsc --noEmit` |
| 5 | After Task 12 | `feat: add chat CRUD API with service layer and TDD tests` | Chat API | `npm run test:run && npx tsc --noEmit` |
| 6 | After Task 13 | `feat: add app layout, navbar, sidebar, and loading skeletons` | Layout components | `npm run test:run && npx tsc --noEmit` |
| 7 | After Task 14 | `feat: add NVIDIA MiniMax M2.7 chat API with DRAW_PROMPT parsing` | Chat API + NVIDIA | `npm run test:run && npx tsc --noEmit` |
| 8 | After Task 15 | `feat: add Agnes AI image generation and DRAW_PROMPT parser` | Agnes + parser | `npm run test:run && npx tsc --noEmit` |
| 9 | After Task 16 | `feat: add image persistence service (download → Storage → DB)` | Storage service | `npm run test:run && npx tsc --noEmit` |
| 10 | After Task 17 | `feat: add character selection page and character card components` | Character UI | `npm run test:run && npx tsc --noEmit` |
| 11 | After Task 18 | `feat: add chat page with message list, input, and character header` | Chat UI | `npm run test:run && npx tsc --noEmit` |
| 12 | After Task 19 | `feat: add gallery page with photo grid and lightbox` | Gallery | `npm run test:run && npx tsc --noEmit` |
| 13 | After Task 20 | `feat: integrate chat → image gen → persist → display flow` | Integration | `npm run test:run && npx tsc --noEmit` |
| 14 | After Task 21 | `feat: add inline image display and generation indicator in chat` | Image display | `npm run test:run && npx tsc --noEmit` |
| 15 | After Task 22 | `feat: add Supabase Realtime sync for chats and images` | Realtime | `npm run test:run && npx tsc --noEmit` |
| 16 | After Task 23 | `feat: add error handling, empty states, and edge case coverage` | Error handling | `npm run test:run && npx tsc --noEmit` |
| 17 | After Task 24 | `chore: add Vercel deployment configuration and deploy guide` | Deploy config | `npm run build && npm run test:run && next lint` |

---

## Success Criteria

### Verification Commands
```bash
npm run dev          # Dev server on localhost:3000
npm run test:run     # All vitest tests pass
npx tsc --noEmit     # No TypeScript errors
next lint            # No lint errors
npm run build         # Production build succeeds
```

### Final Checklist
- [ ] Google OAuth login → redirects to chat page
- [ ] Create character → appears in character list
- [ ] Chat with character → receives AI response
- [ ] Request "自拍" → image generates and displays inline
- [ ] Image persists → appears in gallery page
- [ ] Real-time sync → second tab receives updates
- [ ] RLS security → user B cannot access user A's data
- [ ] All API keys server-side only (not in client bundle)
- [ ] All 23+ test files pass (vitest)
- [ ] Production build succeeds (Vercel-ready)
