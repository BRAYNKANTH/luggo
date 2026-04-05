import { 
  UtensilsCrossed, Coffee, Hotel, ShoppingBag, 
  Camera, TrainFront, Waves, Building2, Landmark, MapPinned 
} from 'lucide-react'
import React from 'react'

export const CAT_CONFIG: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  Restaurant:   { icon: <UtensilsCrossed size={14} />, bg: 'bg-orange-50',  text: 'text-orange-500' },
  Cafe:         { icon: <Coffee size={14} />,          bg: 'bg-amber-50',   text: 'text-amber-600'  },
  Hotel:        { icon: <Hotel size={14} />,           bg: 'bg-blue-50',    text: 'text-blue-500'   },
  Shopping:     { icon: <ShoppingBag size={14} />,     bg: 'bg-pink-50',    text: 'text-pink-500'   },
  Attraction:   { icon: <Camera size={14} />,          bg: 'bg-purple-50',  text: 'text-purple-500' },
  Transport:    { icon: <TrainFront size={14} />,      bg: 'bg-green-50',   text: 'text-green-600'  },
  Beach:        { icon: <Waves size={14} />,           bg: 'bg-cyan-50',    text: 'text-cyan-500'   },
  Hospital:     { icon: <Building2 size={14} />,       bg: 'bg-red-50',     text: 'text-red-500'    },
  'Bank / ATM': { icon: <Landmark size={14} />,        bg: 'bg-emerald-50', text: 'text-emerald-600'},
  Other:        { icon: <MapPinned size={14} />,       bg: 'bg-gray-50',    text: 'text-gray-500'   },
}

export function getConfig(category: string) {
  return CAT_CONFIG[category] ?? CAT_CONFIG['Other']
}
