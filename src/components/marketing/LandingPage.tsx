'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield, MapPin, ArrowRight, Star, Check,
  Package, QrCode, Smartphone, ChevronDown, Menu, X,
  Luggage, Zap, Lock, CreditCard,
} from 'lucide-react'

// ── Animation helpers ──────────────────────────────────────────────────────────

import type { Variants } from 'framer-motion'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

// ── Data ───────────────────────────────────────────────────────────────────────

const HUBS_PREVIEW = [
  { name: 'BIA Airport Hub', location: 'Katunayake', open: '24/7', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80', capacity: 60 },
  { name: 'Colombo Fort Station', location: 'Colombo 01', open: '05:00–23:00', img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80', capacity: 40 },
  { name: 'One Galle Face Mall', location: 'Colombo 03', open: '09:00–22:00', img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80', capacity: 35 },
  { name: 'Galle Fort Hub', location: 'Galle', open: '07:00–22:00', img: 'https://images.unsplash.com/photo-1588598198321-9735fd5f2aad?w=600&q=80', capacity: 20 },
  { name: 'Kandy City Centre', location: 'Kandy', open: '08:30–21:30', img: 'https://images.unsplash.com/photo-1569384370146-66a8f9734e1e?w=600&q=80', capacity: 30 },
  { name: 'Ella Highlands Hub', location: 'Ella', open: '06:00–20:00', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', capacity: 15 },
]

const CITY_LOCATIONS = [
  {
    city: 'Colombo',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80',
    desc: 'Store your bags near Colombo Fort, Pettah, Galle Face, and major hotels while you explore the capital city.',
  },
  {
    city: 'Kandy',
    img: 'https://images.unsplash.com/photo-1569384370146-66a8f9734e1e?w=600&q=80',
    desc: 'Visit the Temple of the Tooth and Kandy Lake without your suitcase. Drop off your bags and roam freely.',
  },
  {
    city: 'Galle',
    img: 'https://images.unsplash.com/photo-1588598198321-9735fd5f2aad?w=600&q=80',
    desc: 'Walk the famous Galle Fort and enjoy the southern coast hands-free with convenient bag storage nearby.',
  },
  {
    city: 'Ella',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    desc: 'Hike Little Adam\'s Peak or take the scenic train without your luggage. Luggo keeps it safe in Ella.',
  },
  {
    city: 'near Colombo Airport',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
    desc: 'Arriving early or departing late? Store your bags near BIA and make the most of your extra time.',
  },
  {
    city: 'Negombo',
    img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80',
    desc: 'Spend your last day on Negombo\'s beach without dragging your bags. Our storage partners have you covered.',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: MapPin,
    title: 'Find a Spot',
    desc: 'Search by city or landmark. Browse verified luggage storage locations near you in Colombo, Kandy, Ella, Galle, and Negombo.',
    color: 'bg-blue-50 text-brand',
  },
  {
    step: '02',
    icon: Package,
    title: 'Drop Off Your Bags',
    desc: 'Head to your chosen spot, drop off your luggage, and enjoy Sri Lanka completely hands-free. No heavy bags. No stress.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    step: '03',
    icon: Zap,
    title: 'Explore Freely',
    desc: 'Wander through temples, beaches, and markets without dragging your suitcase. Your bags are safe while you make memories.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '04',
    icon: ArrowRight,
    title: 'Pick Up and Go',
    desc: 'Return to collect your luggage whenever you\'re ready. Our storage partners are flexible, so you travel on your schedule.',
    color: 'bg-purple-50 text-purple-600',
  },
]

const PRICING = [
  { emoji: '🎒', type: 'Small', desc: 'Backpack / Hand luggage', rate: 200 },
  { emoji: '🧳', type: 'Regular', desc: 'Cabin carry-on', rate: 300 },
  { emoji: '🛄', type: 'Large', desc: 'Check-in suitcase', rate: 400 },
]

const TRUST_FEATURES = [
  { icon: Shield, title: 'Verified storage locations', desc: 'Every Luggo partner is reviewed and approved before joining our network.' },
  { icon: Zap, title: 'Flexible short-term storage', desc: 'Store your bags for a few hours or a few days. You choose — no minimum booking.' },
  { icon: MapPin, title: 'Locations island-wide', desc: 'Luggage storage in Colombo, Kandy, Galle, Ella, Negombo, and more.' },
  { icon: CreditCard, title: 'Affordable pricing', desc: 'Transparent hourly and daily rates with no hidden fees. Pay only for what you use.' },
  { icon: Lock, title: 'Tamper-proof seals', desc: 'Every bag is sealed and photographed. Only your QR code unlocks retrieval.' },
  { icon: Smartphone, title: 'Local and reliable', desc: 'Luggo is a Sri Lankan platform built for Sri Lanka\'s travellers — not a global generic service.' },
]

const STATS = [
  { value: '10+', label: 'Storage Hubs' },
  { value: '5k+', label: 'Happy Travelers' },
  { value: '4.9', label: 'App Rating' },
  { value: '0', label: 'Bags Lost' },
]

// ── Components ─────────────────────────────────────────────────────────────────

function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="md" />

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-ocean-900">
          <a href="#how-it-works" className="hover:text-brand transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-brand transition-colors">Pricing</a>
          <a href="#locations" className="hover:text-brand transition-colors">Locations</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-ocean-900 hover:text-brand px-4 py-2 transition-colors">
            Sign In
          </Link>
          <Link href="/dashboard" className="bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand transition-colors">
            Book Storage
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-5 space-y-4">
              <a href="#how-it-works" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>How It Works</a>
              <a href="#pricing" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>Pricing</a>
              <a href="#locations" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>Locations</a>
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-3">
                <Link href="/login" className="text-center text-sm font-bold text-ocean-900 py-2.5 border border-gray-200 rounded-xl">Sign In</Link>
                <Link href="/dashboard" className="text-center bg-gray-900 text-white text-sm font-bold py-3 rounded-xl">Book Storage</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="min-h-screen relative flex flex-col items-center justify-center pt-16 overflow-hidden bg-white">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-[500px] h-[500px] bg-ocean-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 md:py-28 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center lg:text-left">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-brand/8 text-brand px-4 py-2 rounded-full text-sm font-bold mb-6">
              <Star size={14} fill="currentColor" />
              Sri Lanka&apos;s #1 Luggage Storage
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl xl:text-7xl font-extrabold text-ocean-900 leading-[1.05] tracking-tight mb-6">
              Sri Lanka&apos;s Trusted<br />
              <span className="text-brand">Luggage Storage Network.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-500 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 mb-3 leading-relaxed">
              Luggo connects travellers with verified storage spots across Sri Lanka — so you can explore Colombo, Kandy, Galle, and beyond completely hands-free.
            </motion.p>

            <motion.p variants={fadeUp} className="text-gray-400 text-base max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              Store your bags safely. Pay by the hour. Pick up whenever you&apos;re ready.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-gray-900 text-white font-bold px-8 py-4 rounded-2xl hover:bg-brand transition-all duration-200 text-base">
                Find Storage Near Me <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works" className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-bold px-8 py-4 rounded-2xl hover:border-brand/40 hover:bg-brand/4 transition-all text-base">
                How It Works <ChevronDown size={16} />
              </a>
            </motion.div>

            {/* Trust pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {['No account required', 'Tamper-proof seals', 'Pay with PayHere'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Check size={11} className="text-emerald-500" strokeWidth={3} />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — floating booking card preview */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:block relative"
          >
            {/* Main card */}
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 max-w-sm mx-auto">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                  <Luggage size={20} className="text-brand" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">BIA Airport Hub</p>
                  <p className="text-xs text-gray-400">Katunayake · Open 24/7</p>
                </div>
                <span className="ml-auto text-xs bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-full">Available</span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3.5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">DROP-OFF</p>
                    <p className="text-sm font-bold text-gray-900">Today, 09:00</p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">PICK-UP</p>
                    <p className="text-sm font-bold text-gray-900">Today, 17:00</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {[{ e: '🎒', n: '1× Small' }, { e: '🧳', n: '1× Regular' }].map((b) => (
                    <span key={b.n} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">{b.e} {b.n}</span>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between items-center mb-4">
                <p className="text-xs text-gray-400 font-medium">8h storage · 2 bags</p>
                <p className="text-lg font-extrabold text-gray-900">LKR 4,000</p>
              </div>

              <div className="bg-gray-900 text-white rounded-xl py-3 text-center text-sm font-bold">
                Pay with PayHere →
              </div>
            </div>

            {/* Floating badge: seal proof */}
            <motion.div
              animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Shield size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Bags sealed & secured</p>
                <p className="text-[10px] text-gray-400">Photo proof sent to you</p>
              </div>
            </motion.div>

            {/* Floating badge: QR */}
            <motion.div
              animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.5 }}
              className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-brand/10 rounded-xl flex items-center justify-center">
                <QrCode size={15} className="text-brand" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Unique QR per booking</p>
                <p className="text-[10px] text-gray-400">Scan to retrieve bags</p>
              </div>
            </motion.div>
          </motion.div>

        </div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }}
        className="w-full bg-gray-50/80 border-t border-gray-100 py-8"
      >
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-extrabold text-ocean-900">{s.value}</p>
              <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fadeUp} className="text-center mb-16">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-4">How Luggo Works</h2>
            <p className="text-gray-400 max-w-lg mx-auto">Finding short-term luggage storage in Sri Lanka has never been easier. Luggo partners with trusted shops, hotels, and businesses island-wide.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="flex gap-5 bg-gray-50/60 border border-gray-100 rounded-3xl p-6">
                <div className={`w-14 h-14 rounded-2xl ${step.color} flex items-center justify-center shrink-0 relative`}>
                  <step.icon size={26} strokeWidth={1.5} />
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-200 rounded-full text-[9px] font-black text-gray-600 flex items-center justify-center shadow-sm">
                    {step.step}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-ocean-900 mb-1.5">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Pricing ────────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 bg-gray-50/60">
      <div className="max-w-4xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Transparent Pricing</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-4">Luggo Pricing: Low Cost, No Hidden Fees</h2>

            <p className="text-gray-400 max-w-md mx-auto">Hourly rates per bag. No minimum, no subscription, no hidden fees.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {PRICING.map((item, i) => (
              <div key={i} className={`flex items-center gap-5 p-6 ${i < PRICING.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  {item.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{item.type} Bag</p>
                  <p className="text-sm text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-extrabold text-ocean-900">LKR {item.rate.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 font-medium">per hour</p>
                </div>
              </div>
            ))}

            <div className="bg-brand/4 border-t border-brand/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard size={18} className="text-brand shrink-0" />
                <p className="text-sm text-gray-600 font-medium">Secure payments via PayHere · Visa, Mastercard & more</p>
              </div>
              <Link href="/dashboard" className="shrink-0 bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-colors whitespace-nowrap">
                Book Now →
              </Link>
            </div>
          </motion.div>

          {/* Example calculation */}
          <motion.div variants={fadeUp} className="mt-6 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="text-2xl">🧮</div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-bold text-emerald-800">Example: Day trip from Colombo Fort</p>
              <p className="text-xs text-emerald-600 mt-0.5">1× Regular bag for 6 hours = <strong>LKR 1,800</strong> — less than a cup of coffee per hour</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Trust & Security ───────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Why Travellers Choose Luggo</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-4">Why Travellers Choose Luggo for Luggage Storage in Sri Lanka</h2>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Whether you&apos;ve just landed at Bandaranaike Airport and can&apos;t check in yet, or you&apos;re spending your last afternoon exploring the city before a flight, Luggo has a bag storage solution for you.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className="bg-gray-50/60 border border-gray-100 rounded-3xl p-6 hover:border-brand/20 hover:bg-brand/3 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <f.icon size={22} className="text-brand" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Locations ──────────────────────────────────────────────────────────────────

function LocationsSection() {
  return (
    <section id="locations" className="py-24 px-4 bg-gray-50/60">
      <div className="max-w-7xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Island-Wide Network</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-4">Luggage Storage Across Sri Lanka</h2>
            <p className="text-gray-400 max-w-md mx-auto">Find safe, affordable bag storage in all major tourist destinations and transit hubs across Sri Lanka.</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CITY_LOCATIONS.map((city, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Link href="/dashboard" className="group block bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="relative h-40 overflow-hidden">
                    <Image
                      src={city.img}
                      alt={`Luggage Storage ${city.city} — Safe bag storage in ${city.city}, Sri Lanka`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <p className="absolute bottom-3 left-4 text-white font-bold text-sm">Luggage Storage {city.city}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 leading-relaxed">{city.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="text-center mt-10">
            <Link href="/dashboard" className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 font-bold px-7 py-3.5 rounded-2xl hover:border-brand/40 hover:text-brand transition-all text-sm">
              View All Hubs <ArrowRight size={15} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is there luggage storage in Colombo?',
    a: 'Yes! Luggo offers luggage storage at multiple verified locations across Colombo, including near Colombo Fort, major hotels, and tourist areas. Book online and drop off your bags in minutes.',
  },
  {
    q: 'How much does luggage storage cost in Sri Lanka?',
    a: 'Luggo offers flexible pricing with affordable hourly and daily rates. Pricing varies by location — check the Luggo app or website for exact rates near you.',
  },
  {
    q: 'Is my luggage safe with Luggo?',
    a: 'Absolutely. Every Luggo storage partner is carefully verified before joining our network. Your bags are stored securely so you can explore with peace of mind.',
  },
  {
    q: 'Can I store luggage for just a few hours?',
    a: 'Yes — Luggo is designed for short-term luggage storage. Whether you need to store your bags for 2 hours or 2 days, Luggo has flexible options to suit your travel plans.',
  },
  {
    q: 'Where can I find luggage storage near me in Sri Lanka?',
    a: 'Use the Luggo map to find the nearest verified storage location in your city — Colombo, Kandy, Ella, Negombo, and more. New locations are added regularly across the island.',
  },
]

function FaqSection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-brand font-bold text-sm uppercase tracking-widest mb-3">Got Questions?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-ocean-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400 max-w-md mx-auto">Everything you need to know about luggage storage in Sri Lanka.</p>
          </motion.div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={fadeUp} className="border border-gray-100 rounded-2xl overflow-hidden">
                <details className="group">
                  <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
                    <h3 className="font-bold text-gray-900 text-sm md:text-base">{faq.q}</h3>
                    <ChevronDown size={16} className="text-gray-400 shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-6 pb-5">
                    <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Guest booking CTA ─────────────────────────────────────────────────────────

function GuestCtaSection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-ocean-900 rounded-[2.5rem] p-10 md:p-16 overflow-hidden relative"
        >
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-ocean-700/40 rounded-full blur-2xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 px-4 py-1.5 rounded-full text-xs font-bold mb-5 backdrop-blur-sm">
                <Zap size={12} className="text-brand-accent" fill="currentColor" />
                No account required
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight mb-5">
                Ready to Explore Sri Lanka<br />Hands-Free?
              </h2>
              <p className="text-white/60 text-lg max-w-md mx-auto lg:mx-0 mb-8">
                Join thousands of travellers who use Luggo for safe, convenient luggage storage across Sri Lanka. Find a storage spot near you and start your adventure — without the bags.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-brand text-white font-bold px-8 py-4 rounded-2xl hover:bg-brand/90 transition-all text-base">
                  Find Luggage Storage Near Me <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-2xl backdrop-blur-sm hover:bg-white/20 transition-all text-base">
                  Partner with Luggo
                </Link>
              </div>
            </div>

            {/* Steps mini */}
            <div className="flex-shrink-0 w-full lg:w-72 space-y-3">
              {[
                { n: '1', text: 'Pick a hub & select times' },
                { n: '2', text: 'Choose bag types' },
                { n: '3', text: 'Enter your details + OTP' },
                { n: '4', text: 'Pay via PayHere' },
                { n: '5', text: 'Drop off your bags!' },
              ].map((s) => (
                <div key={s.n} className="flex items-center gap-4 bg-white/8 backdrop-blur-sm rounded-2xl px-5 py-3.5">
                  <div className="w-7 h-7 bg-brand text-white text-xs font-black rounded-full flex items-center justify-center shrink-0">
                    {s.n}
                  </div>
                  <p className="text-white/80 text-sm font-medium">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-ocean-900 text-white/60 py-14 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1">
            <Logo size="md" />
            <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-xs">
              Secure luggage storage at trusted hubs across Sri Lanka.
            </p>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Product</p>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#locations" className="hover:text-white transition-colors">Locations</a></li>
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Account</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Bookings</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Legal</p>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">© 2026 Luggo Sri Lanka (Pvt) Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-xs text-white/30">All systems operational</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <NavBar />
      <HeroSection />
      <HowItWorksSection />
      <PricingSection />
      <TrustSection />
      <LocationsSection />
      <FaqSection />
      <GuestCtaSection />
      <Footer />
    </div>
  )
}
