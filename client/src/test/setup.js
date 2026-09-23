import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  // Accidental service calls must fail locally, never reach a real server.
  vi.spyOn(XMLHttpRequest.prototype, 'send').mockImplementation(() => {
    throw new Error('Unexpected network request: mock the service in this test.');
  });
  vi.stubGlobal('fetch', vi.fn(() => {
    throw new Error('Unexpected fetch: mock the service in this test.');
  }));
  vi.stubGlobal('matchMedia', vi.fn((media) => ({
    media,
    matches: media === '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => true,
  })));
  // jsdom has no layout engine; leave chart assertions to accessible data tables.
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
