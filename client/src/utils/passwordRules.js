export const passwordLimitMessage = 'Password must be at most 72 UTF-8 bytes; some characters use more than one byte.';

export const validatePasswordBytes = (password) =>
  new TextEncoder().encode(password).length <= 72 || passwordLimitMessage;
