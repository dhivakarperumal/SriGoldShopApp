type LoanPrintRecord = Record<string, unknown> & {
  id?: string | number;
};

export type LoanPrintLanguage = 'en' | 'ta';

const SHOP_NAME = 'Sri Golds';
const SHOP_ADDRESS = 'No.58 Vaitheeshwaran Nagar, Tirupattur - 635653';
const SHOP_PHONE = '9659133504';

const TAMIL_LABELS: Record<string, string> = {
  'Agreement date': 'ஒப்பந்த தேதி',
  'Loan status': 'கடன் நிலை',
  'Pledge number': 'அடகு எண்',
  'Customer name': 'வாடிக்கையாளர் பெயர்',
  'Customer ID': 'வாடிக்கையாளர் எண்',
  'Mobile number': 'கைபேசி எண்',
  'Alternate mobile': 'மாற்று கைபேசி எண்',
  Email: 'மின்னஞ்சல்',
  'Date of birth': 'பிறந்த தேதி',
  Gender: 'பாலினம்',
  Occupation: 'தொழில்',
  'KYC status': 'KYC நிலை',
  Address: 'முகவரி',
  'Guarantor name': 'உத்தரவாததாரர் பெயர்',
  'Guarantor mobile': 'உத்தரவாததாரர் கைபேசி எண்',
  'Guarantor email': 'உத்தரவாததாரர் மின்னஞ்சல்',
  'Guarantor relationship': 'உத்தரவாததாரருடனான உறவு',
  'Guarantor address': 'உத்தரவாததாரர் முகவரி',
  'Jewellery type': 'நகை வகை',
  Metal: 'உலோகம்',
  'Purity / quality': 'தூய்மை / தரம்',
  'Gross weight': 'மொத்த எடை',
  'Stone weight': 'கல் எடை',
  'Net weight': 'நிகர எடை',
  'Rate snapshot': 'பதிவு செய்யப்பட்ட விலை',
  'Rate effective date': 'விலை அமலான தேதி',
  'Pledged metal valuation': 'அடகு உலோக மதிப்பு',
  'Principal amount': 'கடன் அசல் தொகை',
  'Outstanding principal': 'நிலுவை அசல் தொகை',
  'Interest method': 'வட்டி முறை',
  'Interest rate': 'வட்டி விகிதம்',
  'Calculation start date': 'கணக்கீடு தொடங்கும் தேதி',
  'Day-count convention': 'நாள் கணக்கீட்டு முறை',
  'Payment frequency': 'செலுத்தும் இடைவெளி',
  'Initial loan term': 'ஆரம்ப கடன் காலம்',
  'Loan date': 'கடன் தேதி',
  'Maturity date': 'முதிர்வு தேதி',
  'Processing fee': 'செயலாக்கக் கட்டணம்',
  'Other authorized charges': 'பிற அங்கீகரிக்கப்பட்ட கட்டணங்கள்',
  'Fixed interest amount': 'நிலையான வட்டி தொகை',
  'Custom interest period': 'தனிப்பயன் வட்டி காலம்',
  'Compounding frequency': 'கூட்டு வட்டி இடைவெளி',
  'Grace period': 'சலுகைக் காலம்',
  'Interest-free period': 'வட்டியில்லா காலம்',
  'Late payment rate': 'தாமதக் கட்டண வட்டி விகிதம்',
  'Minimum interest': 'குறைந்தபட்ச வட்டி',
  'Maximum interest': 'அதிகபட்ச வட்டி',
  Notes: 'குறிப்புகள்',
  '15-month review date': '15 மாத மதிப்பாய்வு தேதி',
  Pledge: 'அடகு',
  'Late-payment terms': 'தாமதக் கட்டண விதிமுறைகள்',
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getText = (loan: LoanPrintRecord, key: string, fallback = '—'): string => {
  const value = loan[key];
  return value === null || value === undefined || value === ''
    ? fallback
    : String(value);
};

const titleCase = (value: unknown): string =>
  String(value || '—')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());

