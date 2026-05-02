const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (msg: string, meta?: unknown): void => {
    console.info(`[INFO]  ${new Date().toISOString()} ${msg}`, meta ?? '');
  },
  warn: (msg: string, meta?: unknown): void => {
    console.warn(`[WARN]  ${new Date().toISOString()} ${msg}`, meta ?? '');
  },
  error: (msg: string, meta?: unknown): void => {
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta ?? '');
  },
  debug: (msg: string, meta?: unknown): void => {
    if (isDev) {
      console.info(`[DEBUG] ${new Date().toISOString()} ${msg}`, meta ?? '');
    }
  },
};
