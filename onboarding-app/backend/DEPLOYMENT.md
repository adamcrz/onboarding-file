# Putting this online for a small team

Target: three people reach the app from their own PCs, from anywhere, whether
or not your machine is on. One Render web service, one MongoDB Atlas cluster.

The app is a single Node process that serves both the API and the frontend, so
there is one service to deploy, not two. (This is why Netlify does not work for
it — Netlify serves static files and cannot run a long-lived server.)

Roughly 45 minutes end to end. Render's `starter` instance is about $7/month;
see "Why not the free tier" at the bottom.

---

## 1. Database — MongoDB Atlas

Follow [HOSTED_DATABASE.md](HOSTED_DATABASE.md) to create the cluster, the
database user and the connection string. Put the cluster in the **same region**
you pick for Render (the blueprint uses Frankfurt) — every page load makes
several database round trips, and a cluster on another continent is felt.

Under **Network Access**, Render's outbound addresses are not fixed on the
starter plan, so the access list has to allow `0.0.0.0/0`. The database password
is then the only thing protecting the data, so make it a long generated one.

Check the string works before going further:

```bash
cd onboarding-app/backend
npm run check-db -- "mongodb+srv://appuser:PASSWORD@cluster0.xxxxx.mongodb.net/onboarding-app"
```

Then copy your current local data up:

```bash
npm run migrate-to-host -- --to "<that same URI>"
```

## 2. Push the repo

Render deploys from GitHub. The remote already exists
(`github.com/adamcrz/onboarding-file`), so commit and push — including
`render.yaml` at the repo root, which is what Render reads.

Confirm `backend/.env` is **not** in the push. It is gitignored, and it holds
the database credentials and the token signing key.

## 3. Create the service

1. In Render: **New → Blueprint**, choose the repository.
2. It reads `render.yaml` and proposes one web service with a 1GB disk.
3. It will prompt for the four values marked `sync: false`:

   | Variable | Value |
   |---|---|
   | `MONGO_URI` | the Atlas string from step 1 |
   | `JWT_SECRET` | generate a **new** one, see below |
   | `ALLOWED_ORIGINS` | leave blank — see note below |
   | `FRONTEND_URL` | leave blank for now |

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   Do not reuse the development `JWT_SECRET`. It signs every session token, and
   the server refuses to start in production if it is weak or missing.

4. Deploy. When it finishes you get a URL like
   `https://onboarding-app.onrender.com`.
5. Set `FRONTEND_URL` to exactly that URL (no trailing slash) and redeploy.
   It is what client invitation emails link to; left blank they point at
   localhost, so an invited client gets a dead link.

   `ALLOWED_ORIGINS` can stay blank. The server serves the frontend and the API
   from one origin, and same-origin requests are always accepted regardless of
   this setting — so a blank value cannot lock you out of your own login form.
   Set it only if something on *another* domain ever needs to call this API.

Render's health check hits `/api/health`, so a container that cannot reach
Atlas fails the deploy instead of serving a broken app.

## 4. Create the three accounts

Production **does not** seed the `@demo.com` accounts — their shared password
is published in this repository, and on a public URL that is an open door to
Compliance. Nothing can log in until you create real accounts.

Run this from your own machine, pointed at Atlas:

```bash
cd onboarding-app/backend

npm run create-account -- --uri "<Atlas URI>" \
  --name "Adam Croz" --email adam@firm.com \
  --password "<generated>" --role rm --rmCode ACR

npm run create-account -- --uri "<Atlas URI>" \
  --name "..." --email ... --password "<generated>" --role compliance

npm run create-account -- --uri "<Atlas URI>" \
  --name "..." --email ... --password "<generated>" --role rm --rmCode XYZ
```

Notes that matter:

- **Every RM needs a distinct `--rmCode`.** It is what scopes an RM to their own
  clients; two RMs sharing a code see each other's mandates.
- Accounts are unique per email **per role**, not globally — the same person can
  hold an RM and a Compliance login on one address.
- Give each person their own account. Three people sharing one login makes the
  audit trail say the same name for every action.

## 5. Check it

```bash
curl https://<your-app>.onrender.com/api/health     # {"status":"ok"}
```

Then in a browser: sign in, upload a document, **redeploy**, and confirm the
document is still there. That last step is the one that proves the disk is
mounted — it is the failure that would otherwise show up weeks later.

---

## Why not the free tier

Two reasons, and the first is the serious one.

**Uploads would not survive.** Signed contracts and client documents are written
to the filesystem. Free instances have no persistent disk, so every deploy and
every restart silently destroys them — the database still lists the documents,
and the files are gone. `render.yaml` mounts a disk at `/var/data/uploads` and
points `UPLOADS_DIR` at it.

**Free instances sleep** after ~15 minutes idle and take up to a minute to wake.

## Running costs

| | |
|---|---|
| Render starter + 1GB disk | ~$7/month |
| Atlas M0 | free |

## Things worth knowing

- **Atlas M0 has no backups.** `npm run migrate-to-host` runs downward too:
  `--from "<Atlas URI>" --to "mongodb://localhost:27017/onboarding-app-backup"`.
  Worth doing before anything irreversible.
- **Rotate `backend/DEV_LOGINS.md`.** Those credentials work. They are fine
  against a laptop database and not fine against a public one.
- **`DOCUMENT_AUTO_VERIFY` stays `false`.** Turning automatic contract checking
  on requires Chromium in the image (~400MB, plus system libraries). The
  blueprint sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` to keep the build lean;
  reverse both together if you ever enable it.
- **Logs** are under the service's *Logs* tab in Render. Startup refusals
  ("Refusing to start in production") print the exact missing variable.
- **Rolling back** is one line: keep `MONGO_URI` in your local `.env` pointing
  at localhost and the local setup keeps working unchanged, whatever the
  deployed instance is doing.
