// Auto-generated Supabase database types for Luggo
// Keep in sync with schema.sql

export type UserRole = 'customer' | 'hub_staff' | 'support_admin' | 'ops_admin' | 'master_admin'
export type BagType = 'small' | 'regular' | 'large'
export type BookingStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'arrived'
  | 'sealing_in_progress'
  | 'sealed_waiting_user_confirmation'
  | 'active_storage'
  | 'pickup_requested'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'overstayed'
  | 'disputed'
export type PaymentType = 'booking' | 'late_fee' | 'extension'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type RefundStatus = 'pending' | 'approved' | 'rejected' | 'processed'
export type ComplaintStatus = 'open' | 'in_review' | 'resolved' | 'closed'
export type NotificationType =
  | 'booking_confirmed'
  | 'seal_ready'
  | 'pickup_reminder'
  | 'late_fee'
  | 'complaint_update'
  | 'general'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          nic_passport: string | null
          role: UserRole
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      hubs: {
        Row: {
          id: string
          name: string
          alias: string
          location: string
          address: string
          capacity: number
          open_time: string
          close_time: string
          active: boolean
          active_days: string[]
          image_url: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['hubs']['Row'], 'id' | 'created_at'> & { active_days?: string[] }
        Update: Partial<Database['public']['Tables']['hubs']['Insert']>
      }
      hub_staff: {
        Row: {
          id: string
          user_id: string
          hub_id: string
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['hub_staff']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['hub_staff']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          hub_id: string
          status: BookingStatus
          start_time: string
          end_time: string
          total_price: number
          qr_code: string
          id_verified: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at'> & { id_verified?: boolean }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      booking_bags: {
        Row: {
          id: string
          booking_id: string
          bag_type: BagType
          sticker_number: string | null
          hub_alias: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['booking_bags']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['booking_bags']['Insert']>
      }
      sticker_batches: {
        Row: {
          id: string
          hub_id: string
          prefix: string
          from_number: number
          to_number: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sticker_batches']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sticker_batches']['Insert']>
      }
      sticker_assignments: {
        Row: {
          id: string
          booking_bag_id: string
          sticker_number: string
          assigned_by_staff_id: string
          assigned_at: string
        }
        Insert: Omit<Database['public']['Tables']['sticker_assignments']['Row'], 'id' | 'assigned_at'>
        Update: Partial<Database['public']['Tables']['sticker_assignments']['Insert']>
      }
      seal_proofs: {
        Row: {
          id: string
          booking_id: string
          photo_url: string
          uploaded_by_staff_id: string
          uploaded_at: string
          confirmed_by_user_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['seal_proofs']['Row'], 'id' | 'uploaded_at'>
        Update: Partial<Database['public']['Tables']['seal_proofs']['Insert']>
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount: number
          status: PaymentStatus
          gateway_ref: string | null
          type: PaymentType
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      refunds: {
        Row: {
          id: string
          payment_id: string
          amount: number
          reason: string
          status: RefundStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['refunds']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['refunds']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          message: string
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      complaints: {
        Row: {
          id: string
          booking_id: string
          user_id: string
          description: string
          status: ComplaintStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['complaints']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['complaints']['Insert']>
      }
      nearby_places: {
        Row: {
          id: string
          hub_id: string
          name: string
          category: string
          description: string | null
          distance_km: number
          map_url: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['nearby_places']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nearby_places']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string
          actor_role: UserRole
          action: string
          entity: string
          entity_id: string
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>
        Update: never
      }
    }
  }
}
