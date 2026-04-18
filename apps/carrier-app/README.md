# Carrier App

Current prototype:

- Mobile-first web carrier workspace served on `/carrier/`
- iPhone install page served on `/carrier/install`
- Demo emails: `amina@naavalpartners.com` and `noah@naavalpartners.com`
- Google Sign-In available when `NAAVAL_GOOGLE_CLIENT_ID` is configured in `ops-config.js`

Current screens:

- Login
- Missions
- Planning calendar
- Inbox with ops
- My Account
- Route execution modal
- Proof modal with photo, signature, and geolocation

Current workflow:

- Open an assigned route
- Start route
- Open Waze to the next stop
- Mark arrival
- Submit pickup or delivery proof
- Chat with ops
- Update driver profile

Next native step:

- Expo / React Native implementation with offline queue and device camera APIs
