\# AI 伴侶聊天與照片生成網頁 App 建立計劃書 (整合 Supabase、Google 登入與 OpenCode 開發)



本計劃書旨在指引開發者整合 \*\*NVIDIA/MiniMax M2.7\*\*（文字對話與角色扮演）及 \*\*Agnes-Image-2.1-Flash\*\*（高畫質虛擬寫真生成）API，建立一個免費、體驗流暢、支援跨裝置同步，且具備\\\*\\\*「AI 伴侶角色客製化與照片一致性生成」\\\*\\\*的雙模態網頁應用程式（Web App），並詳細評估部署方案與引入 \*\*OpenCode AI 助理\*\* 的自動化開發路徑。



\---



\## 1. 專案概述 (Project Overview)



\### 1.1 核心定位



本 App 參考自 `ai\_gf` 虛擬伴侶概念，旨在打造一個\*\*低成本、高互動性、具備專屬記憶與寫真生成能力\*\*的 AI 伴侶平台。

用戶可以透過 \*\*Google 帳號\*\* 快速登入，自由選擇或創建不同性格、外貌的 AI 伴侶。除了日常的溫馨聊天與角色扮演外，AI 伴侶還能根據聊天氛圍或用戶要求，實時生成並「發送」符合當下情境與其自身外貌設定的「自拍/寫真照片」。



\### 1.2 核心挑戰與解決方案



1\. \*\*部署與金鑰安全\*\*：原版 `ai\_gf` 部署在靜態的 GitHub Pages 上，但由於本專案需要調用後端 API 金鑰（NVIDIA / Agnes AI），若直接在前端代碼中調用，金鑰會暴露在瀏覽器中。本計劃提供 \*\*Next.js 14+ 全棧託管\*\* 的解決方案，將 API 金鑰安全隱藏在服務端環境變數中。



2\. \*\*角色視覺一致性 (Visual Consistency)\*\*：生圖模型最常遇到「每次生成的角色長相都不同」的問題。我們在資料庫中為每個角色定義「視覺外表特徵模板」，並透過 MiniMax 提示詞工程，確保每次生圖都帶有相同的角色五官特徵。



3\. \*\*照片儲存與過期處理\*\*：Agnes AI 生成的原始圖片網址通常有時效性。系統會在背景自動將生成的照片下載，轉存至開發者自有的免費雲端儲存空間（Supabase Storage），實現永久保存與跨裝置相簿同步。



\---



\## 2. 部署方案深度評估 (Deployment Comparison)



開發此類需要調用第三方 API 的 Web App，部署平台的選擇至關重要。以下是針對 \*\*GitHub Pages\*\*、\*\*Firebase\*\* 與 \*\*Vercel\*\* 的安全性與適用性評估：



| 評估維度 | GitHub Pages | Firebase (App Hosting / Functions) | Vercel (推薦) |

| :--- | :--- | :--- | :--- |

| \*\*部署類型\*\* | 靜態託管 (Static Only) | 全端服務 (SSR + Serverless) | 全端一體化 (Next.js 最佳拍檔) |

| \*\*API 金鑰安全性\*\* | ❌ \*\*極差\*\*<br>必須在瀏覽器中暴露 `NVIDIA\_API\_KEY` 與 `AGNES\_API\_KEY`，極易被盜刷。 |  \*\*優良\*\*<br>可將金鑰配置在 Firebase 密鑰管理器 (Secret Manager) 中，安全調用。 |  \*\*優良\*\*<br>直接在 Vercel Settings 中填入 Environment Variables，前端完全碰不到金鑰。 |

| \*\*Next.js 支援度\*\* | ❌ 僅支援 Static Export，無法使用 Serverless Routes / SSR。 |  支援 (透過 Firebase App Hosting)。 | 🏆 \*\*完美支援\*\* (Next.js 的母公司，享有最快、最直覺的部署體驗)。 |

| \*\*免費額度\*\* | 100% 免費。 | 寬裕的免費額度 (Spark 方案)，包含免費 Cloud Functions 額度。 | 🏆 非常寬裕 (Hobby 方案提供免費 SSR、API Routes 與邊緣網路)。 |

| \*\*結論\*\* | \*\*完全不適合\*\*此專案。 | \*\*適合\*\*。如果未來打算整合 Firebase 其他服務，可以使用。 | 🏆 \*\*最推薦\*\*。開發 Next.js + API 路由速度最快，幾乎不需要配置。 |



