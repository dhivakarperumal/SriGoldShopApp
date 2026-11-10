export type ReceiptSettingsData = {
  shopName: string;
  logoUrl: string;
  address: string;
  gstNumber: string;
  phone: string;
  email: string;
  footerMessage: string;
};

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettingsData = {
  shopName: 'Sri Golds',
  logoUrl: '/images/logo.png',
  address:
    'Tirupattur – Singarapet Road, Tirupattur, Tirupathur, Tirupattur, Tamil Nadu, 635600, India',
  gstNumber: '',
  phone: '',
  email: '',
  footerMessage:
    'Thank you for choosing us. We value your trust and look forward to serving you again.',
};

export function normalizeReceiptSettings(value: unknown): ReceiptSettingsData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('The receipt settings response must be an object.');
  }

  const record = value as Record<string, unknown>;
  const getString = (key: keyof ReceiptSettingsData): string => {
    const setting = record[key];
    return typeof setting === 'string'
      ? setting
      : DEFAULT_RECEIPT_SETTINGS[key];
  };

  return {
    shopName: getString('shopName'),
    logoUrl: getString('logoUrl'),
    address: getString('address'),
    gstNumber: getString('gstNumber'),
    phone: getString('phone'),
    email: getString('email'),
    footerMessage: getString('footerMessage'),
  };
}
