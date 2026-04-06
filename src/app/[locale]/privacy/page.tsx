import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ChevronLeft } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
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

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-ocean-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Last updated: April 2026</p>

        {[
          {
            title: 'Information We Collect',
            body: 'We collect information you provide when creating an account (name, email, phone number) and information generated through your use of the Service (booking history, location data if permitted).',
          },
          {
            title: 'How We Use Your Information',
            body: 'We use your information to process bookings, send booking confirmations and reminders via email and SMS, provide customer support, and improve our services.',
          },
          {
            title: 'SMS & Email Communications',
            body: 'By creating an account, you consent to receive transactional SMS messages (booking confirmations, pickup reminders) and emails from Luggo. You may opt out of marketing communications at any time.',
          },
          {
            title: 'Payment Information',
            body: 'Payment processing is handled by PayHere. Luggo does not store your card details. Please review PayHere\'s privacy policy for information on how payment data is handled.',
          },
          {
            title: 'Data Sharing',
            body: 'We do not sell your personal data. We share data only with hub operators (to fulfil your booking), payment processors, and SMS/email providers necessary to operate the Service.',
          },
          {
            title: 'Data Retention',
            body: 'We retain your account data for as long as your account is active. Booking records are retained for 7 years for legal and financial compliance.',
          },
          {
            title: 'Your Rights',
            body: 'You have the right to access, correct, or delete your personal data. To exercise these rights, email brayn.kanth5@gmail.com.',
          },
          {
            title: 'Cookies',
            body: 'We use essential cookies for authentication and session management only. No third-party tracking cookies are used.',
          },
          {
            title: 'Contact',
            body: 'For privacy-related questions, contact us at brayn.kanth5@gmail.com.',
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
