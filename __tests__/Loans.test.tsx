import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import api from '../src/api';
import Loans from '../src/Admin/Screens/Loans';

jest.mock('../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

const loans = [
  {
    id: 1,
    loan_number: 'LN-001',
    customer_name: 'Arun Kumar',
    customer_code: 'CUS-001',
    customer_mobile: '9876543210',
    principal_amount: 25000,
    outstanding_principal: 20000,
    interest_rate: 12,
    maturity_date: '2030-01-01',
    loan_status: 'Active',
  },
  {
    id: 2,
    loan_number: 'LN-002',
    customer_name: 'Meena Devi',
    principal_amount: 12000,
    outstanding_principal: 0,
    interest_rate: 10,
    maturity_date: '2030-06-01',
    loan_status: 'Inactive',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockResolvedValue({ data: loans });
});

test('loads loan summaries and searchable loan cards', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
  });

  expect(api.get).toHaveBeenCalledWith('/loans');
  expect(renderer.root.findAll(node => node.props.children === 'LN-001').length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.children === 'LN-002').length).toBeGreaterThan(0);

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Search loans' }).props.onChangeText('Meena');
  });
  expect(renderer.root.findAll(node => node.props.children === 'LN-001')).toHaveLength(0);
  expect(renderer.root.findAll(node => node.props.children === 'LN-002').length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});

test('shows an explicit retry state when the loan request fails', async () => {
  (api.get as jest.Mock).mockRejectedValueOnce({ message: 'Network unavailable' });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
  });

  expect(renderer.root.findAll(node => node.props.children === 'Network unavailable').length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.children === 'Retry').length).toBeGreaterThan(0);
  act(() => renderer.unmount());
}, 30000);

test('expands the loan actions and opens customer creation when selected', async () => {
  const onCreateCustomer = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans onCreateCustomer={onCreateCustomer} />);
  });

  expect(renderer.root.findAll(node => node.props.accessibilityLabel === 'Create customer')).toHaveLength(0);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Show create options' }).props.onPress();
  });
  expect(renderer.root.findByProps({ accessibilityLabel: 'Create customer' })).toBeTruthy();
  expect(renderer.root.findByProps({ accessibilityLabel: 'Create loan' })).toBeTruthy();

  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create customer' }).props.onPress();
  });
  expect(onCreateCustomer).toHaveBeenCalledTimes(1);
  act(() => renderer.unmount());
});

test('opens the API-backed loan form and loads customer, rate, interest, and fund options', async () => {
  const customer = {
    id: 7,
    customer_code: 'CUS-007',
    full_name: 'Arun Kumar',
    mobile: '9876543210',
  };
  (api.get as jest.Mock).mockImplementation((path: string) => {
    if (path === '/loans') return Promise.resolve({ data: loans });
    if (path === '/customers') return Promise.resolve({ data: [customer] });
    if (path === '/loans/interest-types') {
      return Promise.resolve({ data: [{ type_key: 'simple', name: 'Simple', enabled: true }] });
    }
    if (path === '/funds/accounts') {
      return Promise.resolve({ data: [{ current_balance: 100000 }] });
    }
    if (path === '/gold-rates/current') {
      return Promise.resolve({
        data: { rates: [{ metal_type: 'Gold', purity: '916', rate_per_gram: 5000 }] },
      });
    }
    if (path === '/customers/7') return Promise.resolve({ data: customer });
    if (path === '/customers/7/loans') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Show create options' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Create loan' }).props.onPress();
  });

  expect(api.get).toHaveBeenCalledWith('/customers');
  expect(api.get).toHaveBeenCalledWith('/loans/interest-types');
  expect(api.get).toHaveBeenCalledWith('/funds/accounts');
  expect(api.get).toHaveBeenCalledWith('/gold-rates/current');
  expect(renderer.root.findAll(node => node.props.children === 'Create loan').length).toBeGreaterThan(0);

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
  const nextMonthDate = [
    nextMonth.getFullYear(),
    String(nextMonth.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');
  const maturityDate = new Date(
    nextMonth.getFullYear(),
    nextMonth.getMonth() + 11,
    1,
  );
  const expectedMaturityDate = [
    maturityDate.getFullYear(),
    String(maturityDate.getMonth() + 1).padStart(2, '0'),
    '01',
  ].join('-');
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Select loan date' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Next month' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: nextMonthDate }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Apply date' }).props.onPress();
  });
  expect(renderer.root.findAll(node => node.props.children === nextMonthDate).length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.children === expectedMaturityDate).length).toBeGreaterThan(0);

  await act(async () => {
    renderer.root
      .findByProps({ accessibilityLabel: 'Select a registered customer' })
      .props.onPress();
  });
  await act(async () => {
    await renderer.root.findByProps({ accessibilityLabel: 'Choose customer Arun Kumar' }).props.onPress();
  });
  expect(api.get).toHaveBeenCalledWith('/customers/7');
  expect(api.get).toHaveBeenCalledWith('/customers/7/loans');
  expect(renderer.root.findByProps({ accessibilityLabel: 'Selected customer Arun Kumar' })).toBeTruthy();
  act(() => renderer.unmount());
}, 30000);
