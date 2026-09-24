import validator from 'validator';

// Keep HTTP validation, provider claims, and persistence on the same syntax rule.
export const isValidEmail = (email) => typeof email === 'string' && validator.isEmail(email);
