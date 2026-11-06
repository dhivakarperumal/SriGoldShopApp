import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { MAIN_TABS } from '../src/Admin/Navigations/Bottombar';
import More from '../src/Admin/Screens/More';

test('defines five admin tabs with the requested screen routes', () => {
  expect(MAIN_TABS.map(({ label, route }) => [label, route])).toEqual([
    ['Home', 'home'],
    ['Loans', 'loans'],
    ['Pulse', 'billing'],
    ['Products', 'products'],
    ['More', 'more'],
  ]);
});

test('clicking Add Category card on More page navigates to categories route', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const categoryCard = renderer.root.findByProps({
    accessibilityLabel: 'Add Category, show all categories',
  });
  expect(categoryCard).toBeDefined();

  act(() => {
    categoryCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('categories');
});

test('clicking Home Product Sections card navigates to its settings screen', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const homeSectionsCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage home product sections',
  });
  act(() => {
    homeSectionsCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('homeSections');
});

test('clicking Customer Reviews card navigates to reviews moderation', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const reviewsCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage customer reviews',
  });
  act(() => {
    reviewsCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('reviews');
});
