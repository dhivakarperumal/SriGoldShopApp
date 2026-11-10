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

test('clicking Stock Details card opens stock management', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const stockCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage product stock',
  });
  act(() => {
    stockCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('stockDetails');
});

test('clicking Gold Enquiries card opens enquiry management', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const enquiriesCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage customer enquiries',
  });
  act(() => {
    enquiriesCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('enquiries');
});

test('clicking Fund Management card opens fund management', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const fundsCard = renderer.root.findByProps({
    accessibilityLabel: 'Open fund management',
  });
  act(() => {
    fundsCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('fundManagement');
});

test('clicking Reports card opens reports', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const reportsCard = renderer.root.findByProps({
    accessibilityLabel: 'View reports',
  });
  act(() => {
    reportsCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('reports');
});

test('clicking Loan Customers card opens borrower and KYC management', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const loanCustomersCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage loan customers',
  });
  act(() => {
    loanCustomersCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('loanCustomers');
});

test('clicking Dealers card opens dealer management', () => {
  const onNavigateMock = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(<More onNavigate={onNavigateMock} />);
  });

  const dealersCard = renderer.root.findByProps({
    accessibilityLabel: 'Manage dealers',
  });
  act(() => {
    dealersCard.props.onPress();
  });

  expect(onNavigateMock).toHaveBeenCalledWith('dealers');
});
