import { redactForLog, redactString } from './privacy';

export function safeError(message: string, err?: unknown): void {
  const text = redactString(message);
  if (err === undefined) {
    console.error(text);
    return;
  }
  console.error(text, redactForLog(err));
}

export function safeWarn(message: string, err?: unknown): void {
  const text = redactString(message);
  if (err === undefined) {
    console.warn(text);
    return;
  }
  console.warn(text, redactForLog(err));
}
