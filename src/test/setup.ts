import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock import.meta.env for tests
(globalThis as any).import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: 'https://test.supabase.co',
    },
  },
};

afterEach(() => {
  cleanup();
});
