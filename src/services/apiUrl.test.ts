import { describe, expect, it } from 'vitest';
import { resolveApiBase } from './apiUrl';

describe('resolveApiBase', () => {
  it('uses the current origin when a production build has a local development API URL', () => {
    expect(resolveApiBase('http://127.0.0.1:8000', true)).toBe('');
    expect(resolveApiBase('http://localhost:8000/', true)).toBe('');
  });

  it('keeps the local API in development and a remote API in production', () => {
    expect(resolveApiBase('http://127.0.0.1:8000', false)).toBe('http://127.0.0.1:8000');
    expect(resolveApiBase('https://api.example.com/', true)).toBe('https://api.example.com');
  });
});
