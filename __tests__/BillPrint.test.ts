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
          product_name: 'Gold Chain',
          category: 'Necklace',
          purity: '22K',
          price: 25000,
          quantity: 2,
          weight: 5,
          wastage_weight: 0.2,
          rate_per_gram: 7000,
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
  expect(html).toContain('Net weight');
  expect(html).toContain('https://example.com/images/logo.png');
});
