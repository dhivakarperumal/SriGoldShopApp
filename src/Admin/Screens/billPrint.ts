import type { ReceiptSettingsData } from '../MorePages/receiptSettings';

type BillRecord = Record<string, unknown>;

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown): string =>
  `₹${getNumber(value).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toRecords = (value: unknown): BillRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is BillRecord =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  }
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    return toRecords(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
};

const getText = (record: BillRecord, ...keys: string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
  }
  return '';
};

const getFirstValue = (record: BillRecord, ...keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return undefined;
};

const formatWeight = (value: unknown, unit: string): string => {
  if (value === undefined) return '—';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(3)} ${unit}` : escapeHtml(value);
};

const resolveLogoUrl = (logoUrl: string, apiBaseUrl: string): string => {
  if (!logoUrl || /^(data:|https?:|file:)/i.test(logoUrl)) return logoUrl;
  const origin = apiBaseUrl.replace(/\/api\/?$/i, '');
  return `${origin}/${logoUrl.replace(/^\/+/, '')}`;
};

const formatDate = (value: unknown): string => {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toLocaleDateString('en-IN')
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
};

export function createBillPrintHtml(
  bill: BillRecord,
  settings: ReceiptSettingsData,
  apiBaseUrl: string,
): string {
  const products = toRecords(bill.products).map(product => {
    const nestedProduct =
      typeof product.product === 'object' && product.product !== null
        ? (product.product as BillRecord)
        : {};
    return { ...nestedProduct, ...product };
  });
  const exchanges = toRecords(bill.exchanges);
  const customers = toRecords(bill.customers);
  const customer = customers[0] ?? {};
  const productSubtotal = products.reduce(
    (sum, product) =>
      sum + getNumber(product.price ?? product.offer_price) * Math.max(1, getNumber(product.quantity) || 1),
    0,
  );
  const exchangeCredit = exchanges.reduce((sum, exchange) => {
    const credit = getNumber(exchange.credit_amount);
    if (credit) return sum + credit;
    const netWeight = Math.max(
      0,
      getNumber(exchange.weight) - getNumber(exchange.wastage_weight),
    );
    return sum + netWeight * getNumber(exchange.rate_per_unit ?? exchange.rate_per_gram);
  }, 0);
  const subtotal = getNumber(bill.sub_total) || productSubtotal;
  const discount = getNumber(bill.discount_amount);
  const gst = getNumber(bill.gst_amount);
  const total =
    bill.total_amount == null
      ? Math.max(0, subtotal - discount - exchangeCredit + gst)
      : getNumber(bill.total_amount);
  const paymentType =
    String(bill.payment_type ?? '').toUpperCase() === 'EXCHANGE_GOLD'
      ? 'Exchange Gold'
      : 'Full Payment';
  const logoUrl = resolveLogoUrl(settings.logoUrl, apiBaseUrl);
  const invoiceNumber =
    getText(bill, 'invoice_no', 'invoice_number') || `BILL-${bill.id ?? 'NEW'}`;
  const itemRows = [
    ...products.map((product, index) => {
      const quantity = Math.max(1, getNumber(product.quantity) || 1);
      const weight = getFirstValue(product, 'weight', 'gross_weight');
      const stoneWeight = getFirstValue(product, 'stone_weight');
      const savedNetWeight = getFirstValue(product, 'net_weight', 'net_gold_weight');
      const savedWastageWeight = getFirstValue(product, 'wastage_weight');
      const netWeight =
        savedNetWeight ??
        (weight !== undefined
          ? Math.max(
              0,
              getNumber(weight) -
                getNumber(stoneWeight ?? savedWastageWeight),
            )
          : undefined);
      const wastage = getFirstValue(product, 'wastage', 'wastage_percentage');
      const wastageText =
        savedWastageWeight !== undefined
          ? formatWeight(savedWastageWeight, 'g')
          : wastage === undefined
            ? '—'
            : String(product.wastage_type ?? '').toLowerCase() === 'grams'
              ? formatWeight(wastage, 'g')
              : `${escapeHtml(wastage)}%`;
      const makingCharge = getFirstValue(
        product,
        'making_charge',
        'making_charges',
        'making_charge_value',
        'making_charge_percentage',
        'making_percentage',
      );
      const makingChargeType = String(product.making_charge_type ?? '').toLowerCase();
      const makingChargeText =
        makingCharge === undefined
          ? '—'
          : makingChargeType === 'percentage' ||
              (makingChargeType === '' &&
                (product.making_charge_percentage != null ||
                  product.making_percentage != null))
            ? `${escapeHtml(makingCharge)}%`
            : formatCurrency(makingCharge);
      const rateValue = getFirstValue(
        product,
        'rate_per_gram',
        'gold_rate_per_gram',
        'rate_per_unit',
      );
      const rate = getNumber(rateValue);
      const rateUnit = getText(product, 'rate_unit') || 'gram';
      const weightUnit = rateUnit.toLowerCase() === 'carat' ? 'ct' : 'g';
      const amount =
        getNumber(product.price ?? product.offer_price) * quantity;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(getText(product, 'product_name', 'name'))}${quantity > 1 ? ` × ${quantity}` : ''}</td>
        <td>${escapeHtml(getText(product, 'category')) || '—'}</td>
        <td>${escapeHtml(getText(product, 'purity')) || '—'}</td>
        <td>${makingChargeText}</td>
        <td>${formatWeight(weight, weightUnit)}</td>
        <td>${wastageText}</td>
        <td>${formatWeight(netWeight, weightUnit)}</td>
        <td>${rateValue !== undefined ? `${formatCurrency(rate)} / ${escapeHtml(rateUnit)}` : '—'}</td>
        <td class="amount">${formatCurrency(amount)}</td>
      </tr>`;
    }),
    ...exchanges.map((exchange, index) => {
      const weight = getNumber(exchange.weight);
      const wastage = getNumber(exchange.wastage_weight);
      const netWeight = Math.max(0, weight - wastage);
      const rate = getNumber(exchange.rate_per_unit ?? exchange.rate_per_gram);
      const rateUnit = getText(exchange, 'rate_unit') || 'gram';
      const amount =
        getNumber(exchange.credit_amount) || netWeight * rate;
      return `<tr class="exchange">
        <td>${products.length + index + 1}</td>
        <td>${escapeHtml(getText(exchange, 'product_name', 'metal_type') || 'Exchange item')}</td>
        <td>${escapeHtml(getText(exchange, 'category')) || '—'}</td>
        <td>${escapeHtml(getText(exchange, 'purity')) || '—'}</td>
        <td>—</td>
        <td>${weight ? `${weight.toFixed(3)} g` : '—'}</td>
        <td>${wastage ? `${wastage.toFixed(3)} g` : '—'}</td>
        <td>${netWeight ? `${netWeight.toFixed(3)} g` : '—'}</td>
        <td>${rate ? `${formatCurrency(rate)} / ${escapeHtml(rateUnit)}` : '—'}</td>
        <td class="amount">−${formatCurrency(amount)}</td>
      </tr>`;
    }),
  ].join('');
  const logo = logoUrl
    ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />`
    : '';
  const extraTotals = [
    discount ? `<div><span>Discount</span><strong>−${formatCurrency(discount)}</strong></div>` : '',
    exchangeCredit
      ? `<div><span>Exchange credit</span><strong>−${formatCurrency(exchangeCredit)}</strong></div>`
      : '',
  ].join('');

  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172033; font: 10px Arial, Helvetica, sans-serif; }
  .header { text-align: center; padding-bottom: 12px; border-bottom: 1px solid #cbd5e1; }
  .logo { display: block; max-width: 90px; max-height: 48px; object-fit: contain; margin: 0 auto 4px; }
  h1 { margin: 0; color: #006b55; font-size: 19px; }
  .shop-meta { margin-top: 5px; color: #475569; font-size: 9px; line-height: 1.5; }
  .invoice-meta { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 2px solid #00816a; line-height: 1.6; }
  .right { text-align: right; }
  h2 { margin: 15px 0 6px; font-size: 11px; }
  .customer { padding-bottom: 10px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
  th { padding: 7px 3px; border-bottom: 1px solid #cbd5e1; text-align: left; text-transform: uppercase; }
  td { padding: 8px 3px; border-bottom: 1px solid #e2e8f0; vertical-align: top; overflow-wrap: anywhere; }
  th:first-child, td:first-child { width: 4%; }
  th:nth-child(2), td:nth-child(2) { width: 16%; }
  .amount { text-align: right; white-space: nowrap; }
  .exchange td { color: #7c2d12; }
  .totals { width: 48%; margin: 14px 0 0 auto; font-size: 9px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .grand-total { margin-top: 3px; border-top: 1px solid #cbd5e1; font-size: 12px; font-weight: bold; }
  .footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-weight: bold; }
  @media screen { body { max-width: 900px; margin: 24px auto; padding: 24px; } }
</style></head>
<body>
  <header class="header">
    ${logo}
    <h1>${escapeHtml(settings.shopName || 'Sri Golds')}</h1>
    <div class="shop-meta">
      ${settings.address ? `${escapeHtml(settings.address)}<br />` : ''}
      ${settings.gstNumber ? `GSTIN: ${escapeHtml(settings.gstNumber)}<br />` : ''}
      ${[settings.phone, settings.email].filter(Boolean).map(escapeHtml).join(' · ')}
    </div>
  </header>
  <section class="invoice-meta">
    <div>Invoice No: <strong>${escapeHtml(invoiceNumber)}</strong></div>
    <div class="right">Date: ${escapeHtml(formatDate(bill.created_at))}<br />Payment: ${escapeHtml(paymentType)}</div>
  </section>
  <h2>Customer</h2>
  <div class="customer">
    <strong>${escapeHtml(getText(customer, 'name', 'full_name'))}</strong><br />
    ${escapeHtml(getText(customer, 'phone', 'mobile'))}<br />
    ${customer.email ? `${escapeHtml(customer.email)}<br />` : ''}
    ${escapeHtml(getText(customer, 'address'))}
  </div>
  <h2>Items</h2>
  <table><thead><tr>
    <th>S.No.</th><th>Item</th><th>Category</th><th>Purity</th><th>Making charge</th>
    <th>Weight</th><th>Wastage</th><th>Net weight</th><th>Rate</th><th class="amount">Amount</th>
  </tr></thead><tbody>${itemRows}</tbody></table>
  <section class="totals">
    <div><span>Sub-Total</span><strong>${formatCurrency(subtotal)}</strong></div>
    ${extraTotals}
    <div><span>GST</span><strong>${formatCurrency(gst)}</strong></div>
    <div class="grand-total"><span>Total</span><strong>${formatCurrency(total)}</strong></div>
  </section>
  ${settings.footerMessage ? `<footer class="footer">${escapeHtml(settings.footerMessage)}</footer>` : ''}
</body></html>`;
}
