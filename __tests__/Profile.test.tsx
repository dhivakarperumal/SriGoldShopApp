import React, { useState } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AuthenticatedUser } from '../src/Admin/Auth/Login';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://srigold.qtechx.com/api',
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        user: {
          user_id: '1',
          username: 'admin',
          name: 'Dhivakar Perumal',
          email: 'dhivakar@srigold.com',
          phone: '+91 98765 43210',
          address: 'Main Bazaar, Tirupattur',
          role: 'admin',
          status: 'Active',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-03-01T00:00:00.000Z',
          notification_preferences: { email: true, orders: true },
        },
      },
    }),
    put: jest.fn().mockResolvedValue({
      data: {
        user: {
          name: 'Dhivakar Perumal',
          email: 'dhivakar@srigold.com',
        },
      },
    }),
  },
}));

import Profile from '../src/Admin/Screens/Profile';
import api from '../src/api';

function ProfileHost() {
  const [user, setUser] = useState<AuthenticatedUser>({
    role: 'admin',
    name: 'Dhivakar Perumal',
    email: 'dhivakar@srigold.com',
    phone: '+91 98765 43210',
  });
  return (
    <Profile
      user={user}
      onUserUpdated={setUser}
      onLogout={jest.fn()}
      onBack={jest.fn()}
    />
  );
}

test('renders Profile screen with tabs and allows switching sections', async () => {
  const onUserUpdatedMock = jest.fn();
  const onLogoutMock = jest.fn();

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Profile
        user={{ role: 'admin', name: 'Dhivakar Perumal', email: 'dhivakar@srigold.com' }}
        onUserUpdated={onUserUpdatedMock}
        onLogout={onLogoutMock}
        onBack={jest.fn()}
      />,
    );
  });

  const root = renderer.root;

  // Verify header name is displayed
  expect(root.findAll(node => node.props?.children === 'Dhivakar Perumal').length).toBeGreaterThan(0);

  // Switch to Password tab
  const passwordTab = root.findByProps({ accessibilityLabel: 'Password' });
  act(() => {
    passwordTab.props.onPress();
  });

  // Verify current password input is present
  expect(root.findByProps({ accessibilityLabel: 'Current Password' })).toBeDefined();

  // Switch to Notifications tab
  const notifTab = root.findByProps({ accessibilityLabel: 'Notifications' });
  act(() => {
    notifTab.props.onPress();
  });

  expect(root.findByProps({ accessibilityLabel: 'Toggle email notifications' })).toBeDefined();

  // Switch to Activity Log tab
  const activityTab = root.findByProps({ accessibilityLabel: 'Activity Log' });
  act(() => {
    activityTab.props.onPress();
  });

  expect(root.findAll(node => node.props?.children === 'Account Created').length).toBeGreaterThan(0);
});

test('loading a profile that updates the auth user does not trigger a reload loop', async () => {
  const getMock = jest.mocked(api.get);
  getMock.mockClear();

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ProfileHost />);
    await Promise.resolve();
  });

  expect(getMock).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});
