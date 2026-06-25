'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils/cn'
import { motion } from 'framer-motion'

interface LogoProps {
  className?: string
  variant?: 'default' | 'white'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }
const iconSizes = { sm: 24, md: 32, lg: 56 }

export function Logo({ className, variant = 'default', size = 'md' }: LogoProps) {
  return (
    <motion.div 
      className={cn('flex items-center gap-2 cursor-pointer', className)}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <motion.div 
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: iconSizes[size], height: iconSizes[size] * 1.5 }}
        variants={{
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20 } },
          hover: { 
            rotate: [0, -10, 10, -5, 5, 0],
            scale: 1.05,
            transition: { duration: 0.5 }
          }
        }}
      >
        <Image
          src="/logo.png"
          alt="Luggo Logo"
          fill
          className={cn(
            "object-contain",
            variant === 'white' 
              ? "mix-blend-screen invert grayscale brightness-200" 
              : "mix-blend-multiply"
          )}
          priority
        />
      </motion.div>
      <motion.span 
        className={cn('font-extrabold tracking-tight', sizes[size], variant === 'white' ? 'text-white' : 'text-[#042258]')}
        variants={{
          initial: { x: -10, opacity: 0 },
          animate: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20, delay: 0.1 } }
        }}
      >
        Lugg<span className={variant === 'white' ? 'text-blue-400' : 'text-[#0055ff]'}>o</span>
      </motion.span>
    </motion.div>
  )
}