\---



\## 3. 技術堆疊與系統架構 (System Architecture)



本專案採用\*\*全端一體化 (Next.js 14+ 部署在 Vercel)\*\* 與 \*\*Supabase 後端服務\*\*。這是目前最主流、開發最快速且免費額度最寬裕的現代 Web 開發組合。



```

&#x20;                      ┌────────────────────────┐

&#x20;                      │   Vercel (託管平台)     │

&#x20;                      │                        │

&#x20;                      │   ┌────────────────┐   │

&#x20;                      │   │  Next.js App   │   │

&#x20;                      │   └──────┬─────────┘   │

&#x20;                      └──────────┼─────────────┘

&#x20;                                 │ (REST/GraphQL/WS)

&#x20;        ┌────────────────────────┼────────────────────────┐

&#x20;        │                        ▼                        │

&#x20;        │                Supabase (後端)                  │

&#x20;        │                                                 │

&#x20;        │  ┌──────────────┐┌──────────────┐┌───────────┐  │

&#x20;        │  │  PostgreSQL  ││ Auth (登入)  ││  Storage  │  │

&#x20;        │  │  (資料庫)     ││ (Google/Git)││  (雲端桶)  │  │

&#x20;        │  └──────────────┘└──────────────┘└───────────┘  │

&#x20;        └─────────────────────────────────────────────────┘

```



\### 3.1 核心技術堆疊



\* \*\*前端與 API 路由\*\*：Next.js 14+ (App Router), Tailwind CSS (UI 樣式), Shadcn UI (元件庫)。

\* \*\*資料庫與身份驗證\*\*：Supabase (PostgreSQL) \& Supabase Auth（啟用 Google OAuth 登入）。

\* \*\*雲端儲存\*\*：Supabase Storage (用於備份與永久保存伴侶寫真)。

\* \*\*AI 引擎\*\*：

&#x20; \* \*\*對話與大語言模型\*\*：`nvidia/minimax-m2.7` (透過 NVIDIA NIM API)。

&#x20; \* \*\*寫真生圖模型\*\*：`agnes-image-2.1-flash` (透過 Agnes AI API)。



\---



\## 4. Supabase 資料庫設計與安全策略 (Database \& Security)



為了實現「跨裝置雲端同步」與「多用戶隔離安全」，我們必須在 Supabase 中啟用 \*\*資料列安全性 (Row Level Security, RLS)\*\*。這能確保 A 用戶絕對無法讀取或修改 B 用戶的聊天紀錄與專屬伴侶。



\### 4.1 SQL 部署腳本 (DDL \& RLS Policies)



請在 Supabase 的 \*\*SQL Editor\*\* 中直接執行以下腳本，即可一鍵建立完整的資料表、關聯外鍵與安全策略：



```sql

\-- 1. 啟用 UUID 擴充功能

create extension if not exists "uuid-ossp";



\-- 2. 建立 AI 伴侶角色表 (characters)

create table public.characters (

&#x20;   id uuid default gen\_random\_uuid() primary key,

&#x20;   user\_id uuid references auth.users(id) on delete cascade not null,

&#x20;   name varchar(255) not null,

&#x20;   avatar\_url text,

&#x20;   personality\_prompt text not null,

&#x20;   visual\_template text not null,

&#x20;   relation\_points integer default 0 not null,

&#x20;   created\_at timestamp with time zone default timezone('utc'::text, now()) not null

);



\-- 3. 建立聊天對話紀錄表 (chats)

create table public.chats (

&#x20;   id uuid default gen\_random\_uuid() primary key,

&#x20;   character\_id uuid references public.characters(id) on delete cascade not null,

&#x20;   user\_id uuid references auth.users(id) on delete cascade not null,

&#x20;   messages jsonb default '\[]'::jsonb not null,

&#x20;   updated\_at timestamp with time zone default timezone('utc'::text, now()) not null

);



\-- 4. 建立伴侶寫真畫廊表 (images)

create table public.images (

&#x20;   id uuid default gen\_random\_uuid() primary key,

&#x20;   character\_id uuid references public.characters(id) on delete cascade not null,

&#x20;   user\_id uuid references auth.users(id) on delete cascade not null,

&#x20;   prompt text not null,

&#x20;   storage\_url text not null,

&#x20;   scene\_description text,

&#x20;   created\_at timestamp with time zone default timezone('utc'::text, now()) not null

);



\-- =========================================================================

\-- 安全防護：啟用 Row Level Security (RLS)

\-- =========================================================================



alter table public.characters enable row level security;

alter table public.chats enable row level security;

alter table public.images enable row level security;



\-- =========================================================================

\-- 安全策略：確保用戶只能操作屬於自己的數據 (UUID 綁定 auth.uid())

\-- =========================================================================



\-- Characters 策略

create policy "用戶可管理自己的伴侶角色" on public.characters

&#x20;   for all using (auth.uid() = user\_id);



\-- Chats 策略

create policy "用戶可管理自己的聊天對話" on public.chats

&#x20;   for all using (auth.uid() = user\_id);



\-- Images 策略

create policy "用戶可管理自己的寫真相簿" on public.images

&#x20;   for all using (auth.uid() = user\_id);

```



