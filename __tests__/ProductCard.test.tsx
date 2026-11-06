import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import ProductCard from '../src/Components/ProductCard';

jest.mock('../src/utils/productImage', () => ({
  getProductImageUrl: jest.fn(() => undefined),
}));

test('catalog product card shows shared product details and price', () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ProductCard
        product={{
          id: 'product-1',
          name: 'Gold chain',
          metal_type: 'Gold',
          gross_weight: 5,
          offer_price: 12500,
        }}
      />,
    );
  });

  const text = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');

  expect(text).toContain('Gold chain');
  expect(text).toContain('Gold · 5 g');
  expect(text).toContain('₹12,500');
});

test('inventory product card preserves the details and stock actions', () => {
  const onPress = jest.fn();
  const onUpdateStock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <ProductCard
        product={{
          id: 'product-2',
          name: 'Gold ring',
          category: 'Rings',
          metal_type: 'Gold',
          purity: '22K',
          total_stock: 6,
          product_code: 'SKU-6',
          mrp: 9000,
        }}
        layout="inventory"
        showStockBadge
        onPress={onPress}
        footer={
          <Text onPress={onUpdateStock} accessibilityLabel="Update stock">
            Update
          </Text>
        }
      />,
    );
  });

  expect(
    renderer.root.findByProps({
      accessibilityLabel: 'View details for Gold ring',
    }),
  ).toBeDefined();
  expect(renderer.root.findByProps({ children: 'Low stock' })).toBeDefined();

  act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'View details for Gold ring' })
      .props.onPress();
  });
  act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Update stock' }).props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onUpdateStock).toHaveBeenCalledTimes(1);
});
