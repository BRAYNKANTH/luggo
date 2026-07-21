import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Luggo Terms of Service — governed by the laws of Sri Lanka.',
}

// ── Section helpers ───────────────────────────────────────────────────────────

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-base font-extrabold text-ocean-900 mt-10 mb-3 scroll-mt-20">
      {children}
    </h2>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-ocean-900 mt-5 mb-1.5">{children}</h3>
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-600 text-sm leading-relaxed mb-3">{children}</p>
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-gray-600 text-sm leading-relaxed mb-3">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

// ── Table of Contents ─────────────────────────────────────────────────────────

const TOC_ITEMS = [
  { id: 'our-role',          label: '1. Our Role' },
  { id: 'account',           label: '2. Account Registration' },
  { id: 'prohibited',        label: '3. Prohibited Items' },
  { id: 'payments',          label: '4. Payments' },
  { id: 'protection',        label: '5. Luggage Protection' },
  { id: 'reviews',           label: '6. Reviews' },
  { id: 'storage',           label: '7. Storage Services' },
  { id: 'lockers',           label: '8. Locker Services' },
  { id: 'licenses',          label: '9. Licenses' },
  { id: 'content',           label: '10. Content' },
  { id: 'liability',         label: '11. Limitation of Liability' },
  { id: 'indemnification',   label: '12. Indemnification' },
  { id: 'termination',       label: '13. Termination' },
  { id: 'ip',                label: '14. Intellectual Property' },
  { id: 'miscellaneous',     label: '15. Miscellaneous' },
  { id: 'governing-law',     label: '16. Governing Law' },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1 text-gray-500 hover:text-ocean-900 text-sm font-bold transition-colors">
            <ChevronLeft size={18} /> Back
          </Link>
          <Logo size="sm" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <h1 className="text-3xl font-extrabold text-ocean-900 mb-1">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-2">Last Updated: April 6, 2026</p>

        <div className="bg-brand/5 border border-brand/15 rounded-2xl p-4 mb-8">
          <p className="text-sm text-gray-700 leading-relaxed">
            Welcome to Luggo! Please read these Terms of Service carefully before using the Luggo Platform.
            By accessing or using Luggo, you agree to be bound by these Terms. These Terms are governed by the
            laws of Sri Lanka. Your statutory rights under Sri Lankan consumer protection law are not affected.
            Questions? Contact us at{' '}
            <a href="mailto:support@luggo.lk" className="text-brand font-semibold hover:underline">support@luggo.lk</a>.
          </p>
        </div>

        {/* About Us */}
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 mb-8">
          <h2 className="text-sm font-extrabold text-ocean-900 mb-1.5">About Us</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Luggo (Private) Limited is a company incorporated in Sri Lanka under the Companies Act No. 7 of 2007.
            You can reach us at{' '}
            <a href="mailto:support@luggo.lk" className="text-brand font-semibold hover:underline">support@luggo.lk</a>
            {' '}or via the Luggo Platform.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="border border-gray-100 rounded-2xl p-5 mb-8">
          <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">Table of Contents</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {TOC_ITEMS.map(({ id, label }) => (
              <a key={id} href={`#${id}`}
                className="text-sm text-brand font-medium hover:underline py-0.5">
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Definitions */}
        <SectionHeading id="definitions">Definitions</SectionHeading>
        <div className="space-y-2 mb-6">
          {[
            ['"Booking"', 'A confirmed reservation made by a Customer for storage or related Services via the Luggo Platform.'],
            ['"Customer"', 'Any individual who uses or wishes to use the Luggo Platform to access Services.'],
            ['"Customer Property" / "Items"', 'Personal belongings or luggage owned or controlled by a Customer that are stored or handled in connection with the Services.'],
            ['"Locker"', 'An automated, secure storage unit accessed by Customers independently using digital access credentials, without an in-person handoff.'],
            ['"Luggo"', 'Luggo (Private) Limited (&quot;Luggo&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).'],
            ['"Luggo Platform"', "Luggo&apos;s websites, mobile applications, and any services through which Customers can find, book, and pay for Services."],
            ['"Partner Location" / "Location"', 'Any third-party or Luggo-managed facility that offers short-term storage space or Lockers via the Platform.'],
            ['"Prohibited Items"', 'Any items prohibited by applicable Sri Lankan law or by these Terms.'],
            ['"Services"', 'Short-term luggage and bag storage services (including Locker-based storage) facilitated through the Luggo Platform.'],
            ['"LKR"', 'Sri Lankan Rupee, the official currency of Sri Lanka.'],
          ].map(([term, def]) => (
            <div key={term} className="flex gap-2 text-sm leading-relaxed">
              <span className="font-bold text-ocean-900 shrink-0 min-w-[9rem]">{term}</span>
              <span className="text-gray-600">{def}</span>
            </div>
          ))}
        </div>

        {/* Section 1 */}
        <SectionHeading id="our-role">1. Our Role</SectionHeading>
        <SubHeading>1.1 The Luggo Platform</SubHeading>
        <Body>
          Luggo operates an online marketplace connecting Customers seeking short-term luggage storage with available
          storage spaces at Partner Locations and Luggo-managed facilities across Sri Lanka. Luggo may also directly
          provide storage services at certain locations.
        </Body>
        <SubHeading>1.2 Services Offered</SubHeading>
        <Body>Through the Luggo Platform, Customers can access:</Body>
        <BulletList items={[
          'Storage Service – Short-term storage of Customer Property at Partner Locations or Luggo-managed facilities.',
          'Locker Service – Self-service storage of Customer Property in automated lockers at select locations.',
          'Additional Services – From time to time, Luggo may offer additional services accompanied by relevant terms communicated through the Platform.',
        ]} />
        <SubHeading>1.3 Scope of These Terms</SubHeading>
        <Body>
          These Terms apply only to Services booked and completed exclusively through the Luggo Platform. Any services
          obtained directly from a Partner Location outside the Luggo Platform are governed by that location&apos;s own terms.
        </Body>
        <SubHeading>1.4 Independent Partner Locations</SubHeading>
        <Body>
          Where Luggo acts as a marketplace, Luggo does not own, control, or manage Partner Locations and is not a party
          to the contract between Customers and Partners. Luggo does not act as a payment processor, insurance provider,
          or broker on behalf of Partners.
        </Body>

        {/* Section 2 */}
        <SectionHeading id="account">2. Account Registration</SectionHeading>
        <Body>You must be at least 18 years of age to register for an account or use the Luggo Platform.</Body>
        <Body>By creating an account, you represent and warrant that: (a) you are at least 18 years old; (b) you have
          the legal capacity to enter into binding contracts under Sri Lankan law; (c) you are acting on your own behalf
          or have authority to act on behalf of a legal entity; (d) you have not previously been suspended or banned from
          the Luggo Platform; and (e) your use of the Platform will comply with all applicable laws of Sri Lanka.</Body>
        <Body>You must provide accurate, current, and complete information and keep your account up to date. You are solely
          responsible for maintaining the confidentiality of your account credentials. Notify us immediately at{' '}
          <a href="mailto:support@luggo.lk" className="text-brand font-semibold hover:underline">support@luggo.lk</a> if
          you suspect unauthorized access.</Body>

        {/* Section 3 */}
        <SectionHeading id="prohibited">3. Prohibited Items</SectionHeading>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
          <p className="text-xs font-extrabold uppercase tracking-wider text-red-500 mb-2">The following items may NOT be stored:</p>
          <BulletList items={[
            'Items whose possession or storage is illegal under the laws of Sri Lanka, including under the Poisons, Opium and Dangerous Drugs Ordinance and the Firearms Ordinance.',
            'Weapons, firearms, ammunition, explosives, and flammable or toxic materials.',
            'Live animals, perishable goods, and agricultural products.',
            'Illegal drugs or controlled substances.',
            'Cash, foreign currency, lottery tickets, securities, jewellery, precious metals and stones, antiques, irreplaceable or sentimental items, and other high-value valuables.',
            'Alcoholic beverages (except sealed, legally purchased quantities for personal use).',
            'Medical devices and prescription medications not belonging to the Customer.',
            'Immigration documents, passports, or national identity documents belonging to a third party.',
            'Any other items designated as prohibited by Luggo or a Partner Location.',
          ]} />
        </div>
        <Body>
          Luggo and Partner Locations reserve the right to inspect Customer Property (in the Customer&apos;s presence) and to
          refuse or remove any Prohibited Items. Items suspected of violating Sri Lankan law may be reported to the
          Sri Lanka Police or relevant authorities.
        </Body>
        <Body>
          Luggo and Partner Locations have no obligation to protect Prohibited Items against loss, theft, or damage.
        </Body>

        {/* Section 4 */}
        <SectionHeading id="payments">4. Payments</SectionHeading>
        <Body>
          Certain features and Services require payment of fees in Sri Lankan Rupees (LKR). You will have the opportunity
          to review and accept all applicable fees prior to completing a Booking.
        </Body>
        <Body>
          Payments are processed through third-party providers including local payment gateways such as PayHere.
          All payment processing complies with applicable Sri Lankan financial regulations and the Payment and Settlement
          Systems Act No. 28 of 2005.
        </Body>
        <Body>All payments must be made through the Luggo Platform. Do not make payments directly to Partner Locations.</Body>
        <Body>
          If Customer Property stored in a Locker is not retrieved within the designated timeframe, Luggo or the Partner
          Location may charge a Late Pick-Up Fee of LKR 3,000 (or equivalent) per Item.
        </Body>
        <Body>
          Luggo Credits, if issued, are not redeemable for cash and may be revoked, limited, or expired at Luggo&apos;s
          reasonable discretion.
        </Body>

        {/* Section 5 */}
        <SectionHeading id="protection">5. Luggage Protection</SectionHeading>
        <Body>
          Luggo may, at its sole discretion, provide compensation for loss, damage, or theft of Customer Property in
          connection with the Services. The Luggage Protection does not constitute a contract of insurance under the
          Regulation of Insurance Industry Act No. 43 of 2000.
        </Body>
        <Body>
          If eligible, Luggo may compensate the Customer for the depreciated value of lost, stolen, or damaged Customer
          Property up to <strong>LKR 300,000</strong> (approximately $1,000 USD) per Booking.
        </Body>
        <Body>The Luggage Protection does NOT apply to:</Body>
        <BulletList items={[
          'Services paid for outside the Luggo Platform or via unapproved payment methods.',
          'Customer Property stored outside of a Luggo Booking.',
          'Prohibited Items (as listed in Section 3).',
          'Fragile or improperly packed items, including electronics without protective cases, glassware, liquids, and artwork.',
          'Abandoned Property not retrieved by the end of the Booking period.',
        ]} />
        <Body>
          To submit a claim: notify Luggo at{' '}
          <a href="mailto:support@luggo.lk" className="text-brand font-semibold hover:underline">support@luggo.lk</a> within
          24 hours of the scheduled end of the Booking with photographs, a full description of the items, and supporting
          evidence (e.g., police report, receipts).
        </Body>

        {/* Section 6 */}
        <SectionHeading id="reviews">6. Reviews</SectionHeading>
        <Body>
          After using the Services, Customers may submit a review of their experience. Reviews must be honest, accurate,
          and free of discriminatory, offensive, or defamatory content, and must comply with applicable Sri Lankan law.
          Luggo reserves the right to remove reviews that violate these guidelines.
        </Body>

        {/* Section 7 */}
        <SectionHeading id="storage">7. Storage Services</SectionHeading>
        <Body>
          To use the Storage Service: (a) create a Booking through the Platform or scan the QR code at a participating
          location; (b) photograph each Item clearly at check-in; and (c) follow all instructions on the Platform.
        </Body>
        <Body>
          You are responsible for retrieving your Customer Property before the end of the Storage Period. Proof of
          ownership or authority to retrieve may be required.
        </Body>
        <SubHeading>Cancellations</SubHeading>
        <BulletList items={[
          'More than 1 hour before scheduled drop-off: Full refund to the original payment method or as Luggo Credits.',
          'Less than 1 hour before scheduled drop-off or within 1 hour after: Refund issued as Luggo Credits only.',
        ]} />

        {/* Section 8 */}
        <SectionHeading id="lockers">8. Locker Services</SectionHeading>
        <Body>
          The Locker Service allows Customers to store Property in automated, self-service lockers at select locations.
          Access credentials are provided via the Luggo Platform.
        </Body>
        <Body>
          Customers are responsible for correctly placing and securing their Property in Lockers and for retrieving their
          Property within the designated Booking window.
        </Body>
        <Body>
          Customers are solely responsible for any damage to Lockers caused by misuse, overfilling, tampering, or
          violation of these Terms. Locations with Lockers may be subject to CCTV surveillance in accordance with
          applicable Sri Lankan law.
        </Body>

        {/* Section 9 */}
        <SectionHeading id="licenses">9. Licenses</SectionHeading>
        <Body>
          Subject to your compliance with these Terms, Luggo grants you a limited, non-exclusive, non-transferable,
          revocable license to access and use the Luggo Platform for personal, non-commercial purposes.
        </Body>
        <Body>You may not: (a) reproduce or distribute any portion of the Platform; (b) modify or create derivative
          works; (c) circumvent any security mechanism; or (d) use the Platform in any way not expressly authorized,
          including the Computer Crimes Act No. 24 of 2007.</Body>

        {/* Section 10 */}
        <SectionHeading id="content">10. Content</SectionHeading>
        <Body>You retain ownership of any content you submit to the Luggo Platform (&quot;User Content&quot;), including photos,
          reviews, and messages.</Body>
        <Body>By submitting User Content, you grant Luggo a worldwide, non-exclusive, royalty-free, irrevocable license
          to host, store, display, reproduce, and distribute your User Content in connection with operating the Platform.</Body>

        {/* Section 11 */}
        <SectionHeading id="liability">11. Limitation of Liability</SectionHeading>
        <Body>
          To the fullest extent permitted by applicable Sri Lankan law, Luggo shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of the Platform or Services.
        </Body>
        <Body>
          Luggo&apos;s aggregate liability for all claims shall not exceed the greater of: (a) the total amount you paid to
          Luggo in the 12 months prior to the event; or (b) LKR 5,000. Nothing in this clause limits any statutory
          rights under Sri Lankan consumer protection law.
        </Body>

        {/* Section 12 */}
        <SectionHeading id="indemnification">12. Indemnification</SectionHeading>
        <Body>
          You agree to indemnify and hold harmless Luggo and its affiliates from any claims, damages, losses, and
          expenses (including reasonable legal fees) arising from: (a) your breach of these Terms; (b) your improper
          use of the Platform; (c) your violation of any applicable Sri Lankan law; or (d) any damage you cause to
          Lockers or Partner Location facilities.
        </Body>

        {/* Section 13 */}
        <SectionHeading id="termination">13. Term, Termination, and Suspension</SectionHeading>
        <Body>These Terms are effective from the date you first access the Luggo Platform and remain in effect until terminated.</Body>
        <Body>You may terminate your agreement with Luggo at any time by contacting{' '}
          <a href="mailto:support@luggo.lk" className="text-brand font-semibold hover:underline">support@luggo.lk</a>.</Body>
        <Body>
          Luggo may terminate your account: (a) for any reason with 30 days&apos; written notice; or (b) immediately if you
          materially breach these Terms, violate applicable Sri Lankan law, or pose a risk to Luggo, Partner Locations,
          or other users.
        </Body>

        {/* Section 14 */}
        <SectionHeading id="ip">14. Intellectual Property Rights</SectionHeading>
        <Body>
          All content, design, software, graphics, and other materials on the Luggo Platform are owned by Luggo or its
          licensors and are protected under the Intellectual Property Act No. 36 of 2003 of Sri Lanka and applicable
          international intellectual property laws. You may not reproduce, distribute, or use any Platform materials
          without Luggo&apos;s prior written consent.
        </Body>

        {/* Section 15 */}
        <SectionHeading id="miscellaneous">15. Miscellaneous</SectionHeading>
        <Body>
          <strong>Communications.</strong> By using the Luggo Platform, you consent to receive push notifications and
          email communications. You may opt out through your device settings or account preferences.
        </Body>
        <Body>
          <strong>Prohibited Conduct.</strong> You agree not to: (a) use the Platform for any unlawful purpose; (b)
          infringe any intellectual property rights; (c) circumvent security measures; (d) engage in fraudulent activity;
          (e) use automated tools to scrape data; (f) behave aggressively toward Luggo staff or Partner Location personnel;
          or (g) damage any Locker or Partner facility.
        </Body>
        <Body>
          <strong>Modifications.</strong> Luggo may modify these Terms at any time. Material changes will be communicated
          at least 30 days in advance via email or through the Platform.
        </Body>
        <Body>
          <strong>Privacy.</strong> Luggo collects, uses, and shares information as described in the{' '}
          <Link href="/privacy" className="text-brand font-semibold hover:underline">Luggo Privacy Policy</Link>.
          All personal data is handled in accordance with applicable Sri Lankan data protection laws.
        </Body>
        <Body>
          <strong>Governing Language.</strong> These Terms are provided in English. In the event of any dispute
          regarding interpretation, the English language version shall prevail.
        </Body>
        <Body>
          <strong>Severability.</strong> If any provision of these Terms is found unenforceable under Sri Lankan law,
          it will be modified to the minimum extent necessary, and the remaining provisions will remain in full force.
        </Body>

        {/* Section 16 */}
        <SectionHeading id="governing-law">16. Governing Law and Dispute Resolution</SectionHeading>
        <Body>
          These Terms are governed by and construed in accordance with the laws of the Democratic Socialist Republic
          of Sri Lanka.
        </Body>
        <Body>
          In the event of any dispute, the parties shall first attempt to resolve it amicably through good-faith
          negotiations. If unresolved within 30 days, either party may refer the matter to the Consumer Affairs
          Authority of Sri Lanka (CAA) or pursue resolution through the courts of Sri Lanka.
        </Body>
        <Body>
          The District Court of Colombo shall have non-exclusive jurisdiction over any legal proceedings. Your
          statutory rights under the Consumer Affairs Authority Act No. 9 of 2003 are not limited by these Terms.
        </Body>

        {/* Footer note */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            By using the Luggo Platform, you acknowledge that you have read, understood, and agree to be bound
            by these Terms of Service.
            <br />
            <span className="font-semibold text-ocean-900">Luggo (Private) Limited</span>
            {' · '}
            <a href="mailto:support@luggo.lk" className="text-brand hover:underline">support@luggo.lk</a>
            {' · Sri Lanka'}
          </p>
        </div>
      </div>
    </div>
  )
}
