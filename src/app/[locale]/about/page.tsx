import type { Metadata } from 'next'
import { Link } from '@/navigation'
import { Logo } from '@/components/ui/Logo'
import { SocialLinks } from '@/components/shared/SocialLinks'
import { CONTACT_EMAIL } from '@/lib/public-company'
import { ArrowLeft, MapPin, Package, QrCode } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About Luggo',
  description: 'Get to know Luggo, a luggage storage platform connecting travellers with storage hubs in Sri Lanka.',
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-ocean-900">
      <nav aria-label="About page navigation" className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Luggo home"><Logo size="sm" /></Link>
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft size={18} /> Back to home</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
        <p className="text-ocean-600 text-sm font-bold uppercase tracking-widest mb-3">About Luggo</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">Explore Sri Lanka with your hands free.</h1>
        <p className="text-gray-600 text-lg leading-relaxed max-w-2xl">Luggo connects travellers with luggage storage hubs in Sri Lanka. Whether you are waiting to check in, heading out after checkout, or stopping between journeys, you can find a place to leave your bags while you explore.</p>
        <section className="mt-12" aria-labelledby="how-luggo-works">
          <h2 id="how-luggo-works" className="text-2xl font-bold mb-6">How Luggo works</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: MapPin, title: 'Find a hub', text: 'Browse available hubs and check opening hours, bag sizes, and prices before booking.' },
              { icon: Package, title: 'Drop off your bags', text: 'Show your booking at the hub. Staff record your bags and their security seals at check-in.' },
              { icon: QrCode, title: 'Collect when ready', text: 'Return within your booked time and the hub?s opening hours. Use your booking reference to collect your bags.' },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="bg-gray-50 border border-gray-100 rounded-2xl p-6"><Icon aria-hidden="true" className="text-ocean-600 mb-4" size={24} /><h3 className="font-bold text-lg mb-2">{title}</h3><p className="text-gray-600 text-sm leading-relaxed">{text}</p></div>)}
          </div>
        </section>
        <section className="mt-12" aria-labelledby="booking-details">
          <h2 id="booking-details" className="text-2xl font-bold mb-3">Know before you book</h2>
          <p className="text-gray-600 leading-relaxed">Availability and pricing depend on the hub and your storage duration. Review your booking details, the <Link href="/terms" className="text-ocean-600 underline font-semibold">Terms of Service</Link>, and our <Link href="/privacy" className="text-ocean-600 underline font-semibold">Privacy Policy</Link> before booking.</p>
          <Link href="/hubs" className="inline-flex min-h-11 items-center justify-center mt-6 rounded-xl bg-ocean-600 text-white px-6 py-3 font-bold">Find a storage hub</Link>
        </section>
        <section className="mt-12 pt-8 border-t border-gray-100" aria-labelledby="contact-luggo">
          <h2 id="contact-luggo" className="text-2xl font-bold mb-3">Get in touch</h2>
          <p className="text-gray-600 leading-relaxed">For questions about Luggo or working with us, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-ocean-600 underline font-semibold break-all">{CONTACT_EMAIL}</a>.</p>
          <div className="mt-6 text-ocean-600"><SocialLinks /></div>
        </section>
      </div>
    </main>
  )
}
