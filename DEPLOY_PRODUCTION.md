# Naaval Production Deployment

This project is split into two Vercel frontends and one backend that still needs a public runtime:

- `apps/marketing-site` -> public landing
- `apps/ops-web` -> ops dashboard and Naaval SaaS admin
- backend -> local `dev_server.py` today, must be deployed publicly later for full SaaS behavior

## Current public Vercel frontends

- Landing project: `marketing-site`
- Ops/Admin project: `ops-web`

Current working Vercel aliases:

- Landing: `https://marketing-site-ecru-ten.vercel.app`
- Ops/Admin: `https://ops-web-eta.vercel.app`

## Target production domains

- `https://naaval.eu` -> public landing
- `https://www.naaval.eu` -> public landing
- `https://ops.naaval.eu` -> ops dashboard
- `https://admin.naaval.eu` -> Naaval SaaS back-office

## Hostinger DNS records required

Add these records in Hostinger:

| Type | Host  | Value       | TTL  |
|------|-------|-------------|------|
| A    | @     | 76.76.21.21 | Auto |
| A    | www   | 76.76.21.21 | Auto |
| A    | ops   | 76.76.21.21 | Auto |
| A    | admin | 76.76.21.21 | Auto |

Once these records propagate, Vercel can issue certificates and the custom domains will become usable.

## Vercel project mapping

### Landing project

Root directory:

- `apps/marketing-site`

Domain mapping:

- `naaval.eu`
- `www.naaval.eu`

### Ops/Admin project

Root directory:

- `apps/ops-web`

Domain mapping:

- `ops.naaval.eu`
- `admin.naaval.eu`

Both `ops.naaval.eu` and `admin.naaval.eu` can point to the same `ops-web` project. Access is role-based in the app:

- `super_admin`
- `naaval_admin`
- `company_admin`
- `company_user`

## Backend requirement for full SaaS behavior

The frontend is now multi-tenant aware, but full production signup/login and tenant operations require a public backend URL.

Recommended target:

- `https://api.naaval.eu`

When the backend is deployed publicly, set:

### Ops runtime config

File:

- `apps/ops-web/ops-config.js`

Expected value:

```js
window.NAAVAL_API_BASE_URL = "https://api.naaval.eu";
```

### Landing runtime config

File:

- `apps/marketing-site/marketing-config.js`

Expected values:

```js
window.NAAVAL_MARKETING_API_BASE_URL = "https://api.naaval.eu";
window.NAAVAL_OPS_BASE_URL = "https://ops.naaval.eu/";
```

## Deploy commands

### Landing

```bash
cd "/Users/pierre/Documents/New project/apps/marketing-site"
npx vercel --prod --yes
```

### Ops/Admin

```bash
cd "/Users/pierre/Documents/New project/apps/ops-web"
npx vercel --prod --yes
```

## Alias commands after DNS is ready

### Landing

```bash
npx vercel alias set <landing-deployment-url> naaval.eu
npx vercel alias set <landing-deployment-url> www.naaval.eu
```

### Ops/Admin

```bash
npx vercel alias set <ops-deployment-url> ops.naaval.eu
npx vercel alias set <ops-deployment-url> admin.naaval.eu
```

## Current limitation

As long as the backend is not public:

- the landing can be live
- the ops/admin frontend can be live
- but self-serve signup, login, tenant creation, and tenant-scoped business operations are only fully validated in local mode

## Local verification URL

- `http://127.0.0.1:8787`
