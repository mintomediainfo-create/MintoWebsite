# CLAUDE.md — Minto Media website + dashboard

The owner develops on **Windows** (project in `G:\minto media\minto-site`) and talks in Egyptian Arabic.
Reply to him in Arabic and keep technical terms as they are. Keep answers short.

## First task: get it running locally on Windows

Go through these steps with the user. Check each one before you move to the next.

1. **Tools**
   - Run `node -v`. It must be 20 or newer. If not, ask him to install Node.js LTS from nodejs.org.
   - Run `psql --version`. If PostgreSQL is missing, ask him to install it from postgresql.org and to remember the `postgres` password. If psql is installed but not on PATH, it is usually in `C:\Program Files\PostgreSQL\<ver>\bin`.
2. **Database.** Create it once (it asks for the `postgres` password):
   ```bash
   psql -U postgres -c "CREATE USER minto WITH PASSWORD 'minto';" -c "CREATE DATABASE minto OWNER minto;"
   ```
3. **Packages.** In the project root run `npm install`.
4. **`.env`.** Copy `.env.example` to `.env` (`copy .env.example .env`) and set:
   ```
   DATABASE_URL=postgresql://minto:minto@localhost:5432/minto
   JWT_SECRET=<long random string>
   ADMIN_EMAIL=admin@minto.test
   ADMIN_PASSWORD=minto12345
   ```
   Leave all `R2_*` empty. Uploads then go to `server/uploads/` on disk, which is for dev only.
5. **Tables + first admin + sample content.** Run `npm run db:seed`. It is safe to run again.
6. **Run.** The root `npm run dev` uses `&`, which does NOT run both parts on Windows `cmd`. Use two terminals:
   - `npm run dev -w server` starts the API on http://localhost:4000.
   - `npm run dev -w web` starts the site on http://localhost:5173. Vite proxies `/api` and `/uploads` to :4000.
   - The dashboard is http://localhost:5173/admin. Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   - Optional fix: add `concurrently` and change the root `dev` script, only if the user agrees.
7. **Check.**
   - Run `curl http://localhost:4000/api/site`. It should return JSON.
   - Open the site and the admin.
   - Submit a test job application.

If something fails, read the error first; the usual causes are:
- Postgres service not running.
- Wrong `DATABASE_URL`.
- Port 4000 or 5173 already in use.

## Stack

npm workspaces:
- **server/**: Express 4 + TypeScript.
  - Database: `pg`, using plain SQL. No ORM; Prisma could not be installed.
  - zod, JWT in the httpOnly cookie `mm_admin`, bcryptjs.
  - Run with `tsx` 4.20+. Older tsx ran files as ESM and broke.
- **web/**: React 18 + Vite 5 + react-router 6 + TypeScript. No UI library; plain CSS.
- **api/index.ts**: the Vercel entry. It re-exports `server/src/app.ts`.
- **Hosting target:** Vercel, with Neon Postgres for the database and Cloudflare R2 for files. Deploy steps are in `README.md`.

## Map

```
server/migrations/*.sql       schema; each file runs once (tracked in _migrations). Add a NEW numbered file for changes, never edit 001.
server/src/env.ts             env vars (+ tiny .env loader: reads root .env)
server/src/db.ts              pg Pool; q() / one(); DATE → 'YYYY-MM-DD' string, bigint → number
server/src/migrate.ts         npm run db:migrate
server/src/seed.ts            npm run db:seed (admin + sample content, only fills empty tables)
server/src/resources.ts       content types the dashboard can edit + the columns it may write (whitelist)
server/src/routes/public.ts   /api/site, /api/work, /api/news, /api/jobs, apply + CV upload, subscribe
server/src/routes/admin.ts    /api/admin/* (requireAdmin): uploads, settings, generic CRUD /r/:res, applications, admins
server/src/routes/auth.ts     login (rate limited) / logout
server/src/lib/storage.ts     R2 signed PUT/GET; CVs (cvs/ keys) go to R2_PRIVATE_BUCKET; local disk fallback when R2 is not set
web/src/App.tsx               routes: / /work /news /news/:slug /careers /careers/:slug /admin/*
web/src/site/Shell.tsx        shared frame: theme/lang root, menu, header, footer, back-to-top, scroll reveals, Media
web/src/site/Home.tsx         home page (+ styles/home.css)
web/src/site/*Page.tsx        inner pages (+ styles/pages.css, site/pageBits.tsx)
web/src/site/strings.ts       fixed UI words EN/AR
web/src/lib/api.ts            api(), useApi(), uploadFile(), tr(), fmtDate()
web/src/lib/prefs.tsx         theme + language (localStorage mm-theme / mm-lang)
web/src/lib/transitions.ts    theme "zap" strings animation + language board animation
web/src/admin/*               dashboard (Admin.tsx layout/routes/guard, ui.tsx shared inputs, Resource.tsx generic list editor)
web/src/styles/               site.css (global), home.css, pages.css, admin.css (all .adm-*)
```

## Rules for changes

- **Bilingual content.** Every visible text field is JSON `{ "en": "...", "ar": "..." }`.
  - On the site, read it with `usePrefs().L(x)`.
  - In the admin, use the bilingual input from `admin/ui.tsx`.
- **New editable field:**
  1. Add a migration.
  2. Add the column to `resources.ts`, or the server ignores it.
  3. Add it to the admin form.
  4. Add it to the public query in `public.ts`.
  5. Render it on the site.
- **New settings group:** add the key to `SETTING_KEYS` in `admin.ts` and to the defaults in `public.ts`.
- **Theme animation.** Every direct child of `.mm-theme` (inside `SiteShell`) is a "band".
  - Render page sections as direct children.
  - Give bands with a `var(--bg2)` background the attribute `data-bg="bg2"`.
- **Styles.**
  - Use the theme CSS vars: `--bg --bg2 --card --line --line2 --fg --muted --muted2`.
  - Must work in light/dark and LTR/RTL. In RTL use `inset-inline-*` / `margin-inline-*`, and put `.mm-rtl` on arrows.
  - Phone rules go under `@media (max-width:760px)` with CLASS selectors. Never `[style*=...]`.
- **Animations.**
  - Respect `prefers-reduced-motion`.
  - Clean up every timer and listener in `useEffect`.
- **Uploads.** The browser uploads straight to storage with a signed URL. Never send big files through the API (Vercel limits the body size).
  - The dashboard shrinks every file before upload: pictures to WebP (`lib/compress.ts`), videos with ffmpeg.wasm (`lib/compressVideo.ts`, loaded only when a video is picked). Keep it that way.
- **Before you finish a change:**
  - Run `npx tsc -p server --noEmit` and `npx tsc -p web/tsconfig.json --noEmit`.
  - Run `npm run build`.

## Open items (from the client notes)

- Restyle the "We support your success" section (`function Intro` in `Home.tsx`) like BBDO's "We are" section. Waiting for a screenshot from the user.
- Real fonts, logos and texts from the client. Content goes in through the dashboard.
- Hero video: the dashboard page **Hero video** (`admin/HeroVideo.tsx`) uploads one, compresses it and makes the phone copy + posters (`settings.hero`). Empty = the built-in `web/public/hero.mp4`.
