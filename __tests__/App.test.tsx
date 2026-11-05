/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import BottomNavigation from '../src/Admin/Navigations/Bottombar';

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: () => null,
  Path: () => null,
}));

test('renders five main tabs and changes the selected tab', async () => {
  const onSelect = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <BottomNavigation activeRoute="home" onSelect={onSelect} />,
    );
  });

  const tabs = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
  );
  expect(tabs).toHaveLength(5);

  await ReactTestRenderer.act(() => {
    tabs[2].props.onPress();
  });
  expect(onSelect).toHaveBeenCalledWith('billing');
});
