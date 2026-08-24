# Moving the database to a hosted MongoDB

The app reads its database from one place — `MONGO_URI` in `backend/.env`. Local
and hosted differ by that line only, so switching is a one-line change and a
restart, and switching back is the same.

Nothing here needs `mongodump`/`mongorestore` installed.

## 1. Create the cluster (Atlas free tier)

MongoDB Atlas' M0 tier is free, needs no card, and is more than enough for this
app's data volume.

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> and verify the email.
2. **Create a cluster** → **M0 / Free**. Pick the region closest to you
   (`eu-central-1` Frankfurt or `eu-west-1` Ireland from Switzerland).
   It takes 1–3 minutes to provision.
3. **Database Access** → **Add New Database User**
   - Authentication: Password
   - Built-in role: **Read and write to any database**
   - Use the "Autogenerate Secure Password" button and copy the password
     somewhere safe — Atlas will not show it again.
   - Avoid `@ : / ? # %` in a hand-written password; those are URI delimiters
     and have to be percent-encoded if they appear.
4. **Network Access** → **Add IP Address**
   - "Add Current IP Address" for your own machine.
   - A cluster that will be reached from a deployed server needs that server's
     IP too. `0.0.0.0/0` (anywhere) works but means the only thing between the
     internet and the database is the password — fine for a demo, not for real
     client data.
5. **Database** → **Connect** → **Drivers** → **Node.js**, and copy the string.
   It looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Replace `<password>` with the real one, and insert the database name before
   the `?` so the app does not land in `test`:

   ```
   mongodb+srv://appuser:REALPASSWORD@cluster0.xxxxx.mongodb.net/onboarding-app?retryWrites=true&w=majority
   ```

## 2. Check it before trusting it

```bash
cd backend
npm run check-db -- "mongodb+srv://appuser:REALPASSWORD@cluster0.xxxxx.mongodb.net/onboarding-app"
```

Confirms the URI connects, says which database and host it reached, lists the
collections, and proves the user can actually write. It names the likely cause
on failure — the usual one is Network Access not listing your IP.

## 3. Copy the existing data across

```bash
npm run migrate-to-host -- --to "<the same URI>" --dry-run   # see what would move
npm run migrate-to-host -- --to "<the same URI>"             # do it
```

Copies every collection and its indexes, then verifies by comparing counts on
both sides. The unique indexes matter and are carried over: `email + role` on
users (one account per email per role category) and `clientId` on clients.

It refuses to write into a database that already holds data unless you pass
`--force`. Your local database is only read, never modified.

## 4. Point the app at it

In `backend/.env`:

```
MONGO_URI=mongodb+srv://appuser:REALPASSWORD@cluster0.xxxxx.mongodb.net/onboarding-app?retryWrites=true&w=majority
```

Restart the server. Keep the old line commented out just above it — that is the
whole rollback.

## If the cluster is reachable from the internet

`.env` is gitignored, but a hosted database changes what a leak costs. Before
anything real goes in:

- **Generate a fresh `JWT_SECRET`.** The dev one signs every session token.
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```
- **Set `NODE_ENV=production`** — turns on HSTS, secure cookies and the strict
  rate limits, and makes the server refuse to start on a weak `JWT_SECRET`.
- **Set `ALLOWED_ORIGINS`** to the app's real URL. Blank means localhost only,
  which is right in development and wrong in production.
- **Keep `ALLOW_DATABASE_RESET=false`.** `npm run reset-db` wipes the database;
  the server refuses to start if this is true in production.
- **Rotate the dev logins.** `backend/DEV_LOGINS.md` holds working credentials
  for the RM and Compliance portals. They are fine against a local database and
  are not fine against a hosted one.

Atlas free tier has no automated backups. `npm run migrate-to-host` runs in the
other direction too — hosted back down to a local database — which is the
cheapest snapshot available:

```bash
npm run migrate-to-host -- --from "<hosted URI>" --to "mongodb://localhost:27017/onboarding-app-backup"
```
