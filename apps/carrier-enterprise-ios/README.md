# Naaval Carrier App — Native iPhone Packaging

This workspace prepares **Naaval Carrier App** for real iPhone installation as an enterprise/private mobile application.

## What this workspace is for

This is the native packaging layer for the carrier experience.

It exists so Naaval can distribute the driver app as:

- an Apple Business Manager custom app, or
- an enterprise/private iOS application

It is **not** a bookmark flow, **not** a PWA, and **not** an “Add to Home Screen” shortcut.

## Current status

The functional driver workflow already lives in:

- `../carrier-app`

This workspace packages that product surface into a true iOS application shell.

## Scripts

- `npm run build:web`
  Copies the current carrier workspace into `./www` for native packaging.

- `npm run native:add:ios`
  Prepares the web bundle and creates the Capacitor iOS project.

- `npm run native:sync`
  Syncs the web bundle into the iOS project after UI changes.

- `npm run native:open:ios`
  Opens the Xcode project once iOS has been added.

## Requirements for a real installable iPhone build

To generate a real installable enterprise app, you still need:

1. Full Xcode installed on the Mac
2. An Apple Developer / Apple Business Manager setup
3. A valid signing identity and provisioning profile
4. Archive + signing + export to produce the `.ipa`
5. A hosted installation manifest if using OTA enterprise distribution

## Distribution model

Recommended production path:

1. Build and sign the iOS app from Xcode
2. Export the `.ipa`
3. Host the `.ipa` and `manifest.plist`
4. Share the enterprise installation link with drivers
5. Driver approves the developer profile on iPhone if required

Reference onboarding:

- `../carrier-app/install.html`
- `../carrier-app/ENTERPRISE_DISTRIBUTION.md`
- `./enterprise/manifest.plist.template`
- `./enterprise/exportOptions.plist.template`
