import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Dealers from '../src/Admin/MorePages/Dealers';
import api from '../src/api';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

test('register dealer opens the dedicated add-dealer route', async () => {
  const onBack = jest.fn();
  const onAddDealer = jest.fn();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/dealers') {
      return Promise.resolve({ data: { dealers: [], pagination: { total: 0, totalPages: 1 } } }) as never;
    }
    if (url === '/dealers/categories') {
      return Promise.resolve({ data: [] }) as never;
    }
    return Promise.resolve({ data: {} }) as never;
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(<Dealers onBack={onBack} onAddDealer={onAddDealer} />);
    await new Promise<void>(resolve => setTimeout(resolve, 10));
  });

  act(() => {
    renderer.root.findByProps({ accessibilityLabel: 'Register dealer' }).props.onPress();
  });
  expect(onAddDealer).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
