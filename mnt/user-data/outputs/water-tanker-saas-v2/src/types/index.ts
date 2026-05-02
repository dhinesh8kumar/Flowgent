import { Request } from 'express';
import { Tenant, User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  tenant?: Tenant;
  user?: Omit<User, 'passwordHash'>;
  tenantId?: string;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface WhatsAppWebhookBody {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'interactive';
  text?: { body: string };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export interface ParsedBookingIntent {
  intent: 'book' | 'cancel' | 'status' | 'pricing' | 'greeting' | 'unknown';
  quantityKL?: number;
  date?: string;
  timeSlot?: 'morning' | 'afternoon' | 'evening' | 'any';
  locality?: string;
  address?: string;
  confidence: number;
  rawText: string;
  missingFields: string[];
  responseMessage: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
