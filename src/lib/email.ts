import nodemailer from "nodemailer";

// From address uses GMAIL_USER. For production, set GMAIL_USER to hello@akmind.com
// (or your verified domain sender) and use a proper SMTP provider instead of Gmail if needed.

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
  return _transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await getTransporter().sendMail({
      from: `"AKMIND" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("Email error:", e);
  }
}

export async function sendDemoLink(
  email: string,
  name: string,
  childName: string,
  token: string
) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Your AKMIND Demo Class is Ready!",
    html: `
    <div style="font-family:Arial;max-width:600px;margin:0 auto">
      <div style="background:#4f46e5;padding:32px;text-align:center">
        <h1 style="color:white;margin:0">AKMIND</h1>
        <p style="color:#c7d2fe;margin:4px 0 0">
          Dream. Discover. Shine.
        </p>
      </div>
      <div style="padding:32px">
        <h2 style="color:#1e293b">Hello ${name}!</h2>
        <p style="color:#475569">
          ${childName}'s demo class is ready. 
          Click below to begin:
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="${link}" 
             style="background:#4f46e5;color:white;
                    padding:16px 32px;border-radius:12px;
                    text-decoration:none;font-weight:bold;
                    font-size:16px">
            Start Demo Class →
          </a>
        </div>
        <p style="color:#475569">What's included:</p>
        <ul style="color:#475569;line-height:2">
          <li>✅ Live welcome class recording</li>
          <li>✅ History of AI + story game</li>
          <li>✅ AI vs Humans + story game</li>
          <li>✅ Types of AI + story game</li>
          <li>✅ Quizzes + XP + Demo Badge</li>
        </ul>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          This link is unique to ${name}. 
          One use only.
        </p>
      </div>
      <div style="background:#f8fafc;padding:16px;
                  text-align:center;color:#94a3b8;
                  font-size:12px">
        AKMIND by AkonnAI LLP, Bengaluru India
      </div>
    </div>`,
  });
}

export async function sendAdminNotification(
  name: string,
  email: string,
  phone: string,
  childName: string,
  token: string
) {
  const link = `${process.env.NEXT_PUBLIC_APP_URL}?token=${token}`;
  await sendEmail({
    to: process.env.ADMIN_EMAIL!,
    subject: `New Demo — ${childName} (${name})`,
    html: `
    <div style="font-family:Arial;max-width:500px">
      <h2 style="color:#4f46e5">New Demo Booking</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px;color:#64748b">
          Parent</td>
          <td style="padding:8px;font-weight:bold">
          ${name}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Email</td>
          <td style="padding:8px">${email}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Phone</td>
          <td style="padding:8px">${phone}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Child</td>
          <td style="padding:8px;font-weight:bold">
          ${childName}</td></tr>
        <tr><td style="padding:8px;color:#64748b">
          Link</td>
          <td style="padding:8px">
          <a href="${link}">${link}</a></td></tr>
      </table>
    </div>`,
  });
}
