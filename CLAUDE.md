# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite, port 3000)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # TypeScript type-check (no emit)
npm run clean        # Remove dist/
```

No test framework is configured. Files named `test-*.ts` are ad-hoc scripts, not a test suite.

## Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=
```

The Supabase database must be initialized using `supabase_schema.sql` before first use.

## Architecture

### Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** Google Gemini API (`@google/genai`) — imported but not yet wired to UI
- **Drag & drop:** `@hello-pangea/dnd` (Kanban board)
- **Exports:** `xlsx` (Excel), `mammoth` (Word doc parsing)

### Authentication & Roles
- Supabase Auth with email/password; usernames are converted to `{username}@sistema.local`
- `AuthContext` (`src/contexts/AuthContext.tsx`) provides `useAuth()` — exposes `user`, `profile`, `loading`, `signIn`, `signUp`, `signOut`
- Two roles in `profiles.role`: `manager` (full access) and `employee` (sees only own demands)
- Supabase Row-Level Security enforces these constraints at the database level

### Data Model (key tables)
- **profiles** — auto-created on signup via DB trigger; stores `name` and `role`
- **demands** — the core entity: title, status (`A Fazer` / `Em Andamento` / `Concluído`), priority, SLA date, assignee, checklist items (JSONB), attachments
- **time_entries** — timesheet entries linked to demands or entered manually
- **daily_alignments** — standup notes (partially implemented)

Overtime entries have their own table with `type` (weekday/weekend/holiday) and payment tracking.

SQL migration files (`fix-*.sql`, `update_schema.sql`) in the root are applied manually in Supabase SQL editor.

### Routing & Pages
Routes are defined in `src/App.tsx`. Protected routes redirect to `/login` if unauthenticated.

| Path | Page | Description |
|---|---|---|
| `/` | `Dashboard.tsx` | Kanban board with filters, drag-and-drop, demand CRUD |
| `/timesheet` | `Timesheet.tsx` | Time entry logging + Excel export |
| `/overtime` | `Overtime.tsx` | Overtime tracking + Excel export |
| `/login` | `Login.tsx` | Sign in / Sign up |

### Component Patterns
- Pages fetch data directly via `supabaseClient` (no global state library)
- Modals (`DemandModal.tsx`, `DemandDetailsModal.tsx`) are large self-contained components handling their own CRUD
- After a modal closes successfully, the parent page re-fetches its data
- Path alias `@/*` resolves to the project root (configured in both `tsconfig.json` and `vite.config.ts`)

### Styling
- Dark theme throughout: background `#0A0A0A`, panels `#111111`, accent indigo-500
- All styling is Tailwind utility classes inline; no separate CSS modules
- Date inputs require `style={{ colorScheme: 'dark' }}` to match the dark theme

### Gemini Integration
`VITE_GEMINI_API_KEY` is exposed to the client via `vite.config.ts`. The AI breakdown feature is planned but not yet connected to the UI — the package is installed and ready.
