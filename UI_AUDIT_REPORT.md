# UI audit and fixes

This audit reviewed the customer, staff, and admin shells, navigation, authentication and booking forms, dialogs, notification controls, hub browsing, shared inputs/buttons, and the admin booking table. It was a source and rendered-markup audit: no connected browser was available for screenshots or visual interaction testing.

## Changes

- Enabled browser zoom instead of locking the viewport to scale 1.
- Added visible focus indicators, skip links for customer/admin content, reduced-motion support, and mobile input sizing to avoid unwanted focus zoom.
- Fixed localized authentication pages showing the customer sidebar and bottom navigation. Login, forgot-password, and reset-password now use the same locale-aware route checks.
- Added missing Tailwind `brand.light` and `4.5` spacing definitions, restoring staff accent colors and large-button padding.
- Improved contrast in default action buttons, navigation labels, form messages, and notification controls; enlarged shared buttons and icon controls to 44px targets.
- Shared inputs now generate IDs when needed, connect their labels and help/errors, expose validation state, and keep password visibility toggles keyboard reachable.
- Replaced fragile separate OTP boxes in login and checkout with one named field supporting full-code paste and one-time-code autofill. Editing/deleting digits no longer shifts them between boxes.
- Associated labels with login/checkout fields, profile fields, pricing inputs, and the seal-dispute textarea.
- Added a shared native dialog for login prompts, extensions, and admin mobile navigation. Native modal behavior provides keyboard focus containment, Escape handling, and focus restoration. Dialog contents scroll on short screens and appear above fixed action bars.
- Reworked the booking action bar so price and action stack on narrow screens; long action text can wrap; desktop actions no longer cover the customer sidebar. Added content clearance and visible focus for custom checkboxes.
- Install prompts now sit above mobile navigation instead of covering it. Dismiss controls are named and keyboard reachable; unavailable storage and dismissed/failed install attempts are handled.
- Aligned navigation locale prefixes with middleware so English links avoid unnecessary redirects.
- Preserved selected locales in UI links and router navigation. Desktop customers also have a Hubs navigation item.
- Added active-page semantics to customer, staff, and admin navigation; staff layout padding includes the device safe area.
- Replaced the custom language dropdown with a labeled native selector usable by keyboard and assistive technology. Language changes retain query parameters.
- Fixed the white notification bell disappearing against the light dashboard header. Panels render outside the sticky header to avoid clipping/incorrect fixed positioning from its backdrop filter.
- Notification panels fit narrow screens, scroll within the viewport, expose open/unread state, handle Escape, and show controls on touch devices. Failed updates show an error instead of silently doing nothing.
- Admin booking references are real links instead of mouse-only row click handlers. Tables retain horizontal scrolling and readable column widths; booking times display in Sri Lanka time.
- Hub view controls expose selected state; location requests show useful failures instead of remaining stuck. Map links preserve the locale.
- Removed links wrapping disabled buttons on full hubs; a full hub now has a disabled status rather than an active link.
- Bag selector rows can wrap on narrow screens and increment/decrement buttons have readable names and larger targets.

## Verification

`npm test`: 15 passing tests, including rendered-label/error associations, generated IDs, keyboard-reachable password controls, full-code OTP markup, and disabled/busy loading buttons.

`npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed. Production-server checks (`node tests/ui-smoke.cjs` and `node tests/smoke.cjs`) passed, verifying English/Sinhala/Tamil authentication layouts, localized links, viewport zoom settings, generated dialog/accent/reduced-motion styles, and basic server behavior. These checks do not replace device/browser verification of layout, focus behavior, touch interactions, contrast throughout every screen, or authenticated staff/admin flows.

## Remaining visual verification

Check at 320px, 390px, 768px and desktop widths, with 200% zoom, keyboard-only navigation, reduced motion, mobile safe areas, and the virtual keyboard open. Verify sign-in and extension dialogs, admin menu focus restoration, notification scrolling, checkout controls, and long translated text using authenticated test accounts.
