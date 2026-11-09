import React from 'react';
import { Alert } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';
import AddDealers from '../src/Admin/MorePages/AddDealers';
import api from '../src/api';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: [{ id: 1, name: 'Wholesale' }] } as never);
  mockedApi.post.mockResolvedValue({ data: {} } as never);
});

test('shows a dedicated add-dealer page and returns to dealers', async () => {
  const onBack = jest.fn();
  const onCreated = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<AddDealers onBack={onBack} onCreated={onCreated} />);
    await Promise.resolve();
  });

  expect(renderer.root.findByProps({ accessibilityLabel: 'Company / Dealer Name *' })).toBeDefined();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Phone Number *' })).toBeDefined();
  act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Back to dealers' }).props.onPress();
  });
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('creates a dealer from the add-dealer page', async () => {
  const onBack = jest.fn();
  const onCreated = jest.fn();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<AddDealers onBack={onBack} onCreated={onCreated} />);
    await Promise.resolve();
  });
  act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Company / Dealer Name *' }).props.onChangeText('Gold Traders');
    renderer.root.findByProps({ accessibilityLabel: 'Contact Person *' }).props.onChangeText('Sam');
    renderer.root.findByProps({ accessibilityLabel: 'Phone Number *' }).props.onChangeText('9876543210');
    renderer.root.findByProps({ accessibilityLabel: 'Select Wholesale' }).props.onPress();
  });

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create partnership' }).props.onPress();
    await Promise.resolve();
  });

  expect(mockedApi.post).toHaveBeenCalledWith(
    '/dealers',
    expect.objectContaining({
      name: 'Gold Traders',
      contact_person: 'Sam',
      category_id: 1,
    }),
  );
  expect(onCreated).toHaveBeenCalledTimes(1);
  alertSpy.mockRestore();
});
