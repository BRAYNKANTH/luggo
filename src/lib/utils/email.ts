'use server'

/**
 * Gmail SMTP email utility via Nodemailer.
 *
 * Env vars required:
 *   EMAIL_USER  — Gmail address (e.g. brayn.kanth5@gmail.com)
 *   EMAIL_PASS  — Gmail App Password (16-char, spaces OK)
 */

import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text?: string
}): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email: EMAIL_USER or EMAIL_PASS not set — skipping')
    return
  }

  try {
    const transporter = createTransport()
    await transporter.sendMail({
      from: `"Luggo" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    console.log('Email sent to', options.to)
  } catch (err) {
    console.error('Email send error:', err)
  }
}

// ---------------------------------------------------------------------------
// Premium Email HTML Wrapper
// ---------------------------------------------------------------------------

function getPremiumLayout(
  title: string,
  badgeText: string,
  badgeColor: string,
  contentHtml: string,
  actionUrl?: string,
  actionText?: string
): string {
  const buttonHtml = actionUrl && actionText ? `
    <div style="text-align: center; margin-top: 28px; margin-bottom: 8px;">
      <a href="${actionUrl}" style="display: inline-block; background-color: #038cc9; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 700; line-height: 52px; text-align: center; text-decoration: none; padding: 0 28px; border-radius: 14px; box-shadow: 0 4px 10px rgba(3, 140, 201, 0.2); transition: background 0.2s;">
        ${actionText}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="width: 100%; background-color: #f3f4f6; padding: 32px 0;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #e5e7eb; padding: 36px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
            
            <!-- Logo Header -->
            <div style="text-align: center; margin-bottom: 28px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #038cc9 0%, #011a2e 100%); color: #ffffff; padding: 12px 28px; border-radius: 16px; font-weight: 900; font-size: 24px; letter-spacing: -0.5px; box-shadow: 0 6px 12px rgba(3, 140, 201, 0.15);">
                Luggo
              </div>
              <p style="color: #9ca3af; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; margin: 8px 0 0 0;">Luggage Storage Network</p>
            </div>

            <!-- Status Badge -->
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="display: inline-block; background-color: ${badgeColor}12; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 6px 16px; border-radius: 30px; border: 1px solid ${badgeColor}25;">
                ${badgeText}
              </span>
            </div>

            <!-- Content -->
            <div style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              ${contentHtml}
            </div>

            <!-- Button Action -->
            ${buttonHtml}

            <!-- Separator -->
            <div style="border-top: 1px solid #f3f4f6; margin: 28px 0 20px 0;"></div>

            <!-- Footer -->
            <div style="text-align: center;">
              <p style="color: #9ca3af; font-size: 11px; margin: 0 0 4px 0;">Have questions? Contact us 24/7 at <a href="mailto:support@luggo.lk" style="color: #038cc9; text-decoration: none; font-weight: 600;">support@luggo.lk</a></p>
              <p style="color: #d1d5db; font-size: 10px; margin: 0;">&copy; ${new Date().getFullYear()} Luggo Sri Lanka. All rights reserved.</p>
            </div>

          </div>
        </div>
      </body>
    </html>
  `;
}

// ---------------------------------------------------------------------------
// Convenience templates
// ---------------------------------------------------------------------------

export async function sendBookingConfirmedEmail(
  to: string,
  name: string,
  hubName: string,
  bookingId: string,
  appUrl: string,
  details?: { startTime?: string; endTime?: string; totalPrice?: number; address?: string },
  qrCodeToken?: string
) {
  const { formatInSLT } = await import('@/lib/utils/timezone')
  const fmt = (iso?: string) => iso
    ? formatInSLT(iso, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : ''

  const detailsHtml = details ? `
    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${details.address ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6; vertical-align: top;">Location</td>
            <td style="padding: 10px 0 10px 16px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;">
              ${hubName}<br/>
              <span style="font-weight: 400; color: #9ca3af; font-size: 12px;">${details.address}</span>
            </td>
          </tr>` : ''}
        ${details.startTime ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Drop-off</td>
            <td style="padding: 10px 0 10px 16px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;">${fmt(details.startTime)}</td>
          </tr>` : ''}
        ${details.endTime ? `
          <tr>
            <td style="padding: 10px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Pick-up</td>
            <td style="padding: 10px 0 10px 16px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;">${fmt(details.endTime)}</td>
          </tr>` : ''}
        ${details.totalPrice !== undefined ? `
          <tr>
            <td style="padding: 12px 0 0 0; color: #1f2937; font-weight: 600;">Total Paid</td>
            <td style="padding: 12px 0 0 16px; font-weight: 800; color: #038cc9; font-size: 16px; text-align: right;">LKR ${Number(details.totalPrice).toLocaleString()}</td>
          </tr>` : ''}
      </table>
    </div>` : ''

  const qrHtml = qrCodeToken ? `
    <div style="text-align: center; margin: 24px 0; background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 20px; padding: 24px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${qrCodeToken}&color=011a2e&bgcolor=ffffff" alt="Booking QR Code" style="border: 1px solid #e5e7eb; border-radius: 16px; padding: 12px; background: #ffffff;" width="160" height="160"/>
      <p style="color: #111827; font-size: 14px; font-weight: 700; margin: 12px 0 2px 0;">Your Check-in QR Code</p>
      <p style="color: #6b7280; font-size: 11px; margin: 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Show this to staff at the hub</p>
    </div>
  ` : ''

  const contentHtml = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>Your luggage storage space at <strong>${hubName}</strong> has been successfully booked and secured. We look forward to welcoming you.</p>
    ${detailsHtml}
    ${qrHtml}
    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 14px; margin: 18px 0; font-size: 13px; color: #0369a1; text-align: center; font-weight: 500;">
      ⚡ <strong>Check-in Tip:</strong> Bring your physical NIC or Passport matching the details provided.
    </div>
    <p style="color: #9ca3af; font-size: 11px; margin-top: 20px; text-align: center;">Booking ref: ${bookingId.slice(0, 8).toUpperCase()}</p>
  `

  await sendEmail({
    to,
    subject: 'Your Luggo Booking is Confirmed! 🧳',
    html: getPremiumLayout(
      'Booking Confirmed',
      'Confirmed & Secured',
      '#10b981',
      contentHtml,
      `${appUrl}/booking/${bookingId}`,
      'View Booking Details'
    ),
  })
}

export async function sendPickupRequestedEmail(
  to: string,
  name: string,
  hubName: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  
  const contentHtml = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>We have successfully received your pickup request for your luggage at <strong>${hubName}</strong>.</p>
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #111827; font-weight: 700; font-size: 15px;">🎒 Preparing Your Bags</p>
      <p style="margin: 6px 0 0 0; color: #6b7280; font-size: 13px;">Our hub staff are preparing your luggage for retrieval. Please present your entry QR code at the counter desk.</p>
    </div>
    <p style="margin-bottom: 0;">If you don't have your QR code open, please click the button below to retrieve it.</p>
  `

  await sendEmail({
    to,
    subject: 'Pickup Request Received — Luggo 🎒',
    html: getPremiumLayout(
      'Pickup Requested',
      'Retrieving Bags',
      '#3b82f6',
      contentHtml,
      `${appUrl}/dashboard`,
      'Show QR Code'
    ),
  })
}

export async function sendLateFeeReceiptEmail(
  to: string,
  name: string,
  hubName: string,
  amount: number
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const contentHtml = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>This email confirms that we have received your late storage fee payment for your booking at <strong>${hubName}</strong>.</p>
    
    <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Location</td>
          <td style="padding: 10px 0 10px 16px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;">${hubName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-weight: 500; border-bottom: 1px solid #f3f4f6;">Payment Type</td>
          <td style="padding: 10px 0 10px 16px; font-weight: 700; color: #111827; border-bottom: 1px solid #f3f4f6; text-align: right;">Overstay / Late Fee</td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0 0; color: #1f2937; font-weight: 600;">Amount Paid</td>
          <td style="padding: 12px 0 0 16px; font-weight: 800; color: #038cc9; font-size: 16px; text-align: right;">LKR ${amount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 0;">Your account is now fully clear. Please head to the counter to collect your luggage at your earliest convenience.</p>
  `

  await sendEmail({
    to,
    subject: 'Late Fee Payment Confirmed — Luggo 💳',
    html: getPremiumLayout(
      'Late Fee Receipt',
      'Receipt Paid',
      '#10b981',
      contentHtml,
      `${appUrl}/dashboard`,
      'Go to Dashboard'
    ),
  })
}

export async function sendOverstayedAlertEmail(
  to: string,
  name: string,
  hubName: string,
  bookingId: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  
  const contentHtml = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>Your luggage storage at <strong>${hubName}</strong> has passed its scheduled check-out time.</p>
    <div style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #b91c1c; font-weight: 700; font-size: 15px;">⚠️ Storage Period Ended</p>
      <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 13px;">Late storage fees are now accruing. Please collect your bags as soon as possible to avoid further charges.</p>
    </div>
    <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">Late fees are calculated at the same standard hourly rate as your original booking.</p>
  `

  await sendEmail({
    to,
    subject: 'Your Luggo Storage has Expired — Late Fees Apply ⚠️',
    html: getPremiumLayout(
      'Storage Expired',
      'Overstay Alert',
      '#ef4444',
      contentHtml,
      `${appUrl}/booking/${bookingId}`,
      'Request Pickup Now'
    ),
  })
}

export async function sendPickupReminderEmail(
  to: string,
  name: string,
  hubName: string,
  bookingId: string,
  endFormatted: string,
  minutesLeft: number
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const contentHtml = `
    <p style="margin-top: 0;">Hi <strong>${name}</strong>,</p>
    <p>This is a friendly reminder that your luggage storage at <strong>${hubName}</strong> ends at <strong>${endFormatted}</strong> (in approximately <strong>${minutesLeft} minutes</strong>).</p>
    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #b45309; font-weight: 700; font-size: 15px;">⏰ Pickup Reminder</p>
      <p style="margin: 6px 0 0 0; color: #78350f; font-size: 13px;">Please make your way to the hub counter to collect your bags on time and prevent any overstay charges.</p>
    </div>
    <p style="margin-bottom: 0; font-size: 13px; color: #6b7280;">If you need more time, you can extend your booking duration directly in the app before it expires.</p>
  `

  await sendEmail({
    to,
    subject: `Luggage Pickup Reminder — ${endFormatted} ⏰`,
    html: getPremiumLayout(
      'Pickup Reminder',
      'Upcoming Retrieval',
      '#f59e0b',
      contentHtml,
      `${appUrl}/booking/${bookingId}`,
      'View Booking Details'
    ),
  })
}
