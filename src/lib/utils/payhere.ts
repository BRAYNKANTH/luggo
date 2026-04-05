import { createHash } from 'crypto'

export const PAYHERE_ENDPOINT =
  process.env.NEXT_PUBLIC_PAYHERE_SANDBOX === 'true'
    ? 'https://sandbox.payhere.lk/pay/checkout'
    : 'https://www.payhere.lk/pay/checkout'

/**
 * Generate the PayHere hash for the checkout form.
 * hash = MD5(merchant_id + order_id + formatted_amount + currency + MD5(secret).upper()).upper()
 */
export function generatePayhereHash(
  merchantId: string,
  orderId: string,
  amount: number,
  currency: string,
  merchantSecret: string
): string {
  const formattedAmount = amount.toFixed(2)
  const secretHash = createHash('md5').update(merchantSecret).digest('hex').toUpperCase()
  return createHash('md5')
    .update(`${merchantId}${orderId}${formattedAmount}${currency}${secretHash}`)
    .digest('hex')
    .toUpperCase()
}

/**
 * Verify a PayHere IPN notification.
 * Returns true if the md5sig matches and status_code is "2" (success).
 */
export function verifyPayhereIPN(params: {
  merchant_id: string
  order_id: string
  payhere_amount: string
  payhere_currency: string
  status_code: string
  md5sig: string
  merchant_secret: string
}): boolean {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
    merchant_secret,
  } = params

  const secretHash = createHash('md5').update(merchant_secret).digest('hex').toUpperCase()
  const localHash = createHash('md5')
    .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`)
    .digest('hex')
    .toUpperCase()

  return localHash === md5sig && status_code === '2'
}

export interface PayhereFormData {
  merchant_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  order_id: string
  items: string
  currency: string
  amount: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
  hash: string
  endpoint: string
}
