import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  variant?: 'default' | 'white'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }
const iconSizes = { sm: 18, md: 24, lg: 40 }

export function Logo({ className, variant = 'default', size = 'md' }: LogoProps) {
  const textColor = variant === 'white' ? 'text-white' : 'text-ocean-900'
  const dotColor = variant === 'white' ? 'text-brand-accent' : 'text-brand'
  const iconColor = variant === 'white' ? '#f0c040' : '#038cc9'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <svg
        width={iconSizes[size]}
        height={iconSizes[size]}
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M8 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect x="2" y="7" width="18" height="13" rx="2" fill={iconColor} />
        <rect x="2" y="12" width="18" height="2" fill={variant === 'white' ? '#011a2e' : '#ffffff'} fillOpacity="0.3" />
        <rect x="9" y="10" width="4" height="4" rx="1" fill={variant === 'white' ? '#ffffff' : '#f0c040'} />
      </svg>
      <span className={cn('font-extrabold tracking-tight', sizes[size], textColor)}>
        Lugg<span className={dotColor}>o</span>
      </span>
    </div>
  )
}
