import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        shopName: 'Sri Golds Jewellers',
        logoUrl: '',
        address: 'Main Bazaar, Chennai',
        gstNumber: '33AAAAA1234A1Z5',
        phone: '+91 98765 43210',
        email: 'info@srigolds.com',
        footerMessage: 'Thank you for shopping with Sri Golds',
      },
    }),
    put: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

import Receipt from '../src/Admin/MorePages/Receipt';

test('renders Receipt settings screen and handles bottom plus button', async () => {
  const onBackMock = jest.fn();

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Receipt onBack={onBackMock} />);
  });

  const root = renderer.root;

  // Header should be present
  expect(root.findAll(node => node.props?.children === 'Receipt Settings').length).toBeGreaterThan(0);

  // Bottom plus button exists
  const plusButton = root.findByProps({ accessibilityLabel: 'Add or edit receipt settings' });
  expect(plusButton).toBeDefined();

  // Pressing bottom plus button opens modal
  act(() => {
    plusButton.props.onPress();
  });

  // Modal shop name field is rendered
  const shopNameInput = root.findByProps({ accessibilityLabel: 'Modal Shop Name' });
  expect(shopNameInput).toBeDefined();
});
