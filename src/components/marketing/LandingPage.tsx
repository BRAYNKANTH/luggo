'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue } from 'framer-motion'
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
  hidden: { opacity: 0, y: 30 },
  show:  { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }

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

const REVIEWS = [
  { name: 'Sarah Miller', role: 'Travel Blogger', avatar: '👩‍💻' },
  { name: 'James Wilson', role: 'Solo Traveler', avatar: '👨‍✈️' },
  { name: 'Elena Rossi', role: 'Digital Nomad', avatar: '👩‍🌾' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function Tilt({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const springConfig = { damping: 25, stiffness: 200 }
  const rotateX = useSpring(y, springConfig)
  const rotateY = useSpring(x, springConfig)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = (mouseX / width - 0.5) * 20
    const yPct = (mouseY / height - 0.5) * -20
    x.set(xPct)
    y.set(yPct)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── NavBar ────────────────────────────────────────────────────────────────────

function NavBar() {
  const t = useTranslations('Nav')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'py-3 backdrop-blur-xl border-b border-white/10' : 'py-5'}`}>
      <div className={`max-w-6xl mx-auto px-4 rounded-full transition-all duration-500 ${scrolled ? 'bg-white/70 shadow-lg' : 'bg-transparent'}`}>
        <div className="h-14 flex items-center justify-between px-2">
          <Logo size="md" />
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-ocean-900 uppercase tracking-widest">
            <a href="#how-it-works" className="hover:text-brand transition-colors">{t('how')}</a>
            <a href="#features" className="hover:text-brand transition-colors">Features</a>
            <a href="#locations" className="hover:text-brand transition-colors">{t('locations')}</a>
            <a href="#faq" className="hover:text-brand transition-colors">{t('faq')}</a>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/login" className="text-sm font-black text-ocean-900 hover:text-brand transition-colors">{t('signIn')}</Link>
            <Link href="/dashboard" className="bg-brand text-white text-sm font-black px-6 py-3 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand/20">{t('findStorage')}</Link>
          </div>
          <button className="md:hidden p-2 rounded-xl bg-gray-50" onClick={() => setOpen(!open)}>
            {open ? <X size={22} className="text-ocean-900" /> : <Menu size={22} className="text-ocean-900" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            className="md:hidden glass-premium border-t border-white/20 mx-4 mt-2 rounded-[2rem] overflow-hidden">
            <div className="p-8 space-y-4">
              <a href="#how-it-works" onClick={() => setOpen(false)} className="block text-xl font-black text-ocean-900">{t('how')}</a>
              <a href="#features" onClick={() => setOpen(false)} className="block text-xl font-black text-ocean-900">Features</a>
              <a href="#locations" onClick={() => setOpen(false)} className="block text-xl font-black text-ocean-900">{t('locations')}</a>
              <a href="#faq" onClick={() => setOpen(false)} className="block text-xl font-black text-ocean-900">{t('faq')}</a>
              <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                 <Link href="/login" className="text-center font-black text-ocean-900 py-4 bg-gray-50 rounded-2xl">Sign In</Link>
                 <Link href="/dashboard" className="text-center bg-brand text-white font-black py-5 rounded-2xl shadow-xl shadow-brand/20">Find Storage</Link>
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
    <Tilt className="relative">
      <div className="absolute inset-0 bg-brand/30 rounded-[2.5rem] blur-3xl scale-110" />
      <div className="relative glass-premium border border-white/20 rounded-[2.5rem] p-5 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand/20 rounded-full blur-3xl" />
        
        <div className="bg-white rounded-3xl p-5 shadow-xl mb-4 relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center">
              <Check size={16} className="text-white" strokeWidth={3} />
            </div>
            <div>
              <p className="text-[12px] font-black text-ocean-900 leading-none mb-1">Booking Confirmed!</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Colombo Fort Hub</p>
            </div>
            <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 font-black px-3 py-1 rounded-full border border-emerald-100">Live</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Drop-off</p>
              <p className="text-[12px] font-black text-ocean-900 tracking-tight">Today, 2:00 PM</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Pick-up</p>
              <p className="text-[12px] font-black text-ocean-900 tracking-tight">Tomorrow, 9 AM</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl py-6 flex flex-col items-center gap-2 border border-gray-100/50">
            <QrCode size={32} className="text-ocean-900/40" />
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Show at counter</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-ocean-900 rounded-3xl p-4 relative z-10 border border-white/5">
          <div className="w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-400/20">
            <Check size={14} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-[11px] font-black text-white leading-none">Bags Locked & Secured</p>
            <p className="text-[10px] text-white/40 mt-1 font-bold">Photo proof uploaded</p>
          </div>
        </div>
      </div>
    </Tilt>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const t = useTranslations('Index')
  const cities = ['Colombo', 'Kandy', 'Galle', 'Ella', 'Mirissa', 'Negombo']
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % cities.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [cities.length])

  return (
    <section className="relative bg-ocean-900 overflow-hidden min-h-[95vh] flex items-center">
      {/* Premium Background Layering */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-900 via-ocean-900/70 to-transparent z-10" />
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-accent/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />

        <Image
          src="/images/marketing/srilanka-hero.png"
          alt="Sri Lanka Scenery"
          fill
          className="object-cover opacity-90 scale-105"
          priority
        />
        <div className="absolute inset-0 bg-ocean-900/30 backdrop-blur-[1px] z-5" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 pt-40 pb-20 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-24">
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex-1 text-center lg:text-left">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-3 glass-premium border border-white/20 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest mb-10 shadow-2xl shadow-brand/10">
              <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
              {t('vettedNetwork')}
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-[2.75rem] sm:text-7xl lg:text-8xl font-black text-white leading-[0.92] tracking-tighter mb-10">
              <span className="block opacity-90">{t('titleBefore')}</span>
              <span className="relative inline-block py-2">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={index}
                    initial={{ y: 50, opacity: 0, rotateX: -90, filter: 'blur(10px)' }}
                    animate={{ y: 0, opacity: 1, rotateX: 0, filter: 'blur(0px)' }}
                    exit={{ y: -50, opacity: 0, rotateX: 90, filter: 'blur(10px)' }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="text-brand inline-block"
                  >
                    {cities[index]}
                  </motion.span>
                </AnimatePresence>
                <div className="absolute -bottom-2 left-0 right-0 h-2 bg-brand/30 blur-lg rounded-full" />
              </span>
              <br className="hidden sm:block" />
              <span className="block mt-4 italic font-serif text-white/95">{t('titleAfter')}</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-white/60 text-lg sm:text-2xl max-w-xl mx-auto lg:mx-0 mb-12 leading-relaxed font-bold tracking-tight">
              {t('subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start mb-16">
              <Link href="/dashboard"
                className="group relative flex items-center justify-center gap-3 bg-brand text-white font-black px-12 py-6 rounded-3xl hover:scale-105 active:scale-95 transition-all text-xl shadow-[0_25px_60px_rgba(3,140,201,0.4)] overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 slant" />
                {t('findStorage')} <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#how-it-works"
                className="flex items-center justify-center gap-3 glass-premium border border-white/20 text-white font-black px-12 py-6 rounded-3xl hover:bg-white/20 transition-all text-xl backdrop-blur-xl">
                {t('howItWorks')} <ChevronDown size={20} className="animate-bounce" />
              </a>
            </motion.div>

            <motion.div variants={fadeUp} className="hidden sm:flex flex-wrap gap-4 justify-center lg:justify-start">
              {['Safety Seals Included','24/7 Monitoring','Up to LKR 150k Cover'].map(chip => (
                <span key={chip} className="flex items-center gap-3 bg-white/5 border border-white/10 text-white/80 text-xs font-black uppercase tracking-widest px-6 py-3 rounded-full backdrop-blur-sm hover:bg-white/10 transition-colors cursor-default">
                  <ShieldCheck size={16} className="text-brand" strokeWidth={3} /> {chip}
                </span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity:0, x:60 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4, duration:1, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block shrink-0 relative w-[620px] h-[480px]">
            <div className="absolute -top-16 -right-16 w-80 h-80 bg-brand/30 rounded-full blur-[120px] animate-pulse" />
            
            <div className="absolute inset-0 rounded-[4rem] overflow-hidden border border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] z-0 group">
               <Image
                 src="/images/marketing/srilanka-hero.png"
                 alt="Explore Sri Lanka"
                 fill
                 className="object-cover scale-110 group-hover:scale-125 transition-transform duration-[12s] ease-out"
               />
               <div className="absolute inset-0 bg-gradient-to-tr from-ocean-900/50 via-transparent to-white/5" />
            </div>
            
            <div className="absolute -bottom-16 -left-24 w-[400px] z-20 filter drop-shadow-[0_40px_60px_rgba(0,0,0,0.5)]">
               <AppPreviewCard />
            </div>
            
            <motion.div 
               animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-12 -right-10 glass-premium px-8 py-5 rounded-3xl shadow-2xl z-20 border border-white/20">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                    <ShieldCheck size={28} />
                 </div>
                 <div>
                   <p className="text-sm font-black text-white leading-none mb-1.5">Insured & Vetted</p>
                   <p className="text-xs text-white/50 font-bold uppercase tracking-wider">100% Secure Hubs</p>
                 </div>
               </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.8, duration:0.7 }}
          className="mt-28 sm:mt-36 grid grid-cols-3 gap-6 sm:gap-10 max-w-3xl mx-auto lg:mx-0">
          {[
            ['10+', t('stats.hubs')],
            ['5,000+', t('stats.travellers')],
            ['0', t('stats.bagsLost')]
          ].map(([v,l]) => (
            <div key={l} className="group glass-premium border border-white/10 rounded-[2.5rem] p-8 sm:p-10 text-center backdrop-blur-xl hover:bg-white/15 transition-all duration-500 cursor-default shadow-2xl">
              <p className="text-4xl sm:text-5xl font-black text-white mb-3 group-hover:scale-110 group-hover:text-brand transition-all duration-500">{v}</p>
              <p className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">{l}</p>
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
    <div className="bg-white border-b border-gray-100 py-10 px-4 overflow-hidden relative">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-16 gap-y-6">
        {[
          { icon: Shield,      text: t('vettedHub') },
          { icon: ShieldCheck, text: t('protection') },
          { icon: Lock,        text: t('seals') },
          { icon: CreditCard,  text: 'Secure Payment' },
          { icon: Star,        text: '5-Star Experience' },
        ].map(({ icon: Icon, text }) => (
          <motion.div 
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            key={text} className="flex items-center gap-3 text-xs sm:text-sm font-black text-gray-400 uppercase tracking-[0.15em] group cursor-default">
            <Icon size={18} className="text-brand group-hover:scale-125 transition-transform" />
            <span className="group-hover:text-ocean-900 transition-colors">{text}</span>
          </motion.div>
        ))}
      </div>
    </div>
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
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 300 : -300, behavior: 'smooth' })
  }

  return (
    <section id="how-it-works" className="bg-white py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true, margin: "-100px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="inline-block text-brand font-black text-xs uppercase tracking-widest mb-4">{t('tag')}</span>
            <h2 className="text-4xl sm:text-5xl font-black text-ocean-900 tracking-tight">{t('title')}</h2>
          </motion.div>

          <motion.div variants={fadeUp} className="md:hidden relative">
            <ScrollArrow dir="left"  onClick={() => scroll('left')}  visible={canLeft} />
            <ScrollArrow dir="right" onClick={() => scroll('right')} visible={canRight} />
            <div ref={scrollRef} onScroll={updateArrows} className="flex gap-6 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-10 scrollbar-hide">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={i} className="snap-start shrink-0 w-[85vw] max-w-[320px] bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-10 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-8 shadow-xl shadow-brand/10`}>
                    <s.icon size={28} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-black text-gray-200 uppercase tracking-widest block mb-4">{s.step}</span>
                  <h3 className="font-black text-ocean-900 text-24px mb-4">{t(`step${i+1}`)}</h3>
                  <p className="text-gray-500 text-base leading-relaxed">{t(`step${i+1}Desc`)}</p>
                </div>
              ))}
              <div className="shrink-0 w-8" />
            </div>
          </motion.div>

          <div className="hidden md:grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((s, i) => (
              <motion.div key={i} variants={fadeUp}
                className="group relative bg-white rounded-[2.5rem] border border-gray-100 p-10 hover:shadow-22xl hover:-translate-y-3 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.grad} flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500`}>
                  <s.icon size={28} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-xs font-black text-gray-200 uppercase tracking-widest block mb-4">{s.step}</span>
                <h3 className="font-black text-ocean-900 text-2xl mb-4 group-hover:text-brand transition-colors">{t(`step${i+1}`)}</h3>
                <p className="text-gray-500 text-base leading-relaxed">{t(`step${i+1}Desc`)}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function ScrollArrow({ dir, onClick, visible }: { dir: 'left' | 'right'; onClick: () => void; visible: boolean }) {
  if (!visible) return null
  return (
    <button onClick={onClick} className={`absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white border border-gray-100 rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all ${dir === 'left' ? 'left-0' : 'right-0'}`}>
      {dir === 'left' ? <ChevronLeft size={24} className="text-ocean-900" /> : <ChevronRight size={24} className="text-ocean-900" />}
    </button>
  )
}

