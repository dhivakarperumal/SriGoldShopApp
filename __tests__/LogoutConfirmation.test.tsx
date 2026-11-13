import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import LogoutConfirmation from '../src/User/components/LogoutConfirmation';

test('closes the confirmation before starting logout', () => {
  const calls: string[] = [];
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  act(() => {
    renderer = ReactTestRenderer.create(
      <LogoutConfirmation
        visible
        onCancel={() => calls.push('close')}
        onConfirm={() => calls.push('logout')}
      />,
    );
  });

  act(() => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Confirm logout' })
      .props.onPress();
  });

  expect(calls).toEqual(['close', 'logout']);
  act(() => renderer.unmount());
});
