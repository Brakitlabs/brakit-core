type LogPayload =
  | string
  | { message: string; context?: Record<string, unknown> };

const formatMessage = (payload: LogPayload) => {
  if (typeof payload === "string") {
    return payload;
  }

  const { message, context } = payload;
  if (!context || Object.keys(context).length === 0) {
    return message;
  }

  return `${message} ${JSON.stringify(context)}`;
};

export const logger = {
  info: (payload: LogPayload) =>
    console.log(`[INFO] ${formatMessage(payload)}`),
  warn: (payload: LogPayload) =>
    console.warn(`[WARN] ${formatMessage(payload)}`),
  error: (payload: LogPayload) =>
    console.error(`[ERROR] ${formatMessage(payload)}`),
};
