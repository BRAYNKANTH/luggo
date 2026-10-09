# Bug fixes and verification

Changes cover booking creation, payment processing, phone authentication, password recovery, QR lookups, scheduled updates, middleware, and client refresh behavior.

## Deployment prerequisite

Apply `supabase/atomic_booking_payments_migration.sql` to a staging database after the existing production, security, and pricing migrations, and before deploying this application. The new booking and webhook code intentionally fails if its transaction functions are missing. This migration was prepared locally; it has not been applied to a live database.

The functions are executable only by `service_role`. Booking creation locks the hub while checking capacity and inserts the booking, bags, and payment together. Payment processing locks the payment and booking, checks the amount, and updates them in the same transaction. Repeated callbacks observe the paid row and cannot extend the booking twice. New extension orders preserve the originally quoted end time.

## Fixed issues

- Capacity reads previously saw only the requesting customer's bookings under RLS. The booking transaction counts all overlapping bags and serializes online booking creation per hub.
- Failed bag or payment inserts previously left partial bookings while returning success. The transaction rolls back all three inserts.
- Webhooks previously acknowledged database failures with HTTP 200, suppressing retries; they now return HTTP 500 on processing failures.
- Payment writes and booking transitions previously ran separately, creating incomplete updates and concurrency races.
- Legacy extension order parsing split UUIDs on hyphens. It now parses the full UUID and validates the duration.
- Extension callbacks recalculated the pickup time at payment completion instead of preserving the time used to quote the fee.
- Extensions rejected a valid zero fee when an existing daily cap covered the extra hours. These extensions now update without checkout.
- Extension durations accepted NaN, infinity, fractions, and unbounded values. They now require 1?168 whole hours.
- Extension UI presented its simple hourly estimate as an exact fee even when caps or overdue time changed checkout pricing. It now labels the estimate.
- Pending late-fee payment amounts could change while a checkout was in progress. Only an unchanged quote is reused.
- Pickup calculation ignored supervisor waivers. Pickup and payment creation now use the same database calculation.
- The late-fee API did not verify booking ownership before calling a security-definer function.
- Phone endpoints accepted malformed JSON and incorrect field types, and rate-limit keys differed for aliases of the same phone.
- Concurrent OTP verification could consume the same code twice. Verification now requires a successful conditional update before creating a session.
- A phone-only verification could confirm an arbitrary supplied email. Phone accounts now use a synthetic auth email and retain supplied email as unverified metadata.
- Phone lookup now recognizes existing local and international number formats and stops on database lookup errors.
- Missing SMS configuration returned success without sending a code; failed delivery left an unsent code blocking retries.
- Password reset links led to a profile page without a password form. A password reset page is now connected to recovery links.
- Staff UUID-prefix lookup used ILIKE on a UUID column; it now uses UUID bounds and rejects ambiguous references.
- Manual QR entry uppercased case-sensitive codes. Scanner lifecycle also now stops the camera in manual mode and cleans up asynchronous starts.
- Cron updates could overwrite a booking confirmed, extended, or completed after their initial read. Updates recheck the current state and cutoff.
- Pickup reminders included already overdue bookings, used server-local time, and could be sent twice concurrently. Claims now recheck status, end time and the unsent flag, and extension updates reset the reminder flag.
- Overstay alerts fired during the 15-minute grace period, and message promises were not awaited.
- Staff hostname rewrites bypassed middleware authorization and omitted the locale segment.
- Middleware login redirects discarded refreshed cookies; notification and reset-password routes now also require authentication.
- Service-worker scripts could be processed by locale/auth middleware. They are now excluded.
- Aggressive PWA navigation caching could retain personalized pages across sessions. Navigation prefetch caching is disabled.
- Client user loading could reject without handling a network failure; booking status state could remain stale after a booking/initial-status change.
- Walk-in price previews did not update when hub pricing changed.
- In-memory rate-limit records retained expired identities indefinitely; periodic expiration now removes them.

## Local checks

Verified locally: 10 regression tests pass, TypeScript passes, lint passes without warnings, and the production build passes. Server smoke checks cover public rendering, unauthorized booking access, malformed auth input, service-worker delivery, and staff-hostname redirects in English and Sinhala.

Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Regression tests include transaction-failure HTTP behavior and concurrent OTP consumption, in addition to pricing, reference parsing, validation, and signatures.

## Remaining verification

No browser was connected for visual testing. The new SQL functions require staging integration checks for capacity contention, callback replay, transaction rollback, and permissions. Local tests mock database failures and do not substitute for those checks. Real email/SMS delivery and payment settlement were not exercised. Online capacity locking does not serialize independent legacy walk-in inserts or extension writes; full hub-wide contention coverage needs database integration work. Notifications and sticker assignment remain best-effort after payment commit. This review cannot guarantee the absence of additional bugs.