\### 4.2 Supabase Storage (雲端儲存桶) 安全設定



我們需要在 Supabase 控制台的 \*\*Storage\*\* 中創建一個名為 `companion-photos` 的公開儲存桶 (Public Bucket)，用來存放伴侶的寫真照片。為了防止惡意上傳，我們同樣需要配置 RLS 策略：



\#### 儲存桶 RLS 安全規則 (在 Storage -> Policies 中設定)：



1\. \*\*允許登入用戶上傳照片到自己的專屬資料夾\*\*：

&#x20;  \* \*\*操作 (Allowed Operations)\*\*: `INSERT`

&#x20;  \* \*\*條件 (Target roles)\*\*: `authenticated`

&#x20;  \* \*\*宣告式政策 (Using expression)\*\*:

&#x20;    ```sql

&#x20;    bucket\_id = 'companion-photos' AND (storage.foldername(name))\[1] = auth.uid()::text

&#x20;    ```

&#x20;    \*(這能確保用戶上傳的路徑結構必須是\* `companion-photos/{user\_id}/filename.png`\*，無法污染其他用戶的資料夾)\*



2\. \*\*允許所有人（或僅登入用戶）讀取照片\*\*：

&#x20;  \* \*\*操作 (Allowed Operations)\*\*: `SELECT`

&#x20;  \* \*\*宣告式政策 (Using expression)\*\*:

&#x20;    ```sql

&#x20;    bucket\_id = 'companion-photos'

&#x20;    ```



\---



\## 5. Google 登入認證 (Google OAuth) 整合指南



為了實現流暢、安全的免帳密跨裝置同步，系統採用 \*\*Supabase Auth + Google OAuth\*\* 機制。



\### 5.1 雲端平台設定步驟



1\. \*\*Google Cloud Console 設定\*\*：

&#x20;  \* 進入 \[Google Cloud Console](https://console.cloud.google.com/)，建立一個新專案。

&#x20;  \* 導航至 \*\*API 和服務 > OAuth 同意畫面\*\*，選擇 \*\*External\*\* 並填寫應用程式基本資訊。

&#x20;  \* 進入 \*\*憑證 (Credentials)\*\* 頁面，點擊 \*\*建立憑證 > OAuth 用戶端 ID\*\*。

&#x20;  \* 應用程式類型選擇 \*\*網頁應用程式 (Web Application)\*\* \[4.2]。

&#x20;  \* \*\*已授權的重新導向 URI\*\* 填入 Supabase 提供的 Auth 回呼網址：

&#x20;    `https://<YOUR-SUPABASE-PROJECT-ID>.supabase.co/auth/v1/callback`

&#x20;  \* 儲存後，取得 \*\*用戶端 ID (Client ID)\*\* 與 \*\*用戶端密鑰 (Client Secret)\*\* \[4.2]。



2\. \*\*Supabase Dashboard 設定\*\*：

&#x20;  \* 登入 Supabase，進入專案，導航至 \*\*Authentication > Providers > Google\*\*。

&#x20;  \* 啟用 (Enable) Google Provider。

&#x20;  \* 填入從 Google Cloud 取得的 \*\*Client ID\*\* 與 \*\*Client Secret\*\*。

&#x20;  \* 儲存設定。



\### 5.2 前端 Google 登入按鈕實作



在 Next.js 的前端頁面（例如 `/login/page.tsx`）中，實作觸發 Google OAuth 登入的按鈕：



