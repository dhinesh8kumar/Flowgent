import { Booking, Customer, Tenant } from '@prisma/client'
import { getTenantWAConfig, sendTemplateMessage } from './whatsapp'
import { logger } from '../utils/logger'

type TenantWithAlerts = Pick<
  Tenant,
  'id' | 'name' | 'slug' | 'whatsappPhoneId' | 'whatsappToken' | 'notificationWhatsappNumber' | 'bookingAlertsEnabled'
>

type BookingAlertPayload = {
  tenant: TenantWithAlerts
  booking: Pick<
    Booking,
    'bookingRef' | 'serviceName' | 'scheduledDate' | 'scheduledSlot' | 'deliveryAddress' | 'locality' | 'totalAmount'
  >
  customer: Pick<Customer, 'name' | 'whatsappPhone'>
}

export class TenantNotificationService {
  private readonly templateName = process.env.WHATSAPP_TENANT_ALERT_TEMPLATE ?? 'tenant_booking_alert_v1'
  private readonly templateLanguage = process.env.WHATSAPP_TENANT_ALERT_TEMPLATE_LANG ?? 'en'
  private readonly dashboardBaseUrl = process.env.DASHBOARD_BASE_URL ?? 'http://localhost:5173'

  async sendBookingAlert(payload: BookingAlertPayload): Promise<void> {
    const { tenant, booking, customer } = payload

    if (!tenant.bookingAlertsEnabled) return

    const to = this.normalisePhone(tenant.notificationWhatsappNumber)
    if (!to) {
      logger.info(`Tenant ${tenant.slug} has no notification WhatsApp number configured`)
      return
    }

    const { phoneNumberId, accessToken } = getTenantWAConfig(tenant)
    if (!phoneNumberId || !accessToken) {
      logger.warn(`Tenant ${tenant.slug} is missing WhatsApp sender configuration for booking alerts`)
      return
    }

    const dashboardUrl = `${this.dashboardBaseUrl.replace(/\/$/, '')}/bookings`
    const amount = booking.totalAmount != null ? `INR ${booking.totalAmount}` : 'Pending'
    const customerName = customer.name?.trim() || 'Unknown'
    const address = booking.locality
      ? `${booking.locality} - ${booking.deliveryAddress}`
      : booking.deliveryAddress

    const messageId = await sendTemplateMessage({
      phoneNumberId,
      accessToken,
      to,
      templateName: this.templateName,
      languageCode: this.templateLanguage,
      parameters: [
        booking.bookingRef,
        customerName,
        customer.whatsappPhone,
        booking.serviceName,
        amount,
        booking.scheduledDate.toLocaleDateString('en-IN'),
        booking.scheduledSlot || 'Any time',
        address,
        dashboardUrl,
      ],
    })

    if (messageId) {
      logger.info(`Tenant alert sent for booking ${booking.bookingRef} to ${to}`)
      return
    }

    logger.warn(`Tenant alert send failed for booking ${booking.bookingRef} to ${to}`)
  }

  private normalisePhone(input?: string | null): string | null {
    if (!input) return null
    const trimmed = input.trim()
    if (!trimmed) return null
    return trimmed.replace(/\D/g, '')
  }
}
