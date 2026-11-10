import { createBillPrintHtml } from '../src/Admin/Screens/billPrint';
import { DEFAULT_RECEIPT_SETTINGS } from '../src/Admin/MorePages/receiptSettings';

test('creates a printable invoice with bill details and escaped customer data', () => {
  const html = createBillPrintHtml(
    {
      id: 42,
      invoice_no: 'BILL-0042',
      created_at: '2026-11-10T09:00:00.000Z',
      payment_type: 'FULL_PAYMENT',
      customers: [{ name: 'A&B <Customer>', phone: '9876543210' }],
      products: [
        {
          product: {
            name: 'Gold Chain',
            category: 'Necklace',
            purity: '22K',
            gross_weight: 5.2,
            stone_weight: 0.2,
            net_gold_weight: 5,
            making_charge_type: 'Percentage',
            making_charge: 5,
            wastage_type: 'Percentage',
            wastage: 3,
            gold_rate_per_gram: 7000,
            rate_unit: 'gram',
          },
          price: 25000,
          quantity: 2,
        },
      ],
      sub_total: 50000,
      gst_amount: 1500,
      total_amount: 51500,
    },
    DEFAULT_RECEIPT_SETTINGS,
    'https://example.com/api',
  );

  expect(html).toContain('BILL-0042');
  expect(html).toContain('A&amp;B &lt;Customer&gt;');
  expect(html).toContain('Gold Chain');
  expect(html).toContain('₹51,500.00');
  expect(html).toContain('5%');
  expect(html).toContain('5.200 g');
  expect(html).toContain('3%');
  expect(html).toContain('5.000 g');
  expect(html).toContain('₹7,000.00 / gram');
  expect(html).toContain('Net weight');
  expect(html).toContain('https://example.com/images/logo.png');
});
