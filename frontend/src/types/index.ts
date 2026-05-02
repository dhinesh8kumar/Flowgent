export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'
export type TankerStatus = 'IDLE' | 'DISPATCHED' | 'EN_ROUTE' | 'DELIVERING' | 'MAINTENANCE'
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'

export interface Tenant {
  id: string; name: string; slug: string; city: string
  plan: 'STARTER' | 'GROWTH' | 'ENTERPRISE'; isActive: boolean
  whatsappPhoneId?: string; createdAt: string
  _count?: { users: number; tankers: number; bookings: number; customers: number }
}

export interface User {
  id: string; tenantId: string; name: string; email: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR'; isActive: boolean
  lastLoginAt?: string; createdAt: string; tenant: Tenant
}

export interface Customer {
  id: string; tenantId: string; whatsappPhone: string
  name?: string; locality?: string; address?: string
  totalBookings: number; isBlocked: boolean; createdAt: string
}

export interface Tanker {
  id: string; tenantId: string; vehicleNo: string; capacityKL: number
  driverName: string; driverPhone: string; isAvailable: boolean
  status: TankerStatus; createdAt: string
  _count?: { bookings: number }
}

export interface Booking {
  id: string; tenantId: string; customerId: string; tankerId?: string
  bookingRef: string; quantityKL: number; scheduledDate: string
  scheduledSlot?: string; deliveryAddress: string; locality?: string
  notes?: string; status: BookingStatus; pricePerKL?: number
  totalAmount?: number; paymentStatus: PaymentStatus
  confirmedAt?: string; dispatchedAt?: string; deliveredAt?: string
  cancelledAt?: string; createdAt: string
  source: 'WHATSAPP' | 'DASHBOARD' | 'API'; aiParsed: boolean
  customer?: { name?: string; whatsappPhone: string }
  tanker?: { vehicleNo: string; driverName: string; driverPhone: string }
}

export interface DashboardStats {
  todayBookings: number; pendingBookings: number
  totalRevenue: number; totalCustomers: number
}
