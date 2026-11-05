jest.mock('../src/api', () => ({
  API_BASE_URL: 'https://srigold.qtechx.com/api',
}));

import { getProductImageUrl } from '../src/utils/productImage';

describe('getProductImageUrl', () => {
  it('resolves an image stored on a product variant', () => {
    expect(
      getProductImageUrl({
        variants: [{ images: ['/uploads/products/ring.jpg'] }],
      }),
    ).toBe('https://srigold.qtechx.com/uploads/products/ring.jpg');
  });

  it('resolves image objects stored in variant images', () => {
    expect(
      getProductImageUrl({
        variants: [{ images: [{ path: '/uploads/products/chain.jpg' }] }],
      }),
    ).toBe('https://srigold.qtechx.com/uploads/products/chain.jpg');
  });
});
