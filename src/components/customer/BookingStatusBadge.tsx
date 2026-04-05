import { Badge } from '@/components/ui/Badge'
import { type BookingStatus } from '@/types/database'

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }
> = {
  pending_payment:                  { label: 'Awaiting Payment',     variant: 'warning' },
  confirmed:                        { label: 'Confirmed',             variant: 'info'    },
  arrived:                          { label: 'At the Hub',            variant: 'info'    },
  sealing_in_progress:              { label: 'Staff Packing Bags',    variant: 'purple'  },
  sealed_waiting_user_confirmation: { label: 'Confirm Your Bags',    variant: 'warning' },
  active_storage:                   { label: 'Bags Secured',          variant: 'success' },
  pickup_requested:                 { label: 'Retrieving Your Bags',  variant: 'info'    },
  completed:                        { label: 'Collected',             variant: 'success' },
  cancelled:                        { label: 'Cancelled',             variant: 'danger'  },
  expired:                          { label: 'Expired',               variant: 'danger'  },
  overstayed:                       { label: 'Time Exceeded',         variant: 'danger'  },
  disputed:                         { label: 'Under Review',          variant: 'danger'  },
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
