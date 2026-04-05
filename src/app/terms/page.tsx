import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-1 text-gray-500 hover:text-ocean-900 text-sm font-bold transition-colors">
            <ChevronLeft size={18} /> Back
          </Link>
          <Logo size="sm" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-ocean">
        <h1 className="text-3xl font-extrabold text-ocean-900 mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Luggo ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.',
          },
          {
            title: '2. Service Description',
            body: 'Luggo provides a platform for booking short-term luggage storage at partner hubs across Sri Lanka. We act as an intermediary between customers and hub operators.',
          },
          {
            title: '3. Bookings & Payments',
            body: 'All bookings are subject to availability. Payment is processed securely via PayHere. Prices are quoted in Sri Lankan Rupees (LKR) and are inclusive of all applicable taxes.',
          },
          {
            title: '4. Cancellations & Refunds',
            body: 'Cancellations made before check-in are eligible for a full refund within 3–5 business days. No refunds are available after bags have been checked in.',
          },
          {
            title: '5. Liability',
            body: 'Luggo takes reasonable measures to ensure the safety of stored items. However, we are not liable for loss or damage to items exceeding LKR 50,000 in value unless separately declared and insured.',
          },
          {
            title: '6. User Responsibilities',
            body: 'You are responsible for ensuring your items comply with applicable laws. Prohibited items include weapons, controlled substances, perishable goods, and hazardous materials.',
          },
          {
            title: '7. Changes to Terms',
            body: 'We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the revised terms.',
          },
          {
            title: '8. Contact',
            body: 'For questions about these terms, please email brayn.kanth5@gmail.com.',
          },
        ].map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-lg font-extrabold text-ocean-900 mb-2">{section.title}</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
