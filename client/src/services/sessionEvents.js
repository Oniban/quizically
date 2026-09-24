// Tag requests so a late response from an old session cannot expire a new login.
let version = 0;
const listeners = new Set();

export const sessionVersion = () => version;
export const advanceSession = () => { version += 1; };
export const onSessionExpired = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const reportSessionExpired = (requestVersion) => {
  if (requestVersion !== version) return;
  advanceSession();
  listeners.forEach((listener) => listener());
};
