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

import type { Variants } from 'framer-motion'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

// ── Data ───────────────────────────────────────────────────────────────────────

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
    desc: "Hike Little Adam's Peak or take the scenic train without your luggage. Luggo keeps it safe in Ella.",
  },
  {
    city: 'near Colombo Airport',
    img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
    desc: 'Arriving early or departing late? Store your bags near BIA and make the most of your extra time.',
  },
  {
    city: 'Negombo',
    img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80',
    desc: "Spend your last day on Negombo's beach without dragging your bags. Our storage partners have you covered.",
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
    desc: "Wander through temples, beaches, and markets without dragging your suitcase. Your bags are safe while you make memories.",
    color: 'bg-amber-50 text-amber-600',
  },
  {
    step: '04',
    icon: ArrowRight,
    title: 'Pick Up and Go',
    desc: "Return to collect your luggage whenever you're ready. Our storage partners are flexible, so you travel on your schedule.",
    color: 'bg-purple-50 text-purple-600',
  },
]

const TRUST_BULLETS = [
  { icon: Shield, text: 'Verified storage locations — every partner is reviewed before joining our network.' },
  { icon: Zap, text: 'Flexible short-term storage — store for a few hours or a few days. You choose.' },
  { icon: MapPin, text: 'Locations island-wide — Colombo, Kandy, Galle, Ella, Negombo, and more.' },
  { icon: CreditCard, text: 'Affordable pricing — transparent hourly rates with no hidden fees.' },
  { icon: Lock, text: 'Tamper-proof seals — every bag is sealed and photographed. Only your QR unlocks it.' },
  { icon: Smartphone, text: 'Local and reliable — built for Sri Lanka\'s travellers, not a generic global service.' },
]

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
    a: "Yes — Luggo is designed for short-term luggage storage. Whether you need to store your bags for 2 hours or 2 days, Luggo has flexible options to suit your travel plans.",
  },
  {
    q: 'Where can I find luggage storage near me in Sri Lanka?',
    a: 'Use the Luggo map to find the nearest verified storage location in your city — Colombo, Kandy, Ella, Negombo, and more. New locations are added regularly across the island.',
  },
]

// ── NavBar ─────────────────────────────────────────────────────────────────────