// ── Features (Bento Box) ──────────────────────────────────────────────────────

function FeaturesSection() {
  const t = useTranslations('Sections.features')
  
  return (
    <section id="features" className="bg-gray-50/50 py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true, margin: "-100px" }} variants={stagger}>
          <motion.div variants={fadeUp} className="text-center mb-16">
            <span className="text-brand font-black text-xs uppercase tracking-widest block mb-4">{t('tag')}</span>
            <h2 className="text-4xl sm:text-5xl font-black text-ocean-900 tracking-tight">{t('title')}</h2>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-8 auto-rows-[280px]">
            {/* Main Feature - Bento 1 */}
            <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-4 lg:row-span-2 relative group overflow-hidden bg-ocean-900 rounded-[3rem] p-12 flex flex-col justify-end shadow-2xl shadow-ocean-900/20">
              <div className="absolute inset-0 bg-gradient-to-t from-ocean-900 via-ocean-900/40 to-transparent z-10" />
              <Image 
                src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80" 
                alt="Secure Storage" 
                fill 
                className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-[8s] ease-out" 
              />
              <div className="relative z-20">
                <div className="w-16 h-16 rounded-3xl bg-brand text-white flex items-center justify-center mb-8 shadow-2xl shadow-brand/20 backdrop-blur-sm border border-white/10">
                   <Shield size={32} strokeWidth={2.5} />
                </div>
                <h3 className="font-black text-white text-3xl sm:text-5xl mb-6 tracking-tight leading-none">{t('feature1')}</h3>
                <p className="text-white/70 text-lg sm:text-xl leading-relaxed max-w-md font-medium">{t('feature1Desc')}</p>
              </div>
            </motion.div>

            {/* Bento 2 - Wide */}
            <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-4 bg-emerald-50 border border-emerald-100 rounded-[3rem] p-10 flex flex-col justify-between group overflow-hidden relative shadow-xl hover:shadow-2xl transition-all duration-500">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200/20 rounded-full blur-[80px] -tr-10 group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/20">
                   <Lock size={30} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-black text-ocean-900 text-3xl mb-3 tracking-tight">{t('feature2')}</h3>
                  <p className="text-gray-500 text-lg leading-relaxed font-medium">{t('feature2Desc')}</p>
                </div>
              </div>
            </motion.div>

            {/* Bento 3 - Tall/Small */}
            <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-2 bg-violet-50 border border-violet-100 rounded-[3rem] p-10 group hover:shadow-2xl transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-violet-500 text-white flex items-center justify-center mb-8 shadow-xl shadow-violet-500/20 group-hover:rotate-[15deg] transition-transform duration-500">
                 <Smartphone size={26} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-ocean-900 text-2xl mb-4 tracking-tight">{t('feature3')}</h3>
              <p className="text-gray-500 text-base leading-relaxed font-medium">{t('feature3Desc')}</p>
            </motion.div>

            {/* Bento 4 - Small */}
            <motion.div variants={fadeUp} className="md:col-span-2 lg:col-span-2 bg-amber-50 border border-amber-100 rounded-[3rem] p-10 group hover:shadow-2xl transition-all duration-500">
              <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-8 shadow-xl shadow-amber-500/20 group-hover:scale-115 transition-transform duration-500">
                 <Clock size={26} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-ocean-900 text-2xl mb-4 tracking-tight">{t('feature4')}</h3>
              <p className="text-gray-500 text-base leading-relaxed font-medium">{t('feature4Desc')}</p>
            </motion.div>

            {/* Bento 5 - Wide Bottom */}
            <motion.div variants={fadeUp} className="md:col-span-4 lg:col-span-4 bg-white border border-gray-100 rounded-[3rem] p-12 flex flex-col sm:flex-row gap-10 items-center group hover:shadow-3xl transition-all duration-700">
               <div className="shrink-0 w-24 h-24 rounded-3xl bg-gray-50 shadow-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 border border-gray-100">
                  <Star size={44} className="text-brand-accent" fill="currentColor" />
               </div>
               <div>
                 <h3 className="font-black text-ocean-900 text-3xl mb-4 tracking-tight">{t('feature5')}</h3>
                 <p className="text-gray-500 text-lg leading-relaxed font-medium">{t('feature5Desc')}</p>
               </div>
            </motion.div>
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
    <section className="bg-white py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger} className="text-center mb-20">
          <motion.span variants={fadeUp} className="text-brand font-black text-xs uppercase tracking-[0.2em] block mb-4">{t('tag')}</motion.span>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-ocean-900 tracking-tight">{t('title')}</motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {REVIEWS.map((rev, i) => (
            <motion.div key={i} 
              initial={{ opacity:0, y:40 }} whileInView={{ opacity:1, y:0 }} viewport={{ once: true }} transition={{ delay: i*0.2, duration: 0.8, ease: "easeOut" }}
              className="bg-gray-50 rounded-[3rem] p-12 flex flex-col items-center text-center group hover:bg-white hover:shadow-3xl transition-all duration-700 relative">
              <div className="absolute top-8 right-8 text-6xl text-brand/5 font-black uppercase pointer-events-none select-none">"</div>
              <span className="text-6xl mb-8 grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-125">{rev.avatar}</span>
              <div className="flex gap-2 mb-8">
                {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="#f59e0b" className="text-amber-500" />)}
              </div>
              <p className="text-gray-600 text-lg leading-relaxed mb-10 italic font-medium opacity-80 group-hover:opacity-100 transition-opacity font-serif">&ldquo;Luggo made my Kandy trip so much easier. I dropped my heavy backpack and explored the temples freely.&rdquo;</p>
              <div className="mt-auto">
                <p className="font-black text-ocean-900 text-lg tracking-tight">{rev.name}</p>
                <p className="text-xs text-brand font-black uppercase tracking-[0.15em] mt-2">{rev.role}</p>
              </div>
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
    <section className="bg-ocean-900 py-32 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/10 rounded-full blur-[150px] -mr-80 -mt-80" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-[150px] -ml-80 -mb-80" />
      
      <div className="relative z-10 max-w-6xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger}>
          <motion.span variants={fadeUp} className="text-brand font-black text-xs uppercase tracking-[0.2em] block mb-6">Pricing</motion.span>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-6xl font-black text-white mb-20 tracking-tighter">Simple Transparent Rates</motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {bags.map(item => (
              <motion.div key={item.t} variants={fadeUp}
                className={`relative glass-premium border border-white/10 rounded-[3rem] p-12 text-center transition-all duration-700 hover:bg-white/15 group ${item.popular ? 'border-brand/40 shadow-3xl shadow-brand/20 scale-105 z-20' : ''}`}>
                {item.popular && (
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand text-white text-[12px] font-black uppercase px-8 py-2.5 rounded-full shadow-2xl shadow-brand/40 tracking-widest">Most Popular</span>
                )}
                <span className="text-7xl block mb-10 group-hover:scale-125 transition-transform duration-700 drop-shadow-2xl">{item.e}</span>
                <h3 className="font-black text-white text-3xl mb-8 tracking-tight">{item.t} Bag</h3>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-black text-white">LKR {item.r}</span>
                  <span className="text-sm font-bold text-white/30 uppercase tracking-widest">/ hr</span>
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
    <section id="locations" className="bg-white py-24 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger} className="text-center mb-20">
          <motion.span variants={fadeUp} className="text-brand font-black text-xs uppercase tracking-[0.2em] block mb-4">Coverage</motion.span>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-ocean-900 tracking-tight">{nt('locations')}</motion.h2>
        </motion.div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {CITY_LOCATIONS.map((c, i) => (
            <motion.div key={i} variants={fadeUp}>
              <Link href="/dashboard" className="group block text-center">
                <div className="relative aspect-square rounded-[2.5rem] overflow-hidden mb-8 border-4 border-gray-50 p-2 group-hover:border-brand/30 group-hover:shadow-3xl transition-all duration-700">
                  <div className="relative w-full h-full rounded-[2rem] overflow-hidden">
                    <Image src={c.img} alt={c.city} fill className="object-cover group-hover:scale-125 transition-transform duration-1000 ease-out" />
                    <div className="absolute inset-0 bg-ocean-900/10 group-hover:bg-transparent transition-colors duration-700" />
                  </div>
                </div>
                <p className="font-black text-ocean-900 text-sm group-hover:text-brand transition-colors uppercase tracking-[0.15em]">{c.city}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

function FaqSection() {
  const nt = useTranslations('Nav')
  return (
    <section id="faq" className="bg-gray-50/50 py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={stagger} className="text-center mb-16">
          <motion.span variants={fadeUp} className="text-brand font-black text-xs uppercase tracking-[0.2em] block mb-4">{nt('faq')}</motion.span>
          <motion.h2 variants={fadeUp} className="text-4xl font-black text-ocean-900 tracking-tight">Got Questions?</motion.h2>
        </motion.div>
        
        <div className="space-y-5">
          {[1,2,3,4].map(q => (
            <motion.div key={q} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once:true }} transition={{ delay: q*0.1 }}>
              <details className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700">
                <summary className="flex items-center justify-between p-10 cursor-pointer list-none font-black text-ocean-900 text-lg sm:text-xl tracking-tight">
                  {q === 1 ? "How does it work?" : q === 2 ? "Is it safe?" : q === 3 ? "What can I store?" : "How much does it cost?"}
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-open:bg-brand group-open:text-white transition-all duration-500 shadow-inner">
                    <ChevronDown size={22} className="group-open:rotate-180 transition-transform duration-500" />
                  </div>
                </summary>
                <div className="px-10 pb-10 text-gray-500 text-lg leading-relaxed border-t border-gray-50 pt-6 font-medium opacity-80">
                  {q === 1 ? "Just find a spot on the map, book online, and drop your bags. Every hub is vetted and secure." : "Yes, absolutely. We use tamper-proof seals and each bag is insured up to LKR 150,000 for your peace of mind."}
                </div>
              </details>
            </motion.div>
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
    <section className="bg-white py-20 px-4 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
           className="bg-brand rounded-[4rem] p-16 sm:p-32 text-center relative overflow-hidden shadow-[0_50px_100px_-20px_rgba(3,140,201,0.5)]">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-[100px] animate-pulse" />
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-7xl font-black text-white mb-10 tracking-tighter">Explore Sri Lanka Hands-Free</h2>
            <Link href="/dashboard" className="group inline-flex items-center gap-3 bg-white text-brand font-black px-12 py-6 rounded-3xl hover:scale-110 active:scale-95 transition-all text-xl shadow-2xl">
              {t('findStorage')} <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-ocean-900 border-t border-white/5 text-white/30 py-32 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-16">
          <div>
            <Logo size="md" />
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] opacity-50">Trusted Islandwide</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-xs sm:text-sm font-black uppercase tracking-[0.25em]">
            <a href="#how-it-works" className="hover:text-white transition-colors">How</a>
            <a href="#locations" className="hover:text-white transition-colors">Locations</a>
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-white transition-colors">Privacy</a>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs font-black uppercase tracking-widest mb-2 text-white/60">© 2026 Luggo Sri Lanka</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Designed for Modern Travellers</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-ocean-900 antialiased selection:bg-brand selection:text-white">
      <NavBar theme="light" />
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
