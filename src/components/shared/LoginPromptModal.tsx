'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogIn, X, Luggage } from 'lucide-react'

interface LoginPromptModalProps {
  open: boolean
  onClose: () => void
}

export function LoginPromptModal({ open, onClose }: LoginPromptModalProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg"
          >
            <div className="bg-white rounded-t-[2.5rem] p-8 pb-12 shadow-2xl">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={16} />
              </button>

              {/* Icon */}
              <div className="h-16 w-16 rounded-3xl bg-ocean-50 flex items-center justify-center mb-5">
                <Luggage size={32} className="text-brand" />
              </div>

              <h2 className="text-2xl font-extrabold text-ocean-900 mb-2">
                Sign in to book
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Create a free account to book storage, track your bags, and manage your bookings — all in one place.
              </p>

              <div className="space-y-3">
                <Link
                  href={`/login?returnTo=${encodeURIComponent(pathname)}`}
                  className="flex items-center justify-center gap-2 w-full bg-brand text-white font-bold py-4 rounded-2xl hover:bg-brand/90 transition-colors"
                >
                  <LogIn size={18} />
                  Sign in / Create account
                </Link>
                <button
                  onClick={onClose}
                  className="w-full text-gray-400 font-medium py-2 text-sm hover:text-gray-600 transition-colors"
                >
                  Continue browsing
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
