import { createLoanPrintHtml } from '../src/Admin/Screens/loanPrint';

test('creates an English loan agreement with escaped saved loan details', () => {
  const html = createLoanPrintHtml({
    id: 17,
    loan_number: 'LN-0017',
    customer_name: 'A&B <Customer>',
    customer_mobile: '9876543210',
    jewellery_type: 'Gold chain',
    gross_weight: 10,
    net_gold_weight: 9.5,
    gold_valuation: 63000,
    principal_amount: 50000,
    outstanding_principal: 45000,
    interest_type: 'simple',
    interest_rate: 12,
    interest_frequency: 'monthly',
    loan_date: '2025-01-31',
    maturity_date: '2025-12-31',
    notes: '<script>alert("x")</script>',
  });

  expect(html).toContain('Gold Loan Agreement');
  expect(html).not.toContain('தங்கக் கடன் ஒப்பந்தம்');
  expect(html).toContain('Borrower details');
  expect(html).toContain('LN-0017');
  expect(html).toContain('A&amp;B &lt;Customer&gt;');
  expect(html).toContain('₹50,000');
  expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  expect(html).toContain('30 Apr 2026');
  expect(html).not.toContain('<script>alert');
});

test('creates a Tamil loan agreement when Tamil is selected', () => {
  const html = createLoanPrintHtml(
    {
      id: 17,
      loan_number: 'LN-0017',
      customer_name: 'Dhivakar',
      customer_mobile: '9876543210',
      principal_amount: 50000,
      interest_rate: 12,
      interest_frequency: 'monthly',
      loan_status: 'active',
    },
    undefined,
    'ta',
  );

  expect(html).toContain('<html lang="ta">');
  expect(html).toContain('தங்கக் கடன் ஒப்பந்தம்');
  expect(html).toContain('கடன் பெறுபவர் விவரங்கள்');
  expect(html).toContain('வாடிக்கையாளர் பெயர்');
  expect(html).toContain('செயலில்');
  expect(html).not.toContain('Borrower details');
  expect(html).not.toContain('Customer name');
});

test('renders missing amounts as unavailable and includes an optional pledged image', () => {
  const withoutImage = createLoanPrintHtml({ id: 18 });
  const withImage = createLoanPrintHtml(
    { id: 18 },
    'data:image/jpeg;base64,ZmFrZQ==',
  );

  expect(withoutImage).toMatch(/Principal amount[^]*?<strong>—<\/strong>/);
  expect(withoutImage).not.toContain('Pledged gold image');
  expect(withImage).toContain(
    '<img src="data:image/jpeg;base64,ZmFrZQ==" alt="Pledged jewellery" />',
  );
});
