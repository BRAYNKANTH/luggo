'use client'

import { Badge } from '@/components/ui/Badge'
import { type BookingStatus } from '@/types/database'
import { useTranslations } from 'next-intl'

const STATUS_CONFIG: Record<
  BookingStatus,
  { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }
> = {
  pending_payment:                  { variant: 'warning' },
  early_checkin_pending_payment:    { variant: 'warning' },
  confirmed:                        { variant: 'info'    },
  arrived:                          { variant: 'info'    },
  sealing_in_progress:              { variant: 'purple'  },
  sealed_waiting_user_confirmation: { variant: 'warning' },
  active_storage:                   { variant: 'success' },
  pickup_requested:                 { variant: 'info'    },
  completed:                        { variant: 'success' },
  cancelled:                        { variant: 'danger'  },
  expired:                          { variant: 'danger'  },
  overstayed:                       { variant: 'danger'  },
  disputed:                         { variant: 'danger'  },
  identity_verified:                { variant: 'info'    },
  late_fee_pending:                 { variant: 'warning' },
  ready_for_release:                { variant: 'success' },
  exception_hold:                   { variant: 'danger'  },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations('Statuses')
  const config = STATUS_CONFIG[status] ?? { variant: 'default' as const }
  
  return (
    <Badge variant={config.variant}>
      {t(status)}
    </Badge>
  )
}
