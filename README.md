# GITC 2026 — Registration Site

Free registration site for GITC — Get Into Tech Conference 2.0, at LASU, in
partnership with Zenith Bank. See [CLAUDE.md](CLAUDE.md) for the full project
brief and implementation notes (including the Firebase → Supabase migration
history, if you're curious why some older notes mention Firebase).

Stack: React + Vite, react-router-dom, Supabase (Postgres + Row Level
Security, Auth, Edge Functions), deployed on Vercel.

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New
   project**. Name it (e.g. `gitc-2026`), pick a region close to Lagos (West
   EU / Paris is closest currently offered), and set a database password —
   save it somewhere, you'll want it for step 3.
2. From **Project Settings → API**, copy the **Project URL**, the `anon`
   public key, and the `service_role` key (secret — never put this in
   `.env.local` or anywhere client-side, never commit it).
3. Install the Supabase CLI if you don't have it: `npm i -g supabase`, or
   just use `npx supabase ...` for every command below.

## 2. Push the schema

```bash
npx supabase link --project-ref <your-project-ref>   # the part of the URL before .supabase.co
npm run db:push                                        # applies supabase/migrations/
```

`link` needs a **personal access token**, not the project API keys —
generate one at
[supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
and either run `supabase login` first or pass
`SUPABASE_ACCESS_TOKEN=<token>` as an env var on the `link` command.

> **If `db push` can't connect** (this happened during development: the
> direct `db.<ref>.supabase.co` host is IPv6-only and wasn't reachable from
> that network, and the regional pooler rejected the connection for
> unresolved reasons) — paste the contents of each file in
> `supabase/migrations/`, **in order**, into the dashboard's **SQL Editor**
> and run them instead. Functionally identical; just does one fewer thing to
> debug if your network is being awkward about raw Postgres connections.

## 3. Deploy the Edge Functions

```bash
npm run functions:deploy
```

Also uses the personal access token above (via `supabase link`, or
`SUPABASE_ACCESS_TOKEN=<token>` on the command) — this one talks to
Supabase's Management API over plain HTTPS, so it works even if the SQL
connection in step 2 didn't.

If/when email sending is turned on (`emailEnabled` in admin settings), the
`send-ticket-email` function needs a **Database Webhook** pointed at it —
this can't be done from a migration file: **Database → Webhooks** in the
dashboard → new webhook → table `registrations`, event `INSERT`, target the
`send-ticket-email` function. Not needed while email stays off (the
function no-ops without it anyway).

## 4. Seed and grant yourself access

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  npm run seed                                   # creates settings/stats defaults, only if missing

# If you already have a Supabase Auth user for your email (e.g. you signed
# in once at /admin and got denied):
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  npm run set-role -- you@example.com admin

# If no account exists yet for that email, create one and grant the role in
# one step instead (you choose the password):
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  node scripts/seed-admin.js you@example.com '<a password>' admin
```

Same pattern with `staff` instead of `admin` for door staff accounts
(`/checkin`). Anyone granted a role needs to sign out and back in (or wait
for their session to refresh) before it takes effect.

## 5. Local development

Copy `.env.example` to `.env.local` and fill in the two public values from
step 1:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

```bash
npm install
npm run dev
```

This points the dev server straight at your real Supabase project — there's
no local emulator stack running here (Supabase's `supabase start` needs
Docker to spin up a full local Postgres+Auth+Functions stack; if you have
Docker, that's the better way to develop without touching the real database
at all — see [Supabase's local dev
docs](https://supabase.com/docs/guides/local-development)). Without Docker,
every `npm run dev` session talks to the real project, same as production.

## 6. Run the tests

Both suites run against a real Supabase project (again, no local emulator
available in this setup) — point them at a project you're OK writing
throwaway test rows into:

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon key> \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  npm run test:e2e    # registration flow: register -> DB -> ticket read-back

SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_ANON_KEY=<anon key> \
SUPABASE_SERVICE_ROLE_KEY=<service role key> \
  npm run test:rls    # what the public/staff/admin can and can't read or write
```

Both clean up their own test rows (registrations, test staff/admin users)
when they finish.

## 7. Deploy the front end to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket) and import it in
   [Vercel](https://vercel.com/new).
2. Framework preset: **Vite**. Build command `npm run build`, output
   directory `dist` (Vercel detects these automatically for a Vite
   project).
3. In the Vercel project's **Settings → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SITE_URL` — your real deployed URL, no trailing slash (e.g.
     `https://gitc2026.ng`). Used to build absolute `og:image`/`og:url` tags
     for link previews (WhatsApp, etc.) — without it they fall back to
     relative paths, which most scrapers handle fine but it's better to set
     this once you know the domain.
4. `vercel.json` at the repo root already has the SPA rewrite Vercel needs
   so client-side routes like `/register` or `/ticket/abc123` don't 404 on a
   hard refresh:

   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

5. Deploy. Every push to the production branch redeploys automatically.

## Project structure

See [CLAUDE.md](CLAUDE.md) for the full breakdown of `src/`, `supabase/`
(migrations + Edge Functions), and `scripts/`.
