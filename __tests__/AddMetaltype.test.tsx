import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

jest.mock('../src/api', () => ({
  __esModule: true,
  API_BASE_URL: 'https://srigold.qtechx.com/api',
  default: { post: jest.fn() },
}));

import AddMetaltype, { type MetalFormData } from '../src/Admin/Categories/AddMetaltype';

test('renders AddMetaltype form and handles metal name and purity preset selection', () => {
  const form: MetalFormData = {
    name: '',
    purity: '',
    description: '',
    imagePath: '',
    status: 'Active',
  };

  const onChangeMock = jest.fn();
  const onSelectImageMock = jest.fn();
  const onRemoveImageMock = jest.fn();
  const onCancelMock = jest.fn();
  const onSaveMock = jest.fn();

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <AddMetaltype
        form={form}
        editing={false}
        saving={false}
        selectedImage={null}
        onChange={onChangeMock}
        onSelectImage={onSelectImageMock}
        onRemoveImage={onRemoveImageMock}
        onCancel={onCancelMock}
        onSave={onSaveMock}
      />,
    );
  });

  const root = renderer.root;

  // Verify header title
  expect(root.findAll(node => node.props?.children === 'Add Metal Type').length).toBeGreaterThan(0);

  // Type metal name
  const nameInput = root.findByProps({ accessibilityLabel: 'Metal name' });
  act(() => {
    nameInput.props.onChangeText('Platinum');
  });
  expect(onChangeMock).toHaveBeenCalledWith('name', 'Platinum');

  // Tap a purity preset
  const presetButton = root.findByProps({ accessibilityLabel: 'Toggle purity 24K (99.9%)' });
  act(() => {
    presetButton.props.onPress();
  });
  expect(onChangeMock).toHaveBeenCalledWith('purity', '24K (99.9%)');
});
