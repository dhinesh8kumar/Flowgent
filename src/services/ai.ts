import Groq from 'groq-sdk';
import { ParsedBookingIntent } from '../types';
import { logger } from '../utils/logger';

let _groq: Groq | null = null;
const getGroq = (): Groq => {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
};

const MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile';

const SYSTEM_PROMPT = `You are an AI assistant for a water tanker booking service in Hyderabad, India.
Your job is to understand customer messages and extract booking information.

Always respond with a valid JSON object (no markdown, no explanation) with this exact shape:
{
  "intent": "book" | "cancel" | "status" | "pricing" | "greeting" | "unknown",
  "quantityKL": <number or null>,
  "date": "<ISO date string YYYY-MM-DD or null>",
  "timeSlot": "morning" | "afternoon" | "evening" | "any" | null,
  "locality": "<area name in Hyderabad or null>",
  "address": "<full address or null>",
  "confidence": <0.0 to 1.0>,
  "missingFields": ["field1", "field2"],
  "responseMessage": "<friendly reply to send back to customer>"
}

Rules:
- Today is ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
- "tomorrow" = next calendar day in IST
- Quantities: "10KL", "10 kilolitres", "1 tanker" = 10KL, "big tanker" = 12KL
- Time slots: morning = 6AM-12PM, afternoon = 12PM-5PM, evening = 5PM-8PM
- missingFields lists what is still needed: "quantityKL", "date", "locality"
- responseMessage should be warm and guide the customer to complete the booking`;

export interface AIContext {
  customerName?: string;
  previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  pendingBooking?: Partial<ParsedBookingIntent>;
}

export const parseBookingIntent = async (
  message: string,
  context: AIContext = {}
): Promise<ParsedBookingIntent> => {
  try {
    const groq = getGroq();

    const conversationMessages: Groq.Chat.ChatCompletionMessageParam[] = [];

    if (context.previousMessages?.length) {
      conversationMessages.push(...context.previousMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })));
    }

    let userPrompt = message;
    if (context.pendingBooking && Object.keys(context.pendingBooking).length > 0) {
      userPrompt = `[Pending booking context: ${JSON.stringify(context.pendingBooking)}]\nCustomer: ${message}`;
    }

    conversationMessages.push({ role: 'user', content: userPrompt });

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationMessages],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as ParsedBookingIntent;
    parsed.rawText = message;

    logger.debug('AI parsed intent', { message, intent: parsed.intent });
    return parsed;
  } catch (err) {
    logger.error('parseBookingIntent error', err);
    return {
      intent: 'unknown',
      confidence: 0,
      rawText: message,
      missingFields: [],
      responseMessage:
        'Sorry, I could not understand that. Please tell me:\n1. How many KL of water?\n2. Which area in Hyderabad?\n3. When do you need it?',
    };
  }
};