const dateText = (value: unknown, language: LoanPrintLanguage = 'en'): string => {
  if (!value) return '—';
  const text = String(value);
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}/.test(text)
        ? new Date(`${text.slice(0, 10)}T00:00:00`)
        : new Date(text);
  return Number.isNaN(date.valueOf())
    ? text
    : date.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
};

const money = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—';
};

const rateText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  const rate = Number(value);
  return Number.isFinite(rate) ? rate.toFixed(2) : '—';
};

const tamilFrequency = (value: unknown): string =>
  ({
    daily: 'தினசரி',
    weekly: 'வாரந்தோறும்',
    monthly: 'மாதந்தோறும்',
    quarterly: 'காலாண்டுக்கு ஒருமுறை',
    half_yearly: 'அரையாண்டுக்கு ஒருமுறை',
    yearly: 'ஆண்டுதோறும்',
    custom_period: 'தனிப்பயன் காலம்',
    bullet: 'முதிர்வில் ஒருமுறை',
  }[String(value || '').toLowerCase()] || titleCase(value));

const detail = (
  label: string,
  value: unknown,
  language: LoanPrintLanguage,
): string => {
  const displayLabel =
    language === 'ta' ? TAMIL_LABELS[label] || label : label;
  return `<div class="detail"><span>${escapeHtml(displayLabel)}</span><strong>${escapeHtml(value)}</strong></div>`;
};

const datePlusFifteenMonths = (
  value: unknown,
  language: LoanPrintLanguage,
): string => {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return '—';
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + 15);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
  return dateText(date, language);
};

