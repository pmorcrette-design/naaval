# Carrier App

Naaval Carrier App is specified as a true enterprise mobile application for drivers.

Product intent:

- Native-feeling driver workspace for missions, proofs, planning, inbox, and account
- Distributed as a private / enterprise iOS application
- Connected directly to Naaval Ops and customer tracking flows
- Designed for field execution with large touch targets and minimal typing

Current functional scope:

- Login
- Missions
- Planning calendar
- Inbox with ops
- My Account
- Route execution modal
- Proof modal with photo, signature, and geolocation

Enterprise distribution target:

- The Carrier App must not be positioned as a shortcut, bookmark, or “Add to Home Screen” flow
- The intended production distribution is:
  - Apple Business Manager Custom App for customer fleets
  - Unlisted App distribution for controlled external access
  - Apple enterprise/private app distribution only for strictly internal employee-only deployments
- On iPhone, some installations may require validating the company developer profile from:
  - `Settings > General > VPN & Device Management`

Technical roadmap:

- Native iOS packaging for enterprise/private distribution
- Apple Business Manager packaging flow for client-owned fleets
- Auth linked to Naaval tenant / driver assignment
- Offline action queue and background-safe sync strategy
- Device camera, signature capture, geolocation, and proof uploads
- Modern logistics-grade UX for dispatch execution

Important wording rule:

- Always refer to Naaval Carrier App as an enterprise mobile application
- Never describe it as a shortcut, simple website icon, or only a PWA

Useful files:

- `/carrier/` preview workspace
- `/carrier/install` enterprise iPhone onboarding page
- `apps/carrier-app/ENTERPRISE_DISTRIBUTION.md` detailed strategy and implementation notes