```typescript

'use client';



import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import { useState } from 'react';



export default function LoginPage() {

&#x20; const supabase = createClientComponentClient();

&#x20; const \[loading, setLoading] = useState(false);



&#x20; const handleGoogleLogin = async () => {

&#x20;   setLoading(true);

&#x20;   const { error } = await supabase.auth.signInWithOAuth({

&#x20;     provider: 'google',

&#x20;     options: {

&#x20;       redirectTo: `${window.location.origin}/auth/callback`,

&#x20;     },

&#x20;   });



&#x20;   if (error) {

&#x20;     alert(`登入失敗: ${error.message}`);

&#x20;     setLoading(false);

&#x20;   }

&#x20; };



&#x20; return (

&#x20;   <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-4">

&#x20;     <div className="w-full max-w-md space-y-8 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-xl">

&#x20;       <div className="text-center">

&#x20;         <h2 className="text-3xl font-bold tracking-tight">尋找你的 AI 伴侶</h2>

&#x20;         <p className="mt-2 text-zinc-400">登入以同步您的聊天紀錄與專屬寫真</p>

&#x20;       </div>

&#x20;       <button

&#x20;         onClick={handleGoogleLogin}

&#x20;         disabled={loading}

&#x20;         className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"

&#x20;       >

&#x20;         <svg className="h-5 w-5" viewBox="0 0 24 24">

&#x20;           <path

&#x20;             fill="currentColor"

&#x20;             d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"

&#x20;           />

&#x20;           <path

&#x20;             fill="currentColor"

&#x20;             d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"

&#x20;           />

&#x20;           <path

&#x20;             fill="currentColor"

&#x20;             d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"

&#x20;           />

&#x20;           <path

&#x20;             fill="currentColor"

&#x20;             d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"

&#x20;           />

&#x20;         </svg>

&#x20;         {loading ? '正在跳轉...' : '使用 Google 帳號登入'}

&#x20;       </button>

&#x20;     </div>

&#x20;   </div>

&#x20; );

}

```



\---



\## 6. 核心 API 串接與「視覺一致性」核心代碼



\### 6.1 核心流程



1\. 用戶在聊天中提出拍照要求：「可以傳一張你正在咖啡廳看書的自拍給我嗎？」

2\. \*\*MiniMax M2.7\*\* 接收到對話與 Character 的 `visual\_template`，識別出生圖意圖，自動擴充場景描述，並將其與角色外貌結合。

3\. MiniMax 輸出帶有特殊標記的文字：`\[DRAW\_PROMPT: 1girl, 20 years old, silver short hair, sparkling emerald eyes, reading a book in a cozy cafe, cinematic lighting, photorealistic, 4k]`。

4\. 前端解析到標籤，調用後端 Agnes AI 繪圖 API，並同步顯示加載動畫。

5\. 後端獲取 Agnes AI 圖片後，\*\*自動轉存到 Supabase Storage\*\*，將永久網址寫入 `images` 資料表，並呈現給用戶。



\### 6.2 視覺一致性生圖 API 路由實作 (`/api/chat-with-image/route.ts`)



以下程式碼展示了如何在後端將「角色外貌模板」與「聊天情境」動態結合，並調用 MiniMax 與 Agnes AI。



```typescript

import { NextResponse } from 'next/server';



// 模擬從資料庫中獲取的角色設定（實際開發請從 DB Query）

const mockCharacter = {

&#x20; name: "Luna (露娜)",

&#x20; personality: "你是一位開朗、溫柔、帶點傲嬌的 20 歲賽博龐克女孩。你是用戶的 AI 女朋友，說話語氣親暱多情，常用表情符號。",

&#x20; visual\_template: "1girl, 20-year-old female, silver-colored short bob hair, sparkling emerald green eyes, pale skin, wearing a sleek black cyberpunk collar"

};



export async function POST(req: Request) {

&#x20; try {

&#x20;   const { messages } = await req.json();



&#x20;   // 1. 建立具有「視覺一致性約束」與「生圖觸發器」的 System Prompt

&#x20;   const systemPrompt = `

&#x20;     ${mockCharacter.personality}



&#x20;     【重要生圖指令】：

&#x20;     如果用戶在對話中要求你「發送自拍」、「傳照片」、「畫圖」或「給你看你現在的樣子」，請在回覆的最後一行，\*\*嚴格且必須\*\*夾帶以下標籤來觸發生圖引擎：

