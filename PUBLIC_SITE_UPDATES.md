# Public site updates

- Added `/about` with a description of Luggo and its booking process, links to hubs and policies, and company contact details. Added desktop/mobile homepage navigation and footer links plus a sitemap entry.
- Replaced public Gmail addresses in the privacy policy and maintenance page with `info@luggo.lk`; privacy-policy links use `mailto:info@luggo.lk` so their target matches their label.
- Aligned the Terms with the existing LKR 40,000 limit used in the homepage and booking UI. Removed the inconsistent USD approximation, specified the per-booking limit in the FAQ, and centralized the displayed amount in `src/lib/utils/guarantee.ts`, including localized marketing text.
- Removed the hard-coded testimonials and unsupported 5-star badge. No invented replacement reviews were added.
- Added visible Facebook/Instagram links using the URLs already listed in the site's organization metadata.
- Prepared an optional verified LinkedIn company link on both the homepage footer and About page and in organization metadata. Set `NEXT_PUBLIC_LINKEDIN_URL` to `https://www.linkedin.com/company/<official-slug>/` and rebuild. The link stays hidden until a valid URL is configured.

## Still needed

The official LinkedIn URL has not been supplied or independently verified. No LinkedIn company page was created; creating it requires access to an authorized LinkedIn account. The LKR 40,000 choice follows the existing product-wide amount; the owner can change the shared setting if a different limit is intended.

## Verification

`npm run typecheck`, `npm run lint`, `npm test` (15 tests), `npm run build`, and `git diff --check` passed. Production-server rendered-page checks passed for English, Sinhala, and Tamil homepage/About/privacy/Terms routes, maintenance contacts, sitemap discovery, removed testimonials, and social links. Configured and invalid LinkedIn URL handling also passed. No connected browser was available for screenshot or interactive visual checks. Changes are local; nothing was deployed.
