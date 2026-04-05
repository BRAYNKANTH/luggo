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
  const fmt = (iso?: string) => iso
    ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : ''

  const detailsHtml = details ? `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      ${details.address ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Location</td><td style="padding:8px 0;font-weight:600;color:#0a3d5c;border-bottom:1px solid #eee">${hubName}<br/><span style="font-weight:400;color:#888;font-size:12px">${details.address}</span></td></tr>` : ''}
      ${details.startTime ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Drop-off</td><td style="padding:8px 0;font-weight:600;color:#0a3d5c;border-bottom:1px solid #eee">${fmt(details.startTime)}</td></tr>` : ''}
      ${details.endTime ? `<tr><td style="padding:8px 0;color:#666;border-bottom:1px solid #eee">Pick-up</td><td style="padding:8px 0;font-weight:600;color:#0a3d5c;border-bottom:1px solid #eee">${fmt(details.endTime)}</td></tr>` : ''}
      ${details.totalPrice !== undefined ? `<tr><td style="padding:8px 0;color:#666">Total paid</td><td style="padding:8px 0;font-weight:700;color:#0a3d5c">LKR ${Number(details.totalPrice).toLocaleString()}</td></tr>` : ''}
    </table>` : ''

  await sendEmail({
    to,
    subject: 'Your Luggo booking is confirmed! ✅',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;background:#f9fafb;padding:24px;border-radius:12px">
        <div style="background:#0a3d5c;padding:20px 24px;border-radius:10px;margin-bottom:20px">
          <h1 style="color:#fff;margin:0;font-size:22px">Luggo</h1>
          <p style="color:#7ecfff;margin:4px 0 0;font-size:13px">Luggage Storage Sri Lanka</p>
        </div>
        <div style="background:#fff;padding:24px;border-radius:10px;border:1px solid #e5e7eb">
          <h2 style="color:#0a3d5c;margin-top:0">Booking Confirmed!</h2>
          <p style="color:#444">Hi <strong>${name}</strong>, your luggage storage at <strong>${hubName}</strong> is confirmed and ready.</p>
          ${detailsHtml}
          ${qrCodeToken ? `
          <div style="text-align:center;margin:16px 0;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrCodeToken}&color=0f172a&bgcolor=ffffff" alt="Booking QR Code" style="border:1px solid #e5e7eb;border-radius:12px;padding:8px;background:#fff;" width="180" height="180"/>
            <p style="color:#666;font-size:12px;margin-top:8px">Present this code at the hub</p>
          </div>
          ` : ''}
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:#0369a1">
            📱 <strong>Open the app and show your QR code to hub staff when you arrive.</strong>
          </div>
          <a href="${appUrl}/booking/${bookingId}"
             style="display:block;text-align:center;background:#0077b6;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;margin-top:8px">
            View Booking & QR Code
          </a>
          <p style="color:#888;font-size:11px;margin-top:20px;text-align:center">Booking ref: ${bookingId.slice(0, 8).toUpperCase()}</p>
        </div>
        <p style="color:#aaa;font-size:11px;text-align:center;margin-top:16px">— The Luggo team</p>
      </div>
    `,
  })
}

export async function sendPickupRequestedEmail(
  to: string,
  name: string,
  hubName: string
) {
  await sendEmail({
    to,
    subject: 'Pickup request received — Luggo',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0a3d5c">Hi ${name},</h2>
        <p>Your pickup request at <strong>${hubName}</strong> has been received.</p>
        <p>Please head to the hub counter — staff will hand over your bags shortly.</p>
        <p style="color:#888;font-size:12px;margin-top:24px">— The Luggo team</p>
      </div>
    `,
  })
}

export async function sendLateFeeReceiptEmail(
  to: string,
  name: string,
  hubName: string,
  amount: number
) {
  await sendEmail({
    to,
    subject: 'Late fee payment received — Luggo',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#0a3d5c">Hi ${name},</h2>
        <p>We received your late storage fee of <strong>LKR ${amount.toLocaleString()}</strong> for <strong>${hubName}</strong>.</p>
        <p>Please collect your bags at the hub counter at your earliest convenience.</p>
        <p style="color:#888;font-size:12px;margin-top:24px">— The Luggo team</p>
      </div>
    `,
  })
}
