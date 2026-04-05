'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import Link from 'next/link'
import Image from 'next/image'
import {
  Shield, MapPin, ArrowRight, Star, Check,
  Package, QrCode, Smartphone, ChevronDown, Menu, X,
  Zap, Lock, CreditCard, Clock, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { Variants } from 'framer-motion'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

// ── Data ─────────────────────────────────────────────────────────────────────

const CITY_LOCATIONS = [
  { city: 'Colombo',         img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80', desc: 'Near Colombo Fort, Pettah & Galle Face.' },
  { city: 'Kandy',           img: 'https://images.unsplash.com/photo-1569384370146-66a8f9734e1e?w=600&q=80', desc: 'Temple of the Tooth & Kandy Lake.' },
  { city: 'Galle',           img: 'https://images.unsplash.com/photo-1588598198321-9735fd5f2aad?w=600&q=80', desc: 'Galle Fort & southern coast.' },
  { city: 'Ella',            img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', desc: "Little Adam's Peak & Nine Arch Bridge." },
  { city: 'Airport / BIA',   img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80', desc: 'Store bags arriving early or late.' },
  { city: 'Negombo',         img: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&q=80', desc: 'Beach & lagoon without the luggage.' },
]

const HOW_IT_WORKS = [
  { step: '01', icon: MapPin,    title: 'Find a Spot',    desc: 'Search by city — Colombo, Kandy, Galle, Ella, Negombo and more.',     grad: 'from-blue-500 to-brand',          accent: '#3b82f6' },
  { step: '02', icon: Package,   title: 'Drop Off',       desc: 'Head to the hub, hand over bags, get a tamper-proof seal & QR code.',  grad: 'from-emerald-500 to-teal-500',    accent: '#10b981' },
  { step: '03', icon: Zap,       title: 'Explore Freely', desc: 'Wander hands-free through temples, beaches and markets.',              grad: 'from-amber-500 to-orange-500',    accent: '#f59e0b' },
  { step: '04', icon: ArrowRight, title: 'Pick Up & Go',  desc: 'Return any time, scan your QR, collect your bags. Simple.',            grad: 'from-purple-500 to-pink-500',     accent: '#a855f7' },
]

const FEATURES = [
  { icon: Shield,     title: 'Verified Partners',    desc: 'Every storage location is vetted before joining Luggo.',     bg: 'bg-blue-50',   ic: 'text-blue-600',   border: 'border-blue-100' },
  { icon: QrCode,     title: 'QR-Locked Retrieval',  desc: 'Only your unique QR code can release your bags.',            bg: 'bg-violet-50', ic: 'text-violet-600', border: 'border-violet-100' },
  { icon: Lock,       title: 'Tamper-Proof Seals',   desc: "Bags are photographed & sealed. You'll see proof in-app.",   bg: 'bg-emerald-50',ic: 'text-emerald-600',border: 'border-emerald-100' },
  { icon: Clock,      title: 'Hourly Flexibility',   desc: 'Pay for the hours you use. No minimum, no daily lock-in.',   bg: 'bg-amber-50',  ic: 'text-amber-600',  border: 'border-amber-100' },
  { icon: Smartphone, title: 'Live Notifications',   desc: 'Instant alerts when bags are sealed and ready to collect.',  bg: 'bg-pink-50',   ic: 'text-pink-600',   border: 'border-pink-100' },
  { icon: MapPin,     title: 'Island-Wide Network',  desc: 'Colombo, Kandy, Galle, Ella, Negombo and growing.',          bg: 'bg-cyan-50',   ic: 'text-cyan-600',   border: 'border-cyan-100' },
]

const FAQS = [
  { q: 'Is there luggage storage in Colombo?',              a: 'Yes — Luggo has verified spots near Colombo Fort, major hotels and tourist areas. Book online and drop off in minutes.' },
  { q: 'How much does luggage storage cost in Sri Lanka?',   a: 'Small bags LKR 200/hr, regular bags LKR 300/hr, large suitcases LKR 400/hr. No hidden fees.' },
  { q: 'Is my luggage safe with Luggo?',                    a: 'Every partner is vetted, every bag sealed and photographed. Only your QR code releases your bags.' },
  { q: 'Can I store luggage for just a few hours?',          a: 'Yes — no minimum. 2 hours or 2 days, you choose. Perfect for day trips between check-out and your flight.' },
  { q: 'Where can I find luggage storage near me?',          a: 'Use the Luggo map to find the nearest verified spot — Colombo, Kandy, Ella, Negombo and more.' },
]

// ── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-ocean-900">
          {[['#how-it-works','How It Works'],['#locations','Locations'],['#faq','FAQ']].map(([href,label]) => (
            <a key={href} href={href} className="hover:text-brand transition-colors">{label}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Link href="/login"     className="text-sm font-bold text-ocean-900 hover:text-brand px-4 py-2 transition-colors">Sign In</Link>
          <Link href="/dashboard" className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-colors">Find Storage</Link>
        </div>
        <button className="md:hidden p-2 rounded-lg" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden">
            <div className="px-4 py-4 space-y-1">
              {[['#how-it-works','How It Works'],['#locations','Locations'],['#faq','FAQ']].map(([href,label]) => (
                <a key={href} href={href} onClick={() => setOpen(false)}
                  className="block text-sm font-semibold text-ocean-900 py-2.5 px-3 rounded-xl hover:bg-gray-50">{label}</a>
              ))}
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 mt-2">
                <Link href="/login"     className="text-center text-sm font-bold text-ocean-900 py-3 border border-gray-200 rounded-xl">Sign In</Link>
                <Link href="/dashboard" className="text-center bg-brand text-white text-sm font-bold py-3 rounded-xl">Find Storage Now</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// ── Hero App Preview Card (desktop only) ─────────────────────────────────────

function AppPreviewCard() {
  return (
    <div className="relative">
      {/* Glow ring */}
      <div className="absolute inset-0 bg-brand/20 rounded-3xl blur-2xl scale-110" />
      <div className="relative bg-white/10 border border-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
        {/* Mock booking card */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-brand rounded-full flex items-center justify-center">
              <Check size={13} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-ocean-900 leading-none">Booking Confirmed!</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Colombo Fort Hub</p>
            </div>
            <span className="ml-auto text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100">Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Drop-off</p>
              <p className="text-[11px] font-bold text-ocean-900">Today, 2:00 PM</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Pick-up</p>
              <p className="text-[11px] font-bold text-ocean-900">Tomorrow, 9 AM</p>
            </div>
          </div>
          {/* QR placeholder */}
          <div className="bg-gray-50 rounded-xl py-4 flex flex-col items-center gap-1.5">
            <QrCode size={28} className="text-ocean-900/30" />
            <p className="text-[9px] text-gray-400 font-semibold">Show at hub counter</p>
          </div>
          <div className="flex gap-1 mt-3">
            {['🎒','🧳'].map((e,i) => (
              <div key={i} className="flex-1 flex items-center gap-1.5 bg-brand/5 rounded-lg px-2 py-1.5 border border-brand/10">
                <span className="text-sm">{e}</span>
                <div>
                  <p className="text-[9px] font-bold text-ocean-900">CMB-042</p>
                  <p className="text-[8px] text-gray-400">Sealed ✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating notification */}
        <div className="flex items-center gap-2.5 bg-ocean-900 rounded-2xl px-3 py-2.5">
          <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shrink-0">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white leading-none">Bags sealed & secured</p>
            <p className="text-[9px] text-white/50 mt-0.5">Photo uploaded by staff</p>
          </div>
          <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative bg-ocean-900 overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-brand/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-72 h-72 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-8 sm:pt-24 sm:pb-12 lg:pt-28">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
          {/* ── Text column ── */}
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 px-3 py-1.5 rounded-full text-xs font-bold mb-4">
              <Star size={11} fill="currentColor" className="text-brand-accent" />
              Sri Lanka&apos;s Trusted Luggage Storage Network
            </motion.div>

            {/* Headline */}
            <motion.h1 variants={fadeUp} className="text-[2rem] sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.07] tracking-tight mb-3 sm:mb-4">
              Store Bags Safely.<br />
              <span className="text-brand">Explore Sri Lanka.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/55 text-sm sm:text-base max-w-md mx-auto lg:mx-0 mb-6 leading-relaxed">
              Verified hubs in Colombo, Kandy, Galle, Ella & more.
              Pay by the hour. Pick up whenever you&apos;re ready.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-2.5 justify-center lg:justify-start mb-6">
              <Link href="/dashboard"
                className="flex items-center justify-center gap-2 bg-brand text-white font-bold px-6 py-3 rounded-2xl hover:bg-brand/90 active:scale-95 transition-all text-sm">
                Find Storage Near Me <ArrowRight size={15} />
              </Link>
              <a href="#how-it-works"
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white font-bold px-6 py-3 rounded-2xl hover:bg-white/15 transition-all text-sm">
                How It Works <ChevronDown size={13} />
              </a>
            </motion.div>

            {/* Trust chips — hidden on small mobile */}
            <motion.div variants={fadeUp} className="hidden sm:flex flex-wrap gap-2 justify-center lg:justify-start">
              {['No account needed','Tamper-proof seals','PayHere payments'].map(t => (
                <span key={t} className="flex items-center gap-1.5 bg-white/8 border border-white/10 text-white/70 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Check size={10} className="text-emerald-400" strokeWidth={3} /> {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* ── App preview — desktop only ── */}
          <motion.div
            initial={{ opacity:0, x:30 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4, duration:0.6 }}
            className="hidden lg:block shrink-0 w-72">
            <AppPreviewCard />
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.55, duration:0.5 }}
          className="mt-8 sm:mt-10 grid grid-cols-3 gap-2 sm:gap-3 max-w-xs sm:max-w-sm mx-auto lg:mx-0">
          {[['10+','Hubs'],['5 000+','Travellers'],['0','Bags Lost']].map(([v,l]) => (
            <div key={l} className="bg-white/8 border border-white/10 rounded-2xl px-2 py-3 sm:px-3 sm:py-4 text-center backdrop-blur-sm">
              <p className="text-lg sm:text-2xl font-extrabold text-white leading-none">{v}</p>
              <p className="text-[9px] sm:text-[10px] text-white/45 font-medium mt-1 leading-tight">{l}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="relative h-8 sm:h-12">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg"
          className="absolute bottom-0 w-full" preserveAspectRatio="none">
          <path d="M0 48L1440 48L1440 24C1200 0 960 48 720 24C480 0 240 48 0 24L0 48Z" fill="#f9fafb" />
        </svg>
      </div>
    </section>
  )
}

// ── Social Proof Band ─────────────────────────────────────────────────────────

function SocialProofBand() {
  return (
    <div className="bg-gray-50 border-b border-gray-100 py-4 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {[
          { icon: Shield,   text: 'Fully vetted partner hubs' },
          { icon: Lock,     text: 'Tamper-proof bag seals' },
          { icon: CreditCard, text: 'Secure PayHere checkout' },
          { icon: Star,     text: '5-star rated by travellers' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Icon size={13} className="text-brand" />
            {text}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Scroll Arrow Button ───────────────────────────────────────────────────────

function ScrollArrow({ dir, onClick, visible }: { dir: 'left' | 'right'; onClick: () => void; visible: boolean }) {
  if (!visible) return null
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 hover:shadow-lg active:scale-90 transition-all ${dir === 'left' ? 'left-1' : 'right-1'}`}
    >
      {dir === 'left' ? <ChevronLeft size={15} className="text-gray-600" /> : <ChevronRight size={15} className="text-gray-600" />}
    </button>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  function updateArrows() {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="bg-gray-50 pt-12 pb-14">
      <div className="max-w-6xl mx-auto px-4">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="inline-block text-brand font-bold text-xs uppercase tracking-widest mb-2">Simple Process</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ocean-900">How Luggo Works</h2>
          </motion.div>

          {/* Mobile: horizontal snap scroll with arrows */}
          <motion.div variants={fadeUp} className="md:hidden relative">
            <ScrollArrow dir="left"  onClick={() => scroll('left')}  visible={canLeft} />
            <ScrollArrow dir="right" onClick={() => scroll('right')} visible={canRight} />
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-3 scrollbar-hide">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="snap-start shrink-0 w-[68vw] max-w-[240px] bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-3 shadow-sm`}>
                    <s.icon size={18} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{s.step}</span>
                  <h3 className="font-bold text-gray-900 text-sm mt-1 mb-1.5">{s.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
              ))}
              <div className="shrink-0 w-4" />
            </div>
          </motion.div>

          {/* Desktop: 4-col grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.grad}`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform`}>
                  <s.icon size={18} className="text-white" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{s.step}</span>
                <h3 className="font-bold text-gray-900 text-sm mt-1 mb-2">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

function FeaturesSection() {
  return (
    <section className="bg-white py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center sm:text-left mb-8 max-w-xl">
            <span className="text-brand font-bold text-xs uppercase tracking-widest mb-2 block">Why Luggo</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ocean-900 mb-3">Why Travellers Choose Luggo</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Whether you&apos;ve just landed at Bandaranaike Airport or spending your last afternoon exploring — Luggo has you covered.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`group flex gap-4 ${f.bg} border ${f.border} rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform ${f.ic}`}>
                  <f.icon size={17} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection() {
  const bags = [
    { e: '🎒', t: 'Small',   sub: 'Backpack / day bag', r: 200, popular: false },
    { e: '🧳', t: 'Regular', sub: 'Cabin / carry-on bag', r: 300, popular: true  },
    { e: '🛄', t: 'Large',   sub: 'Check-in suitcase', r: 400, popular: false },
  ]
  return (
    <section className="bg-gray-50 py-14 px-4 border-y border-gray-100">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">Transparent Pricing</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ocean-900 mb-2">Simple Hourly Rates</h2>
            <p className="text-gray-400 text-sm">No minimum stay. No hidden fees. Pay only for the hours you use.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {bags.map(item => (
              <motion.div key={item.t} variants={fadeUp}
                className={`relative bg-white rounded-2xl border shadow-sm p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all
                  ${item.popular ? 'border-brand ring-2 ring-brand/20' : 'border-gray-100'}`}>
                {item.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-extrabold uppercase tracking-wide px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                    Most Popular
                  </span>
                )}
                <span className="text-4xl block mb-3">{item.e}</span>
                <h3 className="font-extrabold text-ocean-900 text-base mb-0.5">{item.t}</h3>
                <p className="text-xs text-gray-400 mb-4">{item.sub}</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-3xl font-extrabold text-brand leading-none">LKR {item.r}</span>
                  <span className="text-xs text-gray-400 mb-0.5">/ hr</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} className="flex justify-center mt-7">
            <Link href="/dashboard"
              className="flex items-center gap-2 bg-brand text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-brand/90 active:scale-95 transition-all text-sm shadow-sm">
              Book Luggage Storage <ArrowRight size={15} />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Locations ─────────────────────────────────────────────────────────────────

function LocationsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  function updateArrows() {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' })
  }

  return (
    <section id="locations" className="bg-white py-14">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex items-end justify-between gap-4 px-4 mb-6">
            <div>
              <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-1">Island-Wide Network</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ocean-900">Luggage Storage Across Sri Lanka</h2>
            </div>
            <Link href="/dashboard" className="shrink-0 text-xs text-brand font-bold whitespace-nowrap hover:underline">See all →</Link>
          </motion.div>

          {/* Mobile: horizontal snap scroll with arrows */}
          <motion.div variants={fadeUp} className="md:hidden relative">
            <ScrollArrow dir="left"  onClick={() => scroll('left')}  visible={canLeft} />
            <ScrollArrow dir="right" onClick={() => scroll('right')} visible={canRight} />
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-3 scrollbar-hide">
              {CITY_LOCATIONS.map((c, i) => (
                <Link key={i} href="/dashboard"
                  className="snap-start shrink-0 w-[58vw] max-w-[210px] bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="relative h-28">
                    <Image src={c.img} alt={`Luggage Storage ${c.city}`} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <p className="absolute bottom-2 left-3 text-white font-bold text-xs leading-tight drop-shadow">{c.city}</p>
                  </div>
                  <div className="p-3">
                    <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{c.desc}</p>
                  </div>
                </Link>
              ))}
              <div className="shrink-0 w-4" />
            </div>
          </motion.div>

          {/* Desktop: grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {CITY_LOCATIONS.map((c, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Link href="/dashboard"
                  className="group block bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="relative h-36">
                    <Image src={c.img} alt={`Luggage Storage ${c.city}`} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                      <p className="text-white font-bold text-sm drop-shadow">Luggage Storage {c.city}</p>
                      <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">● Available</span>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqSection() {
  return (
    <section id="faq" className="bg-gray-50 py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-8">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">FAQ</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ocean-900">Frequently Asked Questions</h2>
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-2">
            {FAQS.map((f, i) => (
              <details key={i} className="group bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none select-none hover:bg-gray-50/80 transition-colors">
                  <h3 className="font-bold text-gray-900 text-sm">{f.q}</h3>
                  <ChevronDown size={15} className="text-gray-400 shrink-0 group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="px-5 pb-4 border-t border-gray-50">
                  <p className="text-gray-500 text-sm leading-relaxed pt-3">{f.a}</p>
                </div>
              </details>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Footer CTA ────────────────────────────────────────────────────────────────

function FooterCta() {
  return (
    <section className="bg-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity:0, y:16 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
          <div className="bg-ocean-900 rounded-3xl px-6 py-10 sm:px-12 sm:py-14 text-center relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/70 text-xs font-bold px-3 py-1.5 rounded-full mb-4 border border-white/10">
                <Zap size={11} fill="currentColor" className="text-brand-accent" />
                Ready to explore?
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3">Explore Sri Lanka Hands-Free</h2>
              <p className="text-white/50 text-sm max-w-md mx-auto mb-8 leading-relaxed">
                Join thousands of travellers who store their bags with Luggo. Find a spot near you and start your adventure.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard"
                  className="flex items-center justify-center gap-2 bg-brand text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-brand/90 active:scale-95 transition-all text-sm">
                  Find Luggage Storage Near Me <ArrowRight size={16} />
                </Link>
                <Link href="/login"
                  className="flex items-center justify-center gap-2 bg-white/10 border border-white/15 text-white font-bold px-7 py-3.5 rounded-2xl hover:bg-white/15 transition-all text-sm backdrop-blur-sm">
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

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-ocean-900 text-white/50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <Logo size="md" />
            <p className="mt-3 text-xs text-white/35 leading-relaxed max-w-xs">Secure luggage storage at trusted hubs across Sri Lanka.</p>
          </div>
          {[
            { title:'Product', links:[['#how-it-works','How It Works'],['#locations','Locations'],['#faq','FAQ']] },
            { title:'Account', links:[['/login','Sign In'],['/dashboard','My Bookings']] },
            { title:'Legal',   links:[['/privacy','Privacy Policy'],['/terms','Terms of Service']] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-white font-bold text-xs mb-3 uppercase tracking-wider">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(([href, label]) => (
                  <li key={href}><a href={href} className="text-sm hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">© 2026 Luggo Sri Lanka (Pvt) Ltd. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-xs text-white/25">All systems operational</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <NavBar />
      <HeroSection />
      <SocialProofBand />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <LocationsSection />
      <FaqSection />
      <FooterCta />
      <Footer />
    </div>
  )
}
