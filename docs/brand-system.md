# Brand System Notes

These notes are captured from the shared Figma screens so the product design stays consistent once we start building the web app and carrier app.

## Brand

- Name: `Naaval`
- Visual symbol: wheel / helm icon
- Brand feeling: reliable, urban, operational, modern, not luxury
- Product tone: delivery made simple, but with strong operational control underneath

## Core palette

Primary colors inferred from the mockups:

- `Naaval Green`: `#169873`
- `Deep Green`: `#0C5B4A`
- `Bright Coral`: `#FF3E91`
- `Canvas White`: `#F6F7F4`
- `Ink`: `#0E1111`
- `Soft Border`: `#D9DED9`

Suggested status colors:

- Delivered: `#39D16A`
- In Progress: `#F2E205`
- Upcoming: `#35AEEA`
- Emergency: `#FF5D5D`

## Typography direction

- Clean, bold sans-serif
- Strong contrast between large welcome headers and dense operations lists
- Avoid generic purple-heavy SaaS styling

## UI language

- Left rail navigation
- Large hero greeting / summary area
- Dense operational cards
- White surfaces with subtle shadows
- Green CTAs as the default action language
- Colored status chips with high contrast

## Frontend implementation hint

When we start `ops-web`, we should turn these into CSS custom properties first, then build:

- shell layout
- top summary banner
- order list cards
- status chip component
- route / order detail panel