&#x20;     \[DRAW\_PROMPT: ${mockCharacter.visual\_template}, <根據對話情境描述她正在做的事，例如：drinking coffee in a cafe, smiling at camera, photorealistic, highly detailed, 4k>]



&#x20;     範例：

&#x20;     「親愛的，這是我現在在圖書館的自拍喔，有沒有想我？\[DRAW\_PROMPT: ${mockCharacter.visual\_template}, sitting in a sunny library, holding a textbook, soft smile, cinematic lighting, 4k]」

&#x20;   `;



&#x20;   // 2. 呼叫 NVIDIA MiniMax M2.7 進行文字對話

&#x20;   const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {

&#x20;     method: 'POST',

&#x20;     headers: {

&#x20;       'Content-Type': 'application/json',

&#x20;       'Authorization': `Bearer ${process.env.NVIDIA\_API\_KEY}`,

&#x20;     },

&#x20;     body: JSON.stringify({

&#x20;       model: 'nvidia/minimax-m2.7',

&#x20;       messages: \[

&#x20;         { role: 'system', content: systemPrompt },

&#x20;         ...messages

&#x20;       ],

&#x20;       stream: false, 

&#x20;     }),

&#x20;   });



&#x20;   const chatData = await nvidiaResponse.json();

&#x20;   const assistantMessage = chatData.choices\[0].message.content;



&#x20;   // 3. 使用 Regex 檢查是否含有生圖標籤 \[DRAW\_PROMPT: ...]

&#x20;   const drawPromptRegex = /\\\[DRAW\_PROMPT:\\s\*(\[\\s\\S]\*?)\\]/;

&#x20;   const match = assistantMessage.match(drawPromptRegex);



&#x20;   let imageUrl = null;

&#x20;   let cleanMessage = assistantMessage;



&#x20;   if (match) {

&#x20;     const finalPrompt = match\[1]; // 提取出完美融合外貌與場景的生圖 Prompt

&#x20;     cleanMessage = assistantMessage.replace(drawPromptRegex, '').trim(); // 移除對話中的標籤



&#x20;     // 4. 呼叫 Agnes-Image-2.1-Flash 生成照片

&#x20;     const agnesResponse = await fetch('https://apihub.agnes-ai.com/v1/images/generations', {

&#x20;       method: 'POST',

&#x20;       headers: {

&#x20;         'Content-Type': 'application/json',

&#x20;         'Authorization': `Bearer ${process.env.AGNES\_API\_KEY}`,

&#x20;       },

&#x20;       body: JSON.stringify({

&#x20;         model: 'agnes-image-2.1-flash',

&#x20;         prompt: finalPrompt,

&#x20;         aspect\_ratio: "1:1", 

&#x20;         size: "2K",

&#x20;         n: 1

&#x20;       }),

&#x20;     });



&#x20;     const imageData = await agnesResponse.json();

&#x20;     if (agnesResponse.ok \&\& imageData.data?.\[0]?.url) {

&#x20;       imageUrl = imageData.data\[0].url;

&#x20;     }

&#x20;   }



&#x20;   return NextResponse.json({

&#x20;     text: cleanMessage,

&#x20;     tempImageUrl: imageUrl, 

&#x20;     hasImage: !!imageUrl

&#x20;   });



&#x20; } catch (error: any) {

&#x20;   return NextResponse.json({ error: error.message }, { status: 500 });

&#x20; }

}

```



\---



\## 7. 運用 OpenCode 進行 AI 輔助開發指南 (Developing with OpenCode)



\*\*OpenCode\*\* 是目前極受歡迎的開源、終端原生 AI 編碼代理（Coding Agent）。它能讀取你的整個專案結構、自動撰寫代碼、自動下載並執行測試、修復 Bug，甚至直接與你的 Terminal 進行多步驟互動。你可以輕鬆透過 \*\*NVIDIA NIM API\*\* 結合 \*\*OpenCode\*\*，零成本地開發出本專案！



\### 7.1 開發準備與安裝



1\. \*\*安裝 OpenCode\*\*：

&#x20;  在你的開發機中，直接執行以下指令進行全域安裝：

&#x20;  ```bash

&#x20;  npm install -g @aie/opencode

&#x20;  ```

&#x20;  \*(或者在 macOS 上使用 `curl -fsSL https://opencode.ai/install.sh | sh`)\*



