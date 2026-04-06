'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import Image from 'next/image'
import {
  Shield, ShieldCheck, MapPin, ArrowRight, Star, Check,
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
  { step: '01', icon: MapPin,    grad: 'from-blue-500 to-brand' },
  { step: '02', icon: Package,   grad: 'from-emerald-500 to-teal-500' },
  { step: '03', icon: Zap,       grad: 'from-amber-500 to-orange-500' },
  { step: '04', icon: ArrowRight, grad: 'from-purple-500 to-pink-500' },
]

const FEATURES = [
  { icon: Shield,     bg: 'bg-blue-50',   ic: 'text-blue-600',   border: 'border-blue-100' },
  { icon: QrCode,     bg: 'bg-violet-50', ic: 'text-violet-600', border: 'border-violet-100' },
  { icon: Lock,       bg: 'bg-emerald-50',ic: 'text-emerald-600',border: 'border-emerald-100' },
  { icon: Clock,      bg: 'bg-amber-50',  ic: 'text-amber-600',  border: 'border-amber-100' },
  { icon: Smartphone, bg: 'bg-pink-50',   ic: 'text-pink-600',   border: 'border-pink-100' },
  { icon: MapPin,     bg: 'bg-cyan-50',   ic: 'text-cyan-600',   border: 'border-cyan-100' },
]

const REVIEWS = [
  { name: 'Sarah Miller', role: 'Travel Blogger', avatar: '👩‍💻' },
  { name: 'James Wilson', role: 'Solo Traveler', avatar: '👨‍✈️' },
  { name: 'Elena Rossi', role: 'Digital Nomad', avatar: '👩‍🌾' },
]

// ── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const t = useTranslations('Nav')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white/90 backdrop-blur-md border-b border-gray-100'}`}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-ocean-900">
          <a href="#how-it-works" className="hover:text-brand transition-colors">{t('how')}</a>
          <a href="#locations" className="hover:text-brand transition-colors">{t('locations')}</a>
          <a href="#faq" className="hover:text-brand transition-colors">{t('faq')}</a>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <LanguageSwitcher />
          <Link href="/login"     className="text-sm font-bold text-ocean-900 hover:text-brand px-4 py-2 transition-colors">{t('signIn')}</Link>
          <Link href="/dashboard" className="bg-brand text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-brand/90 transition-colors">{t('findStorage')}</Link>
        </div>
        <button className="md:hidden p-2 rounded-lg" onClick={() => setOpen(!open)}>
          {open ? <X size={22} className="text-ocean-900" /> : <Menu size={22} className="text-ocean-900" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-2xl">
            <div className="px-4 py-6 space-y-2">
              <a href="#how-it-works" onClick={() => setOpen(false)}
                className="block text-base font-bold text-ocean-900 p-3 rounded-2xl hover:bg-gray-50">{t('how')}</a>
              <a href="#locations" onClick={() => setOpen(false)}
                className="block text-base font-bold text-ocean-900 p-3 rounded-2xl hover:bg-gray-50">{t('locations')}</a>
              <a href="#faq" onClick={() => setOpen(false)}
                className="block text-base font-bold text-ocean-900 p-3 rounded-2xl hover:bg-gray-50">{t('faq')}</a>
              
              <div className="pt-4 border-t border-gray-100 flex flex-col gap-3 mt-4">
                <div className="px-3 py-2 flex items-center justify-between bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Language</span>
                  <LanguageSwitcher />
                </div>
                <Link href="/login" onClick={() => setOpen(false)}
                  className="text-center font-bold text-ocean-900 py-4 border border-gray-200 rounded-2xl">{t('signIn')}</Link>
                <Link href="/dashboard" onClick={() => setOpen(false)}
                  className="text-center bg-brand text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand/20">{t('findStorage')}</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

// ── Hero App Preview Card ────────────────────────────────────────────────────

function AppPreviewCard() {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-brand/20 rounded-3xl blur-2xl scale-110" />
      <div className="relative bg-white/10 border border-white/20 backdrop-blur-sm rounded-3xl p-4 shadow-2xl">
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
          <div className="bg-gray-50 rounded-xl py-4 flex flex-col items-center gap-1.5">
            <QrCode size={28} className="text-ocean-900/30" />
            <p className="text-[9px] text-gray-400 font-semibold">Show at hub counter</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-ocean-900 rounded-2xl px-3 py-2.5">
          <div className="w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center shrink-0">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white leading-none">Bags sealed & secured</p>
            <p className="text-[9px] text-white/50 mt-0.5">Photo proof uploaded</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const t = useTranslations('Index')
  return (
    <section className="relative bg-ocean-900 overflow-hidden">
      {/* Background with Scenery (Mobile/General) */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-900 via-ocean-900/40 to-transparent z-10" />
        <Image
          src="/images/marketing/srilanka-hero.png"
          alt="Sri Lanka Scenery"
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-ocean-900/20 backdrop-blur-[2px] z-5" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-12 sm:pt-28 sm:pb-16 lg:pt-36">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-20">
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex-1 text-center lg:text-left">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 px-3 py-1.5 rounded-full text-xs font-bold mb-6">
              <Star size={11} fill="currentColor" className="text-brand-accent" />
              {t('vettedNetwork')}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-[2.25rem] sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-5">
              {t('title')}
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/60 text-base sm:text-lg max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
              {t('subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
              <Link href="/dashboard"
                className="flex items-center justify-center gap-2 bg-brand text-white font-bold px-8 py-4 rounded-2xl hover:bg-brand/90 active:scale-95 transition-all text-base shadow-xl shadow-brand/20">
                {t('findStorage')} <ArrowRight size={18} />
              </Link>
              <a href="#how-it-works"
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/15 transition-all text-base">
                {t('howItWorks')} <ChevronDown size={16} />
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="hidden sm:flex flex-wrap gap-2.5 justify-center lg:justify-start opacity-70">
              {['No account needed','Tamper-proof seals','LKR 150k Protection'].map(chip => (
                <span key={chip} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-full">
                  <Check size={12} className="text-emerald-400" strokeWidth={3} /> {chip}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.4, duration:0.7 }}
            className="hidden lg:block shrink-0 relative w-[520px] h-[380px]">
            <div className="absolute inset-0 rounded-[3rem] overflow-hidden border border-white/30 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] z-0">
               <Image
                 src="/images/marketing/srilanka-hero.png"
                 alt="Explore Sri Lanka"
                 fill
                 className="object-cover scale-125 transition-transform duration-10000 ease-linear transform hover:scale-135"
               />
               <div className="absolute inset-0 bg-gradient-to-tr from-ocean-900/60 via-transparent to-white/10" />
            </div>
            {/* Floating App Card with Ultra-Premium Glassmorphism */}
            <div className="absolute -bottom-8 -left-16 w-[320px] transform -rotate-3 z-10">
              <div className="relative group">
                <div className="absolute inset-0 bg-brand/30 rounded-[2rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <AppPreviewCard />
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.6, duration:0.5 }}
          className="mt-12 sm:mt-20 grid grid-cols-3 gap-3 sm:gap-6 max-w-lg mx-auto lg:mx-0">
          {[
            ['10+', t('stats.hubs')],
            ['5,000+', t('stats.travellers')],
            ['0', t('stats.bagsLost')]
          ].map(([v,l]) => (
            <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
              <p className="text-2xl sm:text-3xl font-black text-white mb-1">{v}</p>
              <p className="text-[10px] sm:text-xs font-bold text-white/40 uppercase tracking-widest">{l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── Social Proof Band ─────────────────────────────────────────────────────────

function SocialProofBand() {
  const t = useTranslations('Common')
  return (
    <div className="bg-gray-50 border-b border-gray-100 py-6 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        {[
          { icon: Shield,      text: t('vettedHub') },
          { icon: ShieldCheck, text: t('protection') },
          { icon: Lock,        text: t('seals') },
          { icon: CreditCard,  text: 'PayHere Secure' },
          { icon: Star,        text: '5-Star Rated' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-wider">
            <Icon size={14} className="text-brand" />
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
      className={`absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 hover:shadow-xl active:scale-90 transition-all ${dir === 'left' ? 'left-2' : 'right-2'}`}
    >
      {dir === 'left' ? <ChevronLeft size={18} className="text-gray-900" /> : <ChevronRight size={18} className="text-gray-900" />}
    </button>
  )
}

// ── How It Works ──────────────────────────────────────────────────────────────

function HowItWorksSection() {
  const t = useTranslations('Sections.how')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  function updateArrows() {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 10)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
  }

  function scroll(dir: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="bg-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span className="inline-block text-brand font-bold text-xs uppercase tracking-widest mb-2">{t('tag')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-ocean-900">{t('title')}</h2>
          </motion.div>

          <motion.div variants={fadeUp} className="md:hidden relative">
            <ScrollArrow dir="left"  onClick={() => scroll('left')}  visible={canLeft} />
            <ScrollArrow dir="right" onClick={() => scroll('right')} visible={canRight} />
            <div
              ref={scrollRef}
              onScroll={updateArrows}
              className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-6 scrollbar-hide">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="snap-start shrink-0 w-[75vw] max-w-[280px] bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-5 shadow-lg shadow-brand/10`}>
                    <s.icon size={22} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{s.step}</span>
                  <h3 className="font-bold text-ocean-900 text-lg mt-2 mb-2">{t(`step${i+1}`)}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{t(`step${i+1}Desc`)}</p>
                </div>
              ))}
              <div className="shrink-0 w-4" />
            </div>
          </motion.div>

          <div className="hidden md:grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                className="bg-white rounded-3xl border border-gray-100 p-8 hover:shadow-2xl hover:shadow-brand/5 hover:-translate-y-1 transition-all group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon size={26} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-black text-gray-200 uppercase tracking-widest">{s.step}</span>
                <h3 className="font-bold text-ocean-900 text-xl mt-2 mb-3">{t(`step${i+1}`)}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{t(`step${i+1}Desc`)}</p>
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
  const t = useTranslations('Sections.features')
  
  // Fixed mapping for feature descriptions for now since they are many
  return (
    <section id="features" className="bg-gray-50 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-12">
            <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">{t('tag')}</span>
            <h2 className="text-3xl sm:text-4xl font-black text-ocean-900">{t('title')}</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp}
                className={`group flex gap-5 ${f.bg} border ${f.border} rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all`}>
                <div className={`w-12 h-12 rounded-2xl bg-white shadow-md flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform ${f.ic}`}>
                  <f.icon size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-bold text-ocean-900 text-base mb-1.5">Feature {i+1}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed opacity-70">Securing your journey with verified local partners and island-wide support.</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Reviews ──────────────────────────────────────────────────────────────────

function ReviewsSection() {
  const t = useTranslations('Sections.reviews')
  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger} className="text-center mb-12">
          <motion.span variants={fadeUp} className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">{t('tag')}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black text-ocean-900">{t('title')}</motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((rev, i) => (
            <motion.div key={i} initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} transition={{ delay: i*0.1 }}
              className="bg-gray-50 rounded-3xl p-8 border border-gray-100 flex flex-col items-center text-center">
              <span className="text-4xl mb-4">{rev.avatar}</span>
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="#f59e0b" className="text-amber-500" />)}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">&ldquo;Luggo saved my trip! The best way to explore Sri Lanka hands-free.&rdquo;</p>
              <p className="font-bold text-ocean-900 text-sm">{rev.name}</p>
              <p className="text-xs text-gray-400 font-medium">{rev.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function PricingSection() {
  const bags = [
    { e: '🎒', t: 'Small',   r: 200, popular: false },
    { e: '🧳', t: 'Regular', r: 300, popular: true  },
    { e: '🛄', t: 'Large',   r: 400, popular: false },
  ]
  return (
    <section className="bg-ocean-900 py-20 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.span variants={fadeUp} className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">Pricing</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black text-white mb-12">Simple, Hourly Rates</motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {bags.map(item => (
              <motion.div key={item.t} variants={fadeUp}
                className={`relative bg-white/5 border backdrop-blur-sm rounded-3xl p-8 text-center transition-all hover:bg-white/10 ${item.popular ? 'border-brand shadow-2xl shadow-brand/20' : 'border-white/10'}`}>
                {item.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full">Most Popular</span>
                )}
                <span className="text-5xl block mb-6">{item.e}</span>
                <h3 className="font-bold text-white text-xl mb-6">{item.t} Bag</h3>
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-3xl font-black text-white">LKR {item.r}</span>
                  <span className="text-sm font-bold text-white/40">/ hr</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Locations ─────────────────────────────────────────────────────────────────

function LocationsSection() {
  const nt = useTranslations('Nav')
  return (
    <section id="locations" className="bg-white py-20 px-4">
      <div className="max-w-6xl mx-auto text-center mb-12">
        <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">Coverage</span>
        <h2 className="text-3xl sm:text-4xl font-black text-ocean-900">{nt('locations')}</h2>
      </div>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {CITY_LOCATIONS.map((c, i) => (
          <Link key={i} href="/dashboard" className="group block text-center">
            <div className="relative aspect-square rounded-full overflow-hidden mb-4 border-2 border-gray-100 p-1 group-hover:border-brand transition-colors">
              <div className="relative w-full h-full rounded-full overflow-hidden">
                <Image src={c.img} alt={c.city} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
            <p className="font-bold text-ocean-900 text-sm">{c.city}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqSection() {
  const nt = useTranslations('Nav')
  return (
    <section id="faq" className="bg-gray-50 py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-brand font-bold text-xs uppercase tracking-widest block mb-2">{nt('faq')}</span>
          <h2 className="text-3xl font-black text-ocean-900">Got Questions?</h2>
        </div>
        <div className="space-y-3">
          {[1,2,3,4].map(q => (
            <details key={q} className="group bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-ocean-900 text-sm sm:text-base">
                How does it work?
                <ChevronDown size={18} className="group-open:rotate-180 transition-transform" />
              </summary>
              <div className="px-6 pb-6 text-gray-500 text-sm leading-relaxed">
                Just find a spot on the map, book online, and drop your bags. Every hub is vetted and secure.
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer CTA ────────────────────────────────────────────────────────────────

function FooterCta() {
  const t = useTranslations('Index')
  return (
    <section className="bg-white py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-brand rounded-[40px] p-10 sm:p-20 text-center relative overflow-hidden shadow-2xl shadow-brand/30">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">Explore Sri Lanka Hands-Free</h2>
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-white text-brand font-black px-10 py-5 rounded-2xl hover:scale-105 transition-transform shadow-xl">
              {t('findStorage')} <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-ocean-900 text-white/40 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <Logo size="md" />
          <div className="flex flex-wrap justify-center gap-8 text-sm font-bold uppercase tracking-widest">
            <a href="#how" className="hover:text-white">How</a>
            <a href="#locations" className="hover:text-white">Locations</a>
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
          </div>
          <p className="text-xs font-medium">© 2026 Luggo Sri Lanka. Trusted island-wide.</p>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <HeroSection />
      <SocialProofBand />
      <HowItWorksSection />
      <FeaturesSection />
      <ReviewsSection />
      <PricingSection />
      <LocationsSection />
      <FaqSection />
      <FooterCta />
      <Footer />
    </div>
  )
}
