import axios from 'axios';
import { logger } from '../utils/logger';
import { decrypt } from '../utils/crypto'

const WA_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v19.0';
const BASE_URL = `https://graph.facebook.com/${WA_VERSION}`;

interface SendTextOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  message: string;
}

interface SendButtonsOptions extends SendTextOptions {
  buttons: Array<{ id: string; title: string }>;
  bodyText: string;
}

interface SendTemplateOptions {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode?: string;
  parameters: string[];
}

export const sendTextMessage = async (opts: SendTextOptions): Promise<string | null> => {
  const { phoneNumberId, accessToken, to, message } = opts;
  try {
    const res = await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: message, preview_url: false },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return res.data?.messages?.[0]?.id ?? null;
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    logger.error('sendTextMessage failed', error?.response?.data ?? error?.message);
    return null;
  }
};

export const sendButtonMessage = async (opts: SendButtonsOptions): Promise<string | null> => {
  const { phoneNumberId, accessToken, to, bodyText, buttons } = opts;
  try {
    const res = await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
          },
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return res.data?.messages?.[0]?.id ?? null;
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    logger.error('sendButtonMessage failed', error?.response?.data ?? error?.message);
    return null;
  }
};

export const sendTemplateMessage = async (opts: SendTemplateOptions): Promise<string | null> => {
  const {
    phoneNumberId,
    accessToken,
    to,
    templateName,
    languageCode = 'en',
    parameters,
  } = opts;

  try {
    const res = await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: parameters.map((text) => ({
                type: 'text',
                text,
              })),
            },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
    return res.data?.messages?.[0]?.id ?? null;
  } catch (err: unknown) {
    const error = err as { response?: { data?: unknown }; message?: string };
    logger.error('sendTemplateMessage failed', error?.response?.data ?? error?.message);
    return null;
  }
};

export const markMessageRead = async (
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> => {
  try {
    await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      { messaging_product: 'whatsapp', status: 'read', message_id: messageId },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );
  } catch {
    // best effort
  }
};

export const getTenantWAConfig = (tenant: {
  whatsappPhoneId?: string | null
  whatsappToken?: string | null
}) => {
  return {
    phoneNumberId: tenant.whatsappPhoneId
      ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
    accessToken: tenant.whatsappToken
      ? decrypt(tenant.whatsappToken)          // ← decrypt on read
      : process.env.WHATSAPP_ACCESS_TOKEN ?? '',
  }
}
