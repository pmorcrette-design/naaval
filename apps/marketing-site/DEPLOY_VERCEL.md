# Deploy `naaval.eu` on Vercel

This landing page lives in:

- `/Users/pierre/Documents/New project/apps/marketing-site`

The operations app lives separately in:

- `/Users/pierre/Documents/New project/apps/ops-web`

## Goal

- `https://naaval.eu` -> public landing page
- `https://ops.naaval.eu` -> ops dashboard

## 1. Push the latest code to GitHub

From the repo root:

```bash
cd "/Users/pierre/Documents/New project"
git status
git add apps/marketing-site
git commit -m "Update Naaval landing page"
git push origin main
```

## 2. Create a dedicated Vercel project for the landing page

In Vercel:

1. Click `Add New... > Project`
2. Import the GitHub repository `pmorcrette-design/naaval`
3. Set `Root Directory` to `apps/marketing-site`
4. Framework preset: `Other`
5. Leave `Install Command`, `Build Command`, and `Output Directory` empty
6. Deploy

If an old Vercel project still points to the wrong root directory, the cleanest fix is to create a fresh project for the landing page instead of trying to rescue a misconfigured one.

## 3. Attach the custom domain `naaval.eu`

In the landing page Vercel project:

1. Open `Settings > Domains`
2. Add `naaval.eu`
3. Add `www.naaval.eu` too if you want both versions

Vercel will show the exact DNS records to copy into Hostinger.

## 4. Configure DNS in Hostinger

For the apex domain:

- add the `A` record requested by Vercel for `@`

For `www`:

- add the `CNAME` record requested by Vercel

Only keep one active record set for the same hostname to avoid conflicts.

## 5. Verify the live site

Once DNS is propagated:

- open `https://naaval.eu`
- confirm the public landing appears
- switch between `FR` and `EN`
- click `Ops Login` and confirm it points to `https://ops.naaval.eu`

## 6. Redeploy after future edits

Any future update follows the same flow:

```bash
cd "/Users/pierre/Documents/New project"
git status
git add apps/marketing-site
git commit -m "Update landing copy"
git push origin main
```

If the Vercel project is connected to GitHub, the deployment starts automatically after each push.
