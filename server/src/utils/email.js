import nodemailer from "nodemailer";

export async function sendVerificationCode(recipient, code) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) throw new Error("Email delivery is not configured. Set the SMTP variables in server/.env.");
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000
  });
  await transport.sendMail({ from: EMAIL_FROM, to: recipient, subject: "Verify your wellbeing account", text: `Your Employee Wellbeing Monitoring System verification code is ${code}. It expires in five minutes.` });
}