export function createLoanPrintHtml(
  loan: LoanPrintRecord,
  pledgedImageDataUri?: string,
  language: LoanPrintLanguage = 'en',
): string {
  const isTamil = language === 'ta';
  const text = (english: string, tamil: string) => isTamil ? tamil : english;
  const field = (label: string, value: unknown) =>
    detail(label, value, language);
  const enumText = (value: unknown, tamilValues: Record<string, string>) => {
    const raw = String(value || '').toLowerCase();
    return isTamil ? tamilValues[raw] || titleCase(value) : titleCase(value);
  };
  const unit = loan.rate_unit === 'carat' ? 'ct' : 'g';
  const customerAddress = [
    loan.customer_address,
    loan.customer_city,
    loan.customer_district,
    loan.customer_state,
    loan.customer_pincode,
  ]
    .filter(Boolean)
    .join(', ');
  const rateSnapshot =
    loan.gold_rate_per_gram == null
      ? text('Not recorded', 'பதிவு செய்யப்படவில்லை')
      : `${money(loan.gold_rate_per_gram)} / ${unit}`;
  const reviewDate = datePlusFifteenMonths(loan.loan_date, language);
  const lateRate =
    loan.late_payment_interest_rate == null
      ? text('Not set', 'நிர்ணயிக்கப்படவில்லை')
      : isTamil
        ? `${rateText(loan.late_payment_interest_rate)}% ${tamilFrequency(loan.interest_frequency)}`
        : `${rateText(loan.late_payment_interest_rate)}% per ${titleCase(loan.interest_frequency)} period`;
  const optionalDetails = [
    loan.fixed_interest_amount != null
      ? field('Fixed interest amount', money(loan.fixed_interest_amount))
      : '',
    loan.custom_period_days != null
      ? field('Custom interest period', `${loan.custom_period_days} ${text('days', 'நாட்கள்')}`)
      : '',
    loan.compounding_frequency
      ? field('Compounding frequency', isTamil ? tamilFrequency(loan.compounding_frequency) : titleCase(loan.compounding_frequency))
      : '',
    loan.minimum_interest_amount != null
      ? field('Minimum interest', money(loan.minimum_interest_amount))
      : '',
    loan.maximum_interest_amount != null
      ? field('Maximum interest', money(loan.maximum_interest_amount))
      : '',
  ].join('');
  const pledgedImage = pledgedImageDataUri
    ? `<div class="detail image-detail"><span>${escapeHtml(text('Pledged gold image', 'அடகு நகை படம்'))}</span><img src="${escapeHtml(pledgedImageDataUri)}" alt="${escapeHtml(text('Pledged jewellery', 'அடகு நகை'))}" /></div>`
    : '';
  const initialTerm = text(
    '11 months; renewals set a new term from the recorded renewal date.',
    'ஆரம்ப காலம் 11 மாதங்கள்; புதுப்பிப்பின் போது பதிவு செய்யப்பட்ட புதுப்பிப்பு தேதியிலிருந்து புதிய காலம் தொடங்கும்.',
  );
  const latePaymentTerms =
    loan.late_payment_interest_rate == null
      ? text(
          'No late-payment rate is recorded for this loan.',
          'இந்தக் கடனுக்கு தாமதக் கட்டண வட்டி விகிதம் பதிவு செய்யப்படவில்லை.',
        )
      : text(
          `Late-payment rate recorded: ${lateRate}. Refer to the signed loan terms for its application.`,
          `பதிவு செய்யப்பட்ட தாமதக் கட்டண வட்டி விகிதம்: ${lateRate}. அது எவ்வாறு பொருந்தும் என்பதை கையொப்பமிட்ட கடன் விதிமுறைகளில் பார்க்கவும்.`,
        );
  const acknowledgment = text(
    'The borrower and the authorized representative should review this document against the saved loan record and the applicable signed terms before signing.',
    'கடன் பெறுபவரும் அங்கீகரிக்கப்பட்ட பிரதிநிதியும் கையொப்பமிடுவதற்கு முன் இந்த ஆவணத்தை சேமிக்கப்பட்ட கடன் பதிவுடனும் பொருந்தும் கையொப்பமிட்ட விதிமுறைகளுடனும் சரிபார்க்க வேண்டும்.',
  );

  return `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(text('Gold Loan Agreement', 'தங்கக் கடன் ஒப்பந்தம்'))} - ${escapeHtml(loan.loan_number || loan.id)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #172b28; font: 10px/1.35 Arial, "Nirmala UI", "Latha", sans-serif; }
  header { display: flex; justify-content: space-between; gap: 18px; padding-bottom: 10px; border-bottom: 2px solid #087263; }
  .brand { margin: 0; color: #07564b; font: bold 23px Georgia, serif; }
  header p { margin: 3px 0 0; color: #52625e; }
  .title { text-align: right; }
  .title h2 { margin: 0; color: #07564b; font-size: 15px; text-transform: uppercase; }
  .title p { font-weight: bold; }
  .meta { display: flex; justify-content: space-between; gap: 10px; margin: 8px 0; padding: 7px 10px; background: #f0f8f5; }
  section { margin-top: 9px; break-inside: avoid; page-break-inside: avoid; }
  h3 { margin: 0 0 5px; padding-bottom: 4px; border-bottom: 1px solid #dce8e3; color: #07564b; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px 12px; }
  .detail { min-width: 0; padding: 1px 0; }
  .detail span { display: block; margin-bottom: 2px; color: #71817c; font-size: 8px; }
  .detail strong { display: block; overflow-wrap: anywhere; color: #1e302b; font-size: 9px; }
  .wide { grid-column: span 2; }
  .full { grid-column: 1 / -1; }
  .image-detail { grid-column: 1 / -1; }
  .image-detail img { display: block; max-width: 100%; max-height: 120px; margin-top: 4px; object-fit: contain; object-position: left; }
  .notes { grid-column: 1 / -1; white-space: pre-wrap; }
  .acknowledgment { margin-top: 10px; padding: 7px; border: 1px solid #dce8e3; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 30px; margin-top: 28px; break-inside: avoid; }
  .signature { padding-top: 5px; border-top: 1px solid #485752; }
  .signature strong, .signature span { display: block; }
  .signature span { margin-top: 3px; color: #71817c; font-size: 8px; }
  footer { margin-top: 9px; padding-top: 5px; border-top: 1px solid #e3ebe7; color: #71817c; text-align: center; font-size: 8px; }
  @media screen { body { max-width: 850px; margin: 24px auto; padding: 24px; box-shadow: 0 4px 24px #12352b20; } }
</style></head>
<body>
  <header>
    <div><h1 class="brand">${SHOP_NAME}</h1><p>${SHOP_ADDRESS}</p><p>${escapeHtml(text('Phone', 'தொலைபேசி'))}: ${SHOP_PHONE}</p></div>
    <div class="title"><h2>${escapeHtml(text('Gold Loan Agreement', 'தங்கக் கடன் ஒப்பந்தம்'))}</h2><p>${escapeHtml(getText(loan, 'loan_number', `Loan #${loan.id ?? ''}`))}</p></div>
  </header>
  <div class="meta">
    <span>${escapeHtml(text('Agreement date', 'ஒப்பந்த தேதி'))}: <strong>${dateText(loan.loan_date)}</strong></span>
    <span>${escapeHtml(text('Loan status', 'கடன் நிலை'))}: <strong>${escapeHtml(enumText(loan.loan_status, {
      active: 'செயலில்',
      inactive: 'செயலற்றது',
      suspended: 'இடைநிறுத்தப்பட்டது',
      completed: 'முடிக்கப்பட்டது',
      'awaiting gold release': 'தங்கம் விடுவிக்க காத்திருக்கிறது',
    }))}</strong></span>
    <span>${escapeHtml(text('Pledge', 'அடகு'))}: <strong>${escapeHtml(loan.gold_pledge_number)}</strong></span>
  </div>
  <section><h3>${escapeHtml(text('Borrower details', 'கடன் பெறுபவர் விவரங்கள்'))}</h3><div class="grid">
    ${field('Customer name', loan.customer_name)}
    ${field('Customer ID', loan.customer_code || loan.customer_id)}
    ${field('Mobile number', loan.customer_mobile)}
    ${field('Alternate mobile', loan.customer_alternate_mobile)}
    ${field('Email', loan.customer_email)}
    ${field('Date of birth', dateText(loan.customer_date_of_birth, language))}
    ${field('Gender', enumText(loan.customer_gender, {
      male: 'ஆண்',
      female: 'பெண்',
      other: 'மற்றவை',
    }))}
    ${field('Occupation', loan.customer_occupation)}
    ${field('KYC status', enumText(loan.customer_kyc_status, {
      verified: 'சரிபார்க்கப்பட்டது',
      pending: 'நிலுவையில்',
      rejected: 'நிராகரிக்கப்பட்டது',
    }))}
    <div class="wide">${field('Address', customerAddress || '—')}</div>
    ${field('Guarantor name', loan.guarantor_name)}
    ${field('Guarantor mobile', loan.guarantor_mobile)}
    ${field('Guarantor email', loan.guarantor_email)}
    ${field('Guarantor relationship', loan.guarantor_relationship)}
    <div class="wide">${field('Guarantor address', loan.guarantor_address)}</div>
  </div></section>
  <section><h3>${escapeHtml(text('Pledged jewellery and valuation', 'அடகு நகை மற்றும் மதிப்பீடு'))}</h3><div class="grid">
    ${field('Jewellery type', loan.jewellery_type)}
    ${field('Metal', isTamil && String(loan.metal_type || '').toLowerCase() === 'gold'
      ? 'தங்கம்'
      : loan.metal_type || text('Gold', 'தங்கம்'))}
    ${field('Purity / quality', loan.gold_purity)}
    ${field('Gross weight', `${getText(loan, 'gross_weight')} ${unit}`)}
    ${field('Stone weight', `${getText(loan, 'stone_weight', '0')} ${unit}`)}
    ${field('Net weight', `${getText(loan, 'net_gold_weight')} ${unit}`)}
    ${field('Rate snapshot', rateSnapshot)}
    ${field('Rate effective date', dateText(loan.gold_rate_date, language))}
    ${field('Pledged metal valuation', money(loan.gold_valuation))}
    ${pledgedImage}
  </div></section>
  <section><h3>${escapeHtml(text('Loan and repayment terms', 'கடன் மற்றும் திருப்பிச் செலுத்தும் விதிமுறைகள்'))}</h3><div class="grid">
    ${field('Principal amount', money(loan.principal_amount))}
    ${field('Outstanding principal', money(loan.outstanding_principal ?? loan.principal_amount))}
    ${field('Interest method', enumText(loan.interest_type, {
      simple: 'தனிவட்டி',
      compound: 'கூட்டு வட்டி',
    }))}
    ${field('Interest rate', `${rateText(loan.interest_rate)}% ${isTamil ? tamilFrequency(loan.interest_frequency) : `per ${titleCase(loan.interest_frequency)} period`}`)}
    ${field('Calculation start date', dateText(loan.interest_calculation_start_date, language))}
    ${field('Day-count convention', titleCase(loan.day_count_convention))}
    ${field('Payment frequency', isTamil ? tamilFrequency(loan.payment_frequency) : titleCase(loan.payment_frequency))}
    ${field('Initial loan term', initialTerm)}
    ${field('Loan date', dateText(loan.loan_date, language))}
    ${field('Maturity date', dateText(loan.maturity_date, language))}
    ${field('Processing fee', money(loan.processing_fee))}
    ${field('Other authorized charges', money(loan.other_charges))}
    ${optionalDetails}
    ${field('Grace period', `${getText(loan, 'grace_period_days', '0')} ${text('days', 'நாட்கள்')}`)}
    ${field('Interest-free period', `${getText(loan, 'interest_free_days', '0')} ${text('days', 'நாட்கள்')}`)}
    ${field('Late payment rate', lateRate)}
    ${loan.notes ? `<div class="notes">${field('Notes', loan.notes)}</div>` : ''}
  </div></section>
  <section><h3>${escapeHtml(text('Account review', 'கணக்கு மதிப்பாய்வு'))}</h3><div class="grid">
    ${field('15-month review date', reviewDate)}
    <div class="wide">${field('Late-payment terms', latePaymentTerms)}</div>
  </div></section>
  <div class="acknowledgment">
    ${escapeHtml(acknowledgment)}
  </div>
  <div class="signatures">
    <div class="signature"><strong>${escapeHtml(getText(loan, 'customer_name'))}</strong><span>${escapeHtml(text('Borrower signature / thumb impression', 'கடன் பெறுபவர் கையொப்பம் / விரல் ரேகை'))}</span><span>${escapeHtml(text('Date', 'தேதி'))}: ____________________</span></div>
    <div class="signature"><strong>${SHOP_NAME}</strong><span>${escapeHtml(text('Authorized representative', 'அங்கீகரிக்கப்பட்ட பிரதிநிதி'))}</span><span>${escapeHtml(text('Date', 'தேதி'))}: ____________________</span></div>
    <div class="signature"><strong>${escapeHtml(text('Witness 1', 'சாட்சி 1'))}</strong><span>${escapeHtml(text('Name and signature', 'பெயர் மற்றும் கையொப்பம்'))}</span></div>
    <div class="signature"><strong>${escapeHtml(text('Witness 2', 'சாட்சி 2'))}</strong><span>${escapeHtml(text('Name and signature', 'பெயர் மற்றும் கையொப்பம்'))}</span></div>
  </div>
  <footer>${escapeHtml(text('Generated from the saved loan record on', 'சேமிக்கப்பட்ட கடன் பதிவிலிருந்து உருவாக்கப்பட்ட தேதி'))} ${new Date().toLocaleString('en-IN')}.</footer>
</body></html>`;
}