2\. \*\*配置 NVIDIA NIM API 金鑰\*\*：

&#x20;  進入 \[NVIDIA Build](https://build.nvidia.com/) 取得免費 API Key。在終端機配置環境變數，將 OpenCode 連接至 NVIDIA 或 OpenCode Zen：

&#x20;  ```bash

&#x20;  export OPENAI\_API\_KEY=your-nvidia-api-key # 或者使用 /connect 指令引導設定

&#x20;  ```



3\. \*\*初始化專案並啟動 OpenCode\*\*：

&#x20;  在你新建的 Next.js 14 專案根目錄下，執行以下指令：

&#x20;  ```bash

&#x20;  cd my-ai-gf-app

&#x20;  opencode

&#x20;  ```

&#x20;  這會啟動一個互動式的 TUI 介面，OpenCode 會掃描你的專案目錄，並準備為你撰寫代碼。



\### 7.2 OpenCode 實戰 Prompt 推薦



你可以在 OpenCode TUI 中使用 `/build` 模式或直接以對話形式指揮 AI 代寫核心功能：



\#### 實戰 1：建構 Supabase 用戶端與認證路由

\* \*\*你對 OpenCode 的指令\*\*：

&#x20; > "/build 請幫我在 `src/lib/` 中建立 `supabase.ts` 用戶端初始化代碼，並在 `/app/auth/callback/route.ts` 中實作一個 GET 路由，用來處理 Supabase 的 Google OAuth 登入回呼。請使用 `@supabase/auth-helpers-nextjs`。"



\#### 實戰 2：實作 Next.js API Routes 整合 MiniMax \& Agnes AI

\* \*\*你對 OpenCode 的指令\*\*：

&#x20; > "/build 請在 `src/app/api/chat-with-image/route.ts` 建立後端路由。該路由需接收 `messages`，呼叫 NVIDIA MiniMax M2.7 獲取對話。如果回覆中包含 `\[DRAW\_PROMPT: ...]` 標記，則呼叫 Agnes AI 繪製圖片，並在回覆中返回純淨文字與臨時圖片連結。請確保 API Keys 是從環境變數安全讀取。"



\#### 實戰 3：建立照片永久備份機制

\* \*\*你對 OpenCode 的指令\*\*：

&#x20; > "/build 請在後端撰寫一個異步背景服務，當獲得 Agnes AI 臨時圖片 URL 後，使用 `fetch` 下載為 Buffer，然後調用 Supabase Storage SDK，將其上傳到 `companion-photos/{user\_id}/{character\_id}/{timestamp}.png`，最後把資訊與永久網址寫入 PostgreSQL 的 `images` 資料表。"



\---



\## 8. 開發時程與推進路徑 (Roadmap)



本計劃升級為雲端同步的虛擬伴侶應用，建議開發週期為 \*\*3 週 (21 天)\*\*：



\### 📅 第 1 週：前端、UI 與本地端體驗 (Day 1 - Day 7)

\* 搭建 Next.js 14 專案，設計精美的響應式「伴侶聊天室」與「個人寫真畫廊」UI。

\* 將原版 `ai\_gf` 的優點（角色卡片滑動選擇、自訂頭像）融入全新的 UI。

\* 運用 \*\*OpenCode\*\* 快速生成前端元件與頁面骨架。



\### 📅 第 2 週：雲端資料庫、驗證與安全後端 (Day 8 - Day 14)

\* 申請 Google Cloud Console 憑證，並啟用 \*\*Supabase Auth Google Provider\*\*。

\* 建立 `characters`、`chats`、`images` 資料庫表，並套用 SQL RLS 安全策略。

\* 實作 `/api/chat-with-image` 後端路由，完美隱藏 API Keys。

\* 導入\*\*視覺一致性模板\*\*，調校 MiniMax 生圖 Prompt 的精準度。



\### 📅 第 3 週：轉存備份、即時同步與上線 (Day 15 - Day 21)

\* 撰寫背景轉存圖片邏輯（將 Agnes 圖片轉存至 Storage Buckets）。

\* 實作即時監聽（Real-time Listener），確保當用戶在電腦端跟伴侶互動時，手機端也能秒級同步對話紀錄與新照片。

\* 一鍵推送到 \*\*Vercel\*\* 進行上線，配置自訂網域，並在手機、平板多端進行壓力與聯調測試。

