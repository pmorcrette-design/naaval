# Naaval Carrier App — Enterprise iOS Distribution Strategy

## Product position

Naaval Carrier App is a true enterprise mobile application for professional drivers.

It is not positioned as:

- a bookmark
- a website shortcut
- an "Add to Home Screen" workflow
- a Safari wrapper without proper enterprise packaging

The production target is a private / enterprise iOS application distributed outside the public App Store when required by the client deployment model.

## Distribution targets

Recommended distribution paths:

1. Apple Business Manager custom app
2. Apple enterprise / private app distribution

Both options support a professional rollout model better aligned with transport companies, managed devices, and enterprise onboarding.

## iPhone onboarding flow

Expected user flow:

1. The driver receives an installation link from Naaval or from the transport company admin.
2. The iPhone downloads the enterprise/private Carrier App build.
3. If iOS reports that the developer is not trusted, the driver opens:
   - `Settings > General > VPN & Device Management`
4. The driver selects the company developer profile.
5. The driver taps:
   - `Trust`, or
   - `Allow and Restart`
   depending on the iOS version and profile behavior.
6. The driver opens Naaval Carrier App and signs in with the account assigned in Naaval Ops.

Reference used for this onboarding logic:

- Apple support: `https://support.apple.com/fr-fr/118254`

## Functional scope

The app must cover:

- assigned missions
- route execution
- navigation handoff
- live statuses
- proof capture
- signature
- geolocation
- ops inbox
- driver account management

## Technical architecture target

Recommended application architecture:

- Native mobile shell for iOS enterprise distribution
- Shared business API with Naaval Ops
- Secure token-based authentication
- Local encrypted storage for session and queued actions
- Offline-first queue for:
  - status updates
  - proof uploads
  - geolocation events
  - inbox drafts
- Background-safe sync strategy
- Native integrations:
  - camera
  - location
  - file upload
  - notifications
  - secure storage

## Relationship with current workspace

The current `/carrier/` workspace is the functional product surface used to validate:

- driver workflow
- route execution logic
- proof model
- state transitions
- ops synchronization

For production enterprise rollout, this experience should be packaged and delivered as a native enterprise/private iOS application.

## UX direction

The Carrier App should feel comparable to modern professional logistics apps:

- minimal typing
- large touch areas
- clear stop-by-stop flows
- battery-conscious behavior
- legible planning
- low-friction proof capture
- visible sync state
- operational seriousness over consumer-style gimmicks

## Admin/back-office message

The following wording should be reused in onboarding and admin surfaces:

> Naaval Carrier App est une véritable application mobile d’entreprise. Ce n’est pas un raccourci web. Sur iPhone, il peut être nécessaire d’approuver le profil développeur dans les réglages avant de pouvoir ouvrir l’application.
