<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# aigf-online — AI 伴侶聊天與照片生成

## Stack (ALL versions matter)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Next.js 16.2.9** (App Router) | Read `node_modules/next/dist/docs/` before coding |
| UI | Tailwind CSS **v4**, shadcn/ui (base-nova), Base UI React | Tailwind v4 uses `@import "tailwindcss"` not `@tailwind` directives |
| Styling | `class-variance-authority` + `clsx` + `tailwind-merge` via `cn()` | Import from `@/lib/utils` |
| Icons | lucide-react | |
| Backend | Supabase (auth, DB, storage, Realtime) | |
| Chat AI | NVIDIA NIM — MiniMax M2.7 (`src/lib/nvidia.ts`) | |
| Image Gen | Agnes AI — agnes-image-2.1-flash (`src/lib/agnes.ts`) | |
| Testing | Vitest + jsdom + @testing-library/react | NOT Jest |
| Auth | Supabase Auth (Google OAuth) | |

## Commands

```bash
npm run dev        # Next.js dev server
npm run build      # Type-check + production build
npm run lint       # ESLint (flat config)
npm run test       # Vitest watch
npm run test:run   # Vitest single-run
npm run test:coverage
```

## Project structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts        # POST: chat (NVIDIA → draw prompt → background Agnes)
│   │   ├── chats/route.ts       # GET/POST/PATCH/DELETE: chat messages
│   │   ├── characters/route.ts  # GET/POST
│   │   ├── characters/[id]/     # GET/PATCH/DELETE single character
│   │   ├── images/route.ts      # GET/DELETE (clear all)
│   │   ├── images/[id]/         # DELETE single image
│   │   └── upload/avatar/       # Avatar upload
│   ├── auth/callback/route.ts   # Supabase OAuth callback
│   ├── chat/[id]/page.tsx       # Chat page (client component)
│   ├── gallery/page.tsx         # Photo gallery
│   ├── login/page.tsx           # Google OAuth login
│   ├── settings/[id]/           # Character settings
│   └── page.tsx                 # Character selection home
├── components/
│   ├── character/               # CharacterCard, CreateCharacterDialog
│   ├── chat/                    # (empty - inline in chat/[id]/page.tsx)
│   ├── gallery/                 # Gallery components
│   ├── layout/                  # AppLayout, Sidebar, Navbar, AuthHandler, ThemeToggle
│   └── ui/                      # shadcn/ui components (12 files)
├── lib/
│   ├── services/                # Data access layer (character, chat, image services)
│   ├── supabase.ts              # Server client (cookies())
│   ├── supabase-client.ts       # Browser client
│   ├── supabase-admin.ts        # Service-role client (admin ops)
│   ├── agnes.ts                 # Agnes AI image generation API
│   ├── nvidia.ts                # NVIDIA NIM chat completion API
│   ├── draw-prompt.ts           # [DRAW_PROMPT: ...] tag parsing
│   ├── image-generator.ts       # Background image gen pipeline
│   ├── storage.ts               # Supabase Storage upload + image tracking
│   └── utils.ts                 # cn() helper
├── types/
│   └── database.ts              # Character, Chat, ChatMessage, Image, etc.
└── __tests__/                   # Vitest tests
    ├── setup.ts                 # jest-dom matchers
    ├── example.test.ts
    ├── components/
    ├── api/
    ├── auth/
    └── lib/
```

## Architecture: Chat flow

1. User sends message → `POST /api/chats` saves user message to `chats` table
2. Frontend calls `POST /api/chat` with full message history
3. Server loads character personality + visual template, calls **NVIDIA MiniMax M2.7**
4. If assistant response contains `[DRAW_PROMPT: ...]` tag:
   - Creates a pending `images` DB record (`status: 'pending'`)
   - Fires `processPendingImageGeneration` (background, non-blocking)
   - Strips `[DRAW_PROMPT]` tag from client-facing response
5. Background job: pending→processing → Agnes API → upload to Supabase Storage → completed/failed
6. **Supabase Realtime** channel pushes image status changes → client updates UI

## Env variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NVIDIA_API_KEY=
AGNES_API_KEY=
NODE_ENV=development
```

## Key patterns & gotchas

- **All pages are `'use client'`** — no React Server Components used anywhere.
- **Supabase client split**: 3 clients — server (`cookies()`), browser (`createBrowserClient`), admin (`service_role`).
- **Chats stored as JSONB** array of `ChatMessage` objects in the `chats.messages` column — not a separate messages table.
- **Image generation is async** — don't block the chat response. Uses Realtime for push-based UI updates.
- **Supabase Realtime** — subscribe to `postgres_changes` on `images` table for live image completion.
- **Four sequential SQL migrations** in `supabase/migrations/` — run manually via Supabase SQL Editor: `20260616_initial_schema.sql` → `20260616_add_body_params.sql` → `20260617_add_image_status.sql` → `20260618_enable_realtime.sql`.
- **Realtime must be enabled on `images` table** for chat-live image updates to work. Migration `20260618_enable_realtime.sql` does `alter publication supabase_realtime add table images;`. After running it, verify in Supabase Dashboard → Database → Replication that `images` appears under the `supabase_realtime` publication.
- **Storage bucket**: `companion-photos` (public), path: `{userId}/{characterId}/{timestamp}.png`.
- **RLS on all tables** (`characters`, `chats`, `images`) by `auth.uid() = user_id`.
- **Default dark theme** — `next-themes` with `defaultTheme="dark"`, `enableSystem={false}`.
- **Tailwind v4** uses CSS `@theme inline {}` for tokens, not `tailwind.config.ts`.
- **shadcn/ui** uses `base-nova` style (different from the more common `new-york`).
- **Only Google OAuth** for login (via Supabase).
- **Deployed on Vercel** (see `.vercel/repo.json`).
- **`@/*` path alias** maps to `./src/*`.

## Testing

```bash
npm run test          # Watch mode
npm run test:run      # Single run
```

- Vitest config in `vitest.config.ts` with `@/` alias, jsdom env, jest-dom setup.
- Test files co-located in `src/__tests__/` mirroring source structure.
