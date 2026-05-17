# Naaval Carrier App — Enterprise iOS Distribution Strategy

## Product position

Naaval Carrier App is a true enterprise mobile application for professional drivers.

It is not positioned as:

- a bookmark
- a website shortcut
- an "Add to Home Screen" workflow
- a Safari wrapper without proper enterprise packaging

The production target is a true iOS mobile application distributed privately when required by the client deployment model.

## Distribution targets

Recommended distribution paths:

1. Apple Business Manager Custom App
2. Unlisted App distribution
3. Apple enterprise / private app distribution only for internal employee-only deployments

These options support a professional rollout model better aligned with transport companies, managed devices, and enterprise onboarding.

Important distribution rule:

- If the app is distributed to drivers working for Naaval client companies, the preferred path is generally `Custom Apps` through Apple Business Manager or a controlled `Unlisted App` strategy.
- The Apple Developer Enterprise Program is reserved for proprietary internal-use apps distributed only to the employees of the organisation that owns that enterprise account.

## iPhone onboarding flow

Expected user flow:

1. The driver receives an installation link from Naaval or from the transport company admin.
2. The iPhone downloads the Carrier App through the selected private distribution method.
3. If the deployment uses an in-house enterprise build and iOS reports that the developer is not trusted, the driver opens:
   - `Settings > General > VPN & Device Management`
4. The driver selects the company developer profile.
5. The driver taps:
   - `Trust`, or
   - `Allow and Restart`
   depending on the iOS version and profile behavior.
6. The driver opens Naaval Carrier App and signs in with the account assigned in Naaval Ops.

References used for this onboarding logic:

- Apple support: `https://support.apple.com/fr-fr/118254`
- Apple Business Manager Custom Apps: `https://support.apple.com/en-euro/guide/apple-business-manager/axm58ba3112a/web`
- Apple Developer Custom Apps: `https://developer.apple.com/custom-apps/`

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

For production rollout, this experience should be packaged and delivered as a native iOS mobile application using one of the approved private distribution paths above.

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
