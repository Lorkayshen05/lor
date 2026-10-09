import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  // Server tests run in the node environment, where there is no DOM to clean up.
  if (typeof window === 'undefined') return;
  cleanup();
  window.localStorage.clear();
});