function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-ocean-900">
          <a href="#how-it-works" className="hover:text-brand transition-colors">How It Works</a>
          <a href="#locations" className="hover:text-brand transition-colors">Locations</a>
          <a href="#faq" className="hover:text-brand transition-colors">FAQ</a>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="text-sm font-bold text-ocean-900 hover:text-brand px-4 py-2 transition-colors">Sign In</Link>
          <Link href="/dashboard" className="bg-gray-900 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand transition-colors">
            Find Storage
          </Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              <a href="#how-it-works" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>How It Works</a>
              <a href="#locations" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>Locations</a>
              <a href="#faq" className="block text-sm font-semibold text-ocean-900 py-2" onClick={() => setMenuOpen(false)}>FAQ</a>
              <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                <Link href="/login" className="text-center text-sm font-bold text-ocean-900 py-2.5 border border-gray-200 rounded-xl">Sign In</Link>
                <Link href="/dashboard" className="text-center bg-gray-900 text-white text-sm font-bold py-3 rounded-xl">Find Storage</Link>
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
    <section className="relative min-h-[100svh] flex flex-col items-center justify-center pt-14 overflow-hidden bg-white">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-brand/6 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-40 w-[400px] h-[400px] bg-ocean-100/40 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-brand/8 text-brand px-3 py-1.5 rounded-full text-xs font-bold mb-5">
              <Star size={12} fill="currentColor" />
              Sri Lanka&apos;s #1 Luggage Storage Network
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-ocean-900 leading-[1.05] tracking-tight mb-4">
              Store Bags Safely.<br />
              <span className="text-brand">Explore Sri Lanka.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-gray-500 text-base md:text-lg max-w-lg mx-auto lg:mx-0 mb-6 leading-relaxed">
              Luggo connects travellers with verified storage spots across Sri Lanka — airports, train stations, hotels and more.
              Pay by the hour. Pick up whenever you&apos;re ready.
            </motion.p>

            {/* Inline stats */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 justify-center lg:justify-start mb-6">
              {[['10+', 'Hubs'], ['5k+', 'Travellers'], ['0', 'Bags lost']].map(([v, l]) => (
                <div key={l} className="text-center">
                  <p className="text-lg font-extrabold text-ocean-900 leading-none">{v}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{l}</p>
                </div>
              ))}
              <div className="w-px h-8 bg-gray-100" />
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Open Now
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-6">
              <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-gray-900 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-brand transition-all duration-200 text-sm">
                Find Storage Near Me <ArrowRight size={16} />
              </Link>
              <a href="#how-it-works" className="flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-bold px-7 py-3.5 rounded-2xl hover:border-brand/40 hover:bg-brand/4 transition-all text-sm">
                How It Works <ChevronDown size={14} />
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {['No account needed', 'Tamper-proof seals', 'Pay with PayHere'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Check size={10} className="text-emerald-500" strokeWidth={3} />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — floating card */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="hidden lg:block relative"
          >
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 max-w-sm mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center">
                  <Luggage size={20} className="text-brand" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">BIA Airport Hub</p>
                  <p className="text-xs text-gray-400">Katunayake · Open 24/7</p>
                </div>
                <span className="ml-auto text-xs bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-full">Available</span>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex justify-between items-center">
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
              <div className="flex gap-2 mb-4">
                {[{ e: '🎒', n: '1× Small' }, { e: '🧳', n: '1× Regular' }].map((b) => (
                  <span key={b.n} className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">{b.e} {b.n}</span>
                ))}
              </div>
              <div className="flex justify-between items-center mb-4 border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">8h · 2 bags</p>
                <p className="text-lg font-extrabold text-gray-900">LKR 4,000</p>
              </div>
              <div className="bg-gray-900 text-white rounded-xl py-3 text-center text-sm font-bold">
                Pay with PayHere →
              </div>
            </div>
            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -bottom-4 -left-6 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Shield size={15} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-900">Bags sealed &amp; secured</p>
                <p className="text-[10px] text-gray-400">Photo proof sent to you</p>
              </div>
            </motion.div>
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
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────────

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-12 bg-gray-50/70">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="text-center mb-8 px-4">
            <p className="text-brand font-bold text-xs uppercase tracking-widest mb-2">Simple Process</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ocean-900 mb-2">How Luggo Works</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">Finding short-term luggage storage in Sri Lanka has never been easier.</p>
          </motion.div>

          {/* Horizontal snap scroll on mobile, 2×2 grid on md+ */}
          <motion.div variants={fadeUp}>
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-4 pb-4 md:hidden scrollbar-hide">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="snap-start shrink-0 w-[75vw] max-w-[280px] bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-4 relative`}>
                    <step.icon size={22} strokeWidth={1.5} />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full text-[9px] font-black text-gray-600 flex items-center justify-center shadow-sm">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
              {/* Scroll indicator padding */}
              <div className="shrink-0 w-4" />
            </div>

            {/* Grid on desktop */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-brand/20 transition-all">
                  <div className={`w-12 h-12 rounded-2xl ${step.color} flex items-center justify-center mb-4 relative`}>
                    <step.icon size={22} strokeWidth={1.5} />
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-gray-200 rounded-full text-[9px] font-black text-gray-600 flex items-center justify-center shadow-sm">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Trust / Why Choose ────────────────────────────────────────────────────────

function TrustSection() {
  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="mb-8">
            <p className="text-brand font-bold text-xs uppercase tracking-widest mb-2">Why Luggo</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ocean-900 mb-3">Why Travellers Choose Luggo for Luggage Storage in Sri Lanka</h2>
            <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
              Whether you&apos;ve just landed at Bandaranaike Airport and can&apos;t check in yet, or you&apos;re spending your last afternoon exploring the city before a flight, Luggo has a bag storage solution for you.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-3">
            {TRUST_BULLETS.map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-gray-50/60 rounded-2xl px-4 py-3.5 border border-gray-100">
                <div className="w-8 h-8 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon size={15} className="text-brand" />
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Locations ──────────────────────────────────────────────────────────────────

function LocationsSection() {
  return (
    <section id="locations" className="py-12 bg-gray-50/70">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="px-4 mb-6">
            <p className="text-brand font-bold text-xs uppercase tracking-widest mb-2">Island-Wide Network</p>
            <div className="flex items-end justify-between gap-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-ocean-900">Luggage Storage Across Sri Lanka</h2>
              <Link href="/dashboard" className="shrink-0 text-xs text-brand font-bold hover:underline">See all →</Link>
            </div>
            <p className="text-gray-400 text-sm mt-1">Find safe, affordable bag storage in all major tourist destinations.</p>
          </motion.div>

          {/* Horizontal snap scroll on mobile */}
          <motion.div variants={fadeUp}>
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-4 md:hidden scrollbar-hide">
              {CITY_LOCATIONS.map((city, i) => (
                <Link key={i} href="/dashboard" className="snap-start shrink-0 w-[65vw] max-w-[240px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <div className="relative h-32">
                    <Image
                      src={city.img}
                      alt={`Luggage Storage ${city.city}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <p className="absolute bottom-2 left-3 text-white font-bold text-xs">Luggage Storage {city.city}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{city.desc}</p>
                  </div>
                </Link>
              ))}
              <div className="shrink-0 w-4" />
            </div>

            {/* Grid on desktop */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
              {CITY_LOCATIONS.map((city, i) => (
                <Link key={i} href="/dashboard" className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                  <div className="relative h-36">
                    <Image
                      src={city.img}
                      alt={`Luggage Storage ${city.city}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <p className="absolute bottom-2 left-3 text-white font-bold text-sm">Luggage Storage {city.city}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 leading-relaxed">{city.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Pricing strip ─────────────────────────────────────────────────────────────

function PricingStrip() {
  return (
    <section className="py-8 px-4 bg-white border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Transparent Pricing</p>
              <p className="font-bold text-gray-900 text-sm">Hourly rates — no minimum, no hidden fees</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {[{ e: '🎒', t: 'Small', r: 200 }, { e: '🧳', t: 'Regular', r: 300 }, { e: '🛄', t: 'Large', r: 400 }].map(item => (
                <div key={item.t} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                  <span className="text-lg">{item.e}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{item.t}</p>
                    <p className="text-[10px] text-gray-400">LKR {item.r}/hr</p>
                  </div>
                </div>
              ))}
              <Link href="/dashboard" className="bg-brand text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-colors whitespace-nowrap">
                Book Now →
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── FAQ ────────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section id="faq" className="py-12 px-4 bg-gray-50/70">
      <div className="max-w-2xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={staggerContainer}>
          <motion.div variants={fadeUp} className="text-center mb-8">
            <p className="text-brand font-bold text-xs uppercase tracking-widest mb-2">Got Questions?</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ocean-900">Frequently Asked Questions</h2>
          </motion.div>
          <motion.div variants={fadeUp} className="space-y-2">
            {FAQS.map((faq, i) => (
              <details key={i} className="group bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50 transition-colors">
                  <h3 className="font-bold text-gray-900 text-sm">{faq.q}</h3>
                  <ChevronDown size={15} className="text-gray-400 shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Footer CTA ─────────────────────────────────────────────────────────────────

function FooterCta() {
  return (
    <section className="py-12 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="bg-ocean-900 rounded-3xl px-8 py-10 md:px-12 md:py-14 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <div className="relative z-10">
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">Ready to explore?</p>
              <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">Explore Sri Lanka Hands-Free</h2>
              <p className="text-white/50 text-sm max-w-md mx-auto mb-7">
                Join thousands of travellers who store their bags with Luggo. Find a spot near you and start your adventure.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard" className="flex items-center justify-center gap-2 bg-brand text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-brand/90 transition-all text-sm">
                  Find Luggage Storage Near Me <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/20 transition-all text-sm backdrop-blur-sm">
                  Partner with Luggo
                </Link>
              </div>
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
    <footer className="bg-ocean-900 text-white/60 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-xs text-white/40 leading-relaxed max-w-xs">
              Secure luggage storage at trusted hubs across Sri Lanka.
            </p>
          </div>
          <div>
            <p className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Product</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#locations" className="hover:text-white transition-colors">Locations</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Account</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">My Bookings</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-white font-bold text-xs mb-3 uppercase tracking-wider">Legal</p>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/30">© 2026 Luggo Sri Lanka (Pvt) Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
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
      <TrustSection />
      <PricingStrip />
      <LocationsSection />
      <FaqSection />
      <FooterCta />
      <Footer />
    </div>
  )
}
