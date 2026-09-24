export const passwordLimitMessage = 'Password must be at most 72 UTF-8 bytes; some characters use more than one byte.';

export function fitsPasswordLimit(password) {
  return typeof password === 'string' && Buffer.byteLength(password, 'utf8') <= 72;
}
