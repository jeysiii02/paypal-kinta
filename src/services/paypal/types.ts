/** Shared PayPal REST shapes used by Orders / Capture / Refunds. */

export type PayPalMoney = {
  currency_code: string;
  value: string;
};

export type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

export type PayPalCapture = {
  id: string;
  status: string;
  amount?: PayPalMoney;
  create_time?: string;
  update_time?: string;
};

export type PayPalPayer = {
  name?: { given_name?: string; surname?: string };
  email_address?: string;
  payer_id?: string;
};

export type PayPalOrder = {
  id: string;
  status: string;
  intent?: string;
  create_time?: string;
  update_time?: string;
  payer?: PayPalPayer;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    description?: string;
    amount?: PayPalMoney;
    payments?: {
      captures?: PayPalCapture[];
      refunds?: Array<{ id: string; status: string; amount?: PayPalMoney }>;
    };
  }>;
  links?: PayPalLink[];
};

export type PayPalRefund = {
  id: string;
  status: string;
  amount?: PayPalMoney;
  create_time?: string;
};
