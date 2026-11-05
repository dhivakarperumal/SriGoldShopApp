import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

import AddCategories from '../src/Admin/Categories/Addcategories';

test('renders AddCategories form and allows entering category name and adding subcategories', () => {
  const onCancelMock = jest.fn();
  const onSavedMock = jest.fn();

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <AddCategories
        categoryId="CAT005"
        onCancel={onCancelMock}
        onSaved={onSavedMock}
      />,
    );
  });

  const root = renderer.root;
  expect(root.findAll(node => node.props?.children === 'CAT005').length).toBeGreaterThan(0);

  act(() => {
    root.findByProps({ accessibilityLabel: 'Category name' }).props.onChangeText('Diamond Bangles');
  });
  expect(root.findByProps({ accessibilityLabel: 'Category name' }).props.value).toBe('Diamond Bangles');

  act(() => {
    root.findByProps({ accessibilityLabel: 'New subcategory' }).props.onChangeText('Traditional');
  });

  const addButton = root.findByProps({ accessibilityLabel: 'Add subcategory' });
  act(() => {
    addButton.props.onPress();
  });

  expect(root.findAll(node => node.props?.children === 'Traditional').length).toBeGreaterThan(0);
});
