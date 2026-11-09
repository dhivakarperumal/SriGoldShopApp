import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import api from '../src/api';
import Loans from '../src/Admin/Screens/Loans';
import LoanCustomerManagement from '../src/Admin/Loanmanegements/LoanCustomerManagement';
import CreateCustomers from '../src/Admin/Loanmanegements/CreateCustomers';

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

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn().mockResolvedValue('test-token') },
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-native-documents/picker', () => ({
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: jest.fn(() => false),
  pick: jest.fn(),
  types: { pdf: 'application/pdf', images: 'image/*' },
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
}, 30000);

test('filters loans by overdue, unrenewed, gold release, and completed status', async () => {
  const statusLoans = [
    { ...loans[0], id: 21, loan_number: 'LN-ACTIVE', loan_status: 'Active', maturity_date: '2099-01-01' },
    { ...loans[0], id: 26, loan_number: 'LN-ELIGIBLE', loan_status: 'Active', maturity_date: '2099-01-01' },
    { ...loans[0], id: 22, loan_number: 'LN-OVERDUE', loan_status: 'Active', maturity_date: '2000-01-01' },
    {
      ...loans[0],
      id: 23,
      loan_number: 'LN-RENEWED',
      loan_status: 'Active',
      maturity_date: '2099-01-01',
      loan_type: 'Renewal',
      renewed_from_loan_id: 21,
    },
    {
      ...loans[0],
      id: 24,
      loan_number: 'LN-RELEASE',
      loan_status: 'Active',
      outstanding_principal: 0,
      release_status: 'Pending Release',
    },
    {
      ...loans[0],
      id: 25,
      loan_number: 'LN-COMPLETE',
      loan_status: 'Completed',
      release_status: 'Released',
      outstanding_principal: 0,
    },
  ];
  (api.get as jest.Mock).mockResolvedValue({ data: statusLoans });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<Loans />);
  });

  const selectFilter = async (filter: string) => {
    await act(async () => {
      renderer.root
        .findAll(
          node =>
            typeof node.props.accessibilityLabel === 'string' &&
            node.props.accessibilityLabel.startsWith('Filter loans, current filter '),
        )[0]
        .props.onPress();
    });
    await act(async () => {
      renderer.root.findByProps({ accessibilityLabel: `Loan list filter ${filter}` }).props.onPress();
    });
  };
  const visibleLoanNumbers = () =>
    statusLoans
      .map(loan => loan.loan_number!)
      .filter(loanNumber => renderer.root.findAll(node => node.props.children === loanNumber).length > 0);

  expect(visibleLoanNumbers()).toEqual(statusLoans.map(loan => loan.loan_number));
  await selectFilter('Overdue Loans');
  expect(visibleLoanNumbers()).toEqual(['LN-OVERDUE']);
  await selectFilter('Loan Renewal');
  expect(visibleLoanNumbers()).toEqual(['LN-ELIGIBLE', 'LN-OVERDUE']);
  await selectFilter('Gold Release');
  expect(visibleLoanNumbers()).toEqual(['LN-RELEASE']);
  await selectFilter('Complete Loan');
  expect(visibleLoanNumbers()).toEqual(['LN-COMPLETE']);
  act(() => renderer.unmount());
}, 30000);

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

test('shows loan customers in management and opens the loan customer form on request', async () => {
  const customer = {
    id: 17,
    customer_code: 'LC-017',
    full_name: 'Kavitha Devi',
    mobile: '9876501234',
    kyc_status: 'Pending',
    city: 'Madurai',
  };
  (api.get as jest.Mock).mockImplementation((path: string) => {
    if (path === '/loan-customers') return Promise.resolve({ data: [customer] });
    if (path === '/loan-customers/17') return Promise.resolve({ data: customer });
    if (path === '/loan-customers/17/documents') return Promise.resolve({ data: [] });
    if (path === '/customers/17/loans') return Promise.resolve({ data: [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<LoanCustomerManagement onBack={jest.fn()} />);
  });

  expect(api.get).toHaveBeenCalledWith('/loan-customers');
  expect(renderer.root.findAll(node => node.props.children === 'Kavitha Devi').length).toBeGreaterThan(0);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'View loan customer Kavitha Devi' }).props.onPress();
  });
  expect(renderer.root.findAll(node => node.props.children === 'Verify KYC').length).toBeGreaterThan(0);
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'View full details' }).props.onPress();
  });
  expect(api.get).toHaveBeenCalledWith('/loan-customers/17');
  expect(api.get).toHaveBeenCalledWith('/loan-customers/17/documents');
  expect(api.get).toHaveBeenCalledWith('/customers/17/loans');
  expect(renderer.root.findAll(node => node.props.children === 'Personal & contact details').length).toBeGreaterThan(0);
  act(() => renderer.unmount());

  const onCreateOpened = jest.fn();
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LoanCustomerManagement onBack={jest.fn()} openCreateOnMount onCreateOpened={onCreateOpened} />,
    );
  });
  expect(onCreateOpened).toHaveBeenCalledTimes(1);
  expect(renderer.root.findAll(node => node.props.children === 'Create Loan Customer').length).toBeGreaterThan(0);
  act(() => renderer.unmount());
});

test('selects a loan customer date of birth from the calendar', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<CreateCustomers onCancel={jest.fn()} onSaved={jest.fn()} />);
  });

  const today = new Date();
  const todayValue = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Select date of birth' }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: todayValue }).props.onPress();
  });
  await act(async () => {
    renderer.root.findByProps({ accessibilityLabel: 'Apply date' }).props.onPress();
  });
  expect(renderer.root.findAll(node => node.props.children === todayValue).length).toBeGreaterThan(0);
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
