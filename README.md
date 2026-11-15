# Minto Media — website + dashboard

- **web/**: the website and the dashboard (React + Vite).
  - Public pages: `/`, `/work`, `/news`, `/news/:slug`, `/careers`, `/careers/:slug` (job details and the apply form).
  - Dashboard: `/admin`.
- **server/**: the API (Express + Postgres). Files go to Cloudflare R2.
- **api/index.ts**: the entry Vercel uses to run the API.

## Run it on your computer

You need Node 20+ and a Postgres database. A free Neon database works, or a local Postgres.

```bash
npm install
cp .env.example .env        # then fill DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:seed             # makes the tables, the first admin and sample content
npm run dev                 # API on :4000, site on http://localhost:5173
```

Without R2 settings, uploads are saved in `server/uploads` (for local testing only).

## Put it online (Vercel + Neon Postgres + Cloudflare R2)

### 1. Database
In Vercel open **Storage → Create → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL` (or `POSTGRES_URL`) for you.

### 2. Cloudflare R2
Create two buckets:
- `minto-media` for public images and videos.
- `minto-private` for CVs.

On `minto-media`, turn on public access, or better, connect a custom domain such as `media.mintomediaagency.com`.

Create an R2 API token with **Object Read & Write** on both buckets.

On `minto-media`, add a CORS rule so the browser can upload straight to R2:

```json
[{ "AllowedOrigins": ["https://mintomediaagency.com", "https://www.mintomediaagency.com", "http://localhost:5173"],
   "AllowedMethods": ["PUT", "GET"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
```

Add the same CORS rule to `minto-private` (CVs are uploaded with PUT too).

### 3. Vercel project
Import the repo. Vercel reads `vercel.json`: it builds `web/` and serves `/api/*` from `api/index.ts`.

Add these Environment Variables:
- `JWT_SECRET`: a long random text.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD`: used only by the seed.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- `R2_BUCKET=minto-media`, `R2_PRIVATE_BUCKET=minto-private`.
- `R2_PUBLIC_URL`: the public bucket URL or your custom domain, for example `https://media.mintomediaagency.com`.
- `NODE_ENV=production`.

### 4. First setup of the database
Run this once from your computer, with the production `DATABASE_URL` in `.env`:

```bash
npm run db:seed      # tables + first admin + sample content (safe to run again)
npm run db:content   # the real text from the client's document: 3 services, the Graphic Designer job, contact email + address (run ONCE: it overwrites those)
```

After each update that adds a new file in `server/migrations/`, run `npm run db:migrate` the same way.

### 5. Domain (GoDaddy)
1. In Vercel, open **Settings → Domains** and add `mintomediaagency.com` and `www.mintomediaagency.com`.
2. In GoDaddy **DNS**:
   - Set the `A` record for `@` to the IP Vercel shows (`76.76.21.21`).
   - Set a `CNAME` for `www` to `cname.vercel-dns.com`.
   - Remove the old parking or forwarding records.
3. Vercel adds the free HTTPS certificate on its own, usually within minutes. You keep the domain at GoDaddy.

## The dashboard (`/admin`)

Log in with the admin email and password. Every screen has English | العربية fields. Here is what you can change:

- **Hero video** is not in the dashboard: it is the file `web/public/hero.mp4` (optional first-frame picture `web/public/hero-poster.jpg`). Replace the file and deploy. Keep it around 8–10 MB, 1080p, H.264, no sound.
- **We support your success**: the images and short videos in that section.
- **Services**: the cards, their tags and colours.
- **Work**:
  - photos, videos and reels;
  - which ones show on the home page;
  - which one is the featured card.
- **Client logos**: one logo for light mode and one for dark mode. If the dark logo is empty, the light logo is turned white.
- **Testimonials**: quotes and an optional video. You also choose what phones show: cards or video.
- **Our story**: the year and event of each stop.
- **News**: news, announcements and events, each with an image, title, summary and text.
- **Contact & social**: phone, email, WhatsApp, address and social links (shown in the menu and footer).
- **Jobs**:
  - the job details, built from sections (text, bullets, checks, cards);
  - "Your experience" questions: short answer, long answer, one choice or several choices.
  - "About you" is the same for every job: name, email, phone, city, CV (required), and portfolio and LinkedIn (optional).
- **Applications**: read the answers, download the CV, set the status and keep notes.
- **Subscribers**: the newsletter emails, with CSV export.
- **Settings**: your account, password and other admins.

## Phone alerts (ntfy)

Dashboard → **Phone alerts**. One topic for job applications and one for contact-form inquiries. Each person installs the free ntfy app and subscribes to the topic names. Topic names work like passwords on the public ntfy.sh server, so use the “Make a private name” button. Alerts contain only a name and a link to the dashboard.

## Newsletter email (SMTP)

Needed only for the newsletter. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` and `SITE_URL` (see `.env.example`). Without SMTP_HOST the emails are only printed in the server console.

## Images and videos

Pictures (JPG, PNG, WebP) are shrunk in the browser when uploaded from the dashboard (max 2400 px, saved as WebP). Videos are not changed, so compress them before uploading, for example with HandBrake or:

```bash
ffmpeg -i input.mp4 -vf "scale='min(1920,iw)':-2" -c:v libx264 -crf 26 -preset slow -an -movflags +faststart output.mp4
```

In Cloudflare, add a Cache Rule for the media domain so browsers keep the files for a long time (the file names never repeat).
