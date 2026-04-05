interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  sub?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}

const VARIANTS = {
  default: 'bg-white border-gray-100 shadow-sm hover:shadow-xl hover:border-brand/20 group',
  warning: 'bg-amber-50 border-amber-100 shadow-amber-900/5 hover:shadow-amber-900/10 hover:border-amber-200 group',
  danger:  'bg-red-50  border-red-100 shadow-red-900/5 hover:shadow-red-900/10 hover:border-red-200 group',
  success: 'bg-emerald-50 border-emerald-100 shadow-emerald-900/5 hover:shadow-emerald-900/10 hover:border-emerald-200 group',
}

const ICON_VARIANTS = {
  default: 'bg-brand/10 text-brand group-hover:bg-brand group-hover:text-white',
  warning: 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white',
  danger:  'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white',
  success: 'bg-emerald-600/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
}

export function StatCard({
  label,
  value,
  icon,
  sub,
  variant = 'default',
}: StatCardProps) {
  return (
    <div className={`rounded-[2rem] border p-6 md:p-8 transition-all duration-500 flex flex-col justify-between h-full bg-white relative overflow-hidden ${VARIANTS[variant]}`}>
       {/* Glassmorphic Background Detail */}
       <div className={`absolute right-[-10%] top-[-10%] w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${ICON_VARIANTS[variant].split(' ')[0]}`} />
       
       <div className="relative z-10 flex items-start justify-between">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${ICON_VARIANTS[variant]}`}>
             {icon}
          </div>
          {variant !== 'default' && (
             <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
          )}
       </div>

       <div className="mt-8 relative z-10">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
             <p className="text-3xl md:text-4xl font-black text-ocean-900 tracking-tighter leading-none">{value}</p>
          </div>
          {sub && (
             <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tight italic opacity-70">
                {sub}
             </p>
          )}
       </div>
    </div>
  )
}
