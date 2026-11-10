import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import api from '../src/api';
import Home from '../src/Admin/Screens/Home';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockImplementation((path: string) => {
    if (path === '/dashboard') return Promise.resolve({ data: { stats: [] } });
    if (path === '/gold-rates/current') return Promise.resolve({ data: { rates: [] } });
    return Promise.resolve({ data: [] });
  });
});

test('Home filter buttons reload the dashboard using their selected date ranges', () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<Home user={{ role: 'admin' }} />);
  });

  const checkFilter = (label: string, value: 'all' | 'month' | 'week') => {
    const requestCount = (api.get as jest.Mock).mock.calls.filter(
      ([path]) => path === '/dashboard',
    ).length;

    act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: `Dashboard date filter: ${label}` })
        .props.onPress();
    });

    const dashboardRequests = (api.get as jest.Mock).mock.calls.filter(
      ([path]) => path === '/dashboard',
    );
    expect(dashboardRequests).toHaveLength(requestCount + 1);
    expect(dashboardRequests[dashboardRequests.length - 1][1].params.datePreset).toBe(value);
  };

  checkFilter('This month', 'month');
  checkFilter('This week', 'week');
  checkFilter('All time', 'all');

  act(() => renderer.unmount());
});
