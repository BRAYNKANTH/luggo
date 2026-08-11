'use client'

import { motion } from 'framer-motion'
import { Logo } from '@/components/ui/Logo'
import { Wrench, ShieldAlert, Mail, AlertTriangle } from 'lucide-react'
import { Link } from '@/navigation'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#011a2e] text-white flex flex-col justify-between relative overflow-hidden font-sans selection:bg-brand/30 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Logo variant="white" size="md" />
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-brand-accent border border-brand-accent/30 animate-pulse-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent inline-block" />
            Maintenance Mode
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 shadow-2xl text-center"
        >
          {/* Animated Wrench / Alert Icon */}
          <div className="flex justify-center mb-8">
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-20 h-20 bg-gradient-to-tr from-brand to-blue-500 rounded-3xl flex items-center justify-center shadow-lg shadow-brand/20 relative"
            >
              <Wrench className="w-10 h-10 text-white" />
              <motion.div 
                className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-1 border-2 border-[#011a2e]"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertTriangle className="w-3 h-3 text-[#011a2e]" strokeWidth={3} />
              </motion.div>
            </motion.div>
          </div>

          {/* Heading English */}
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-3">
            Luggo is currently improving.
          </h1>
          {/* Subheading English */}
          <p className="text-xl md:text-2xl font-bold text-brand-accent mb-6">
            Bookings are temporarily unavailable
          </p>

          <hr className="border-white/10 my-6" />

          {/* Description Multi-lingual */}
          <div className="space-y-6 text-sm md:text-base text-gray-300 text-left md:text-center leading-relaxed">
            {/* English */}
            <div className="border-l-4 border-brand pl-4 md:border-l-0 md:pl-0">
              <p>
                We are performing essential system enhancements to provide you with a faster, safer, and more reliable luggage storage network across Sri Lanka.
              </p>
            </div>

            {/* Sinhala */}
            <div className="border-l-4 border-amber-500 pl-4 md:border-l-0 md:pl-0">
              <p className="font-semibold text-white/90">
                Luggo සේවාව මේ වන විට වැඩිදියුණු වෙමින් පවතී.
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                ශ්‍රී ලංකාව පුරා වඩාත් පහසු සහ ආරක්ෂිත ගමන් මලු තැන්පත් කිරීමේ සේවාවක් සැපයීම සඳහා අපගේ තාක්ෂණික පද්ධති මේ වන විට යාවත්කාලීන වෙමින් පවතී.
              </p>
            </div>

            {/* Tamil */}
            <div className="border-l-4 border-emerald-500 pl-4 md:border-l-0 md:pl-0">
              <p className="font-semibold text-white/90">
                Luggo தற்பொழுது மேம்படுத்தப்பட்டு வருகின்றது.
              </p>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                இலங்கை முழுவதும் இன்னும் விரைவான மற்றும் பாதுகாப்பான முறையில் உங்களது பயணப் பொதிகளை பாதுகாக்கும் வகையில் எங்களது தொழில்நுட்ப அமைப்புகளை மேம்படுத்தி வருகிறோம்.
              </p>
            </div>
          </div>

          <hr className="border-white/10 my-8" />

          {/* Urgent Support Section */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div>
              <h3 className="font-bold text-white text-sm md:text-base flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-brand-accent" />
                Existing Booking Pickups
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 max-w-sm">
                Need to retrieve your luggage at a hub? Staff remain active on-site to handle your bag check-outs.
              </p>
            </div>
            <a 
              href="mailto:support@luggo.lk"
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-200"
            >
              <Mail className="w-4 h-4 text-brand" />
              support@luggo.lk
            </a>
          </div>
        </motion.div>
      </main>

      {/* Footer & Secret Access portal */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-white/5 z-10 text-xs text-gray-500">
        <div>
          © {new Date().getFullYear()} Luggo. All rights reserved.
        </div>

        {/* Access portals */}
        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="hover:text-white transition-colors py-1 px-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            Staff Portal
          </Link>
          <span className="text-white/10">•</span>
          <Link 
            href="/login" 
            className="hover:text-white transition-colors py-1 px-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            Admin Access
          </Link>
        </div>
      </footer>
    </div>
  )
}
