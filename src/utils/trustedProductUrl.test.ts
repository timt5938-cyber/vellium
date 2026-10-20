import { describe, expect, it } from 'vitest';
import { trustedProductUrl } from './trustedProductUrl';

describe('trustedProductUrl', () => {
  it('keeps only product pages on the expected HTTPS host', () => {
    expect(trustedProductUrl('https://world.openfoodfacts.org/product/3017620422003')).toBe('https://world.openfoodfacts.org/product/3017620422003');
    expect(trustedProductUrl('javascript:alert(1)')).toBeUndefined();
    expect(trustedProductUrl('https://world.openfoodfacts.org.evil.example/product/3017620422003')).toBeUndefined();
    expect(trustedProductUrl('https://world.openfoodfacts.org/redirect?to=https://evil.example')).toBeUndefined();
  });
});
