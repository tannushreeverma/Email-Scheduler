import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;
let etherealAccount: { user: string; pass: string } | null = null;

/**
 * Creates an Ethereal test account and returns a Nodemailer transporter.
 * Ethereal is a fake SMTP service – emails are captured but never delivered.
 * You can view sent emails at https://ethereal.email/messages
 */
export async function getEmailTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  // Create a test account on Ethereal
  const account = await nodemailer.createTestAccount();
  etherealAccount = { user: account.user, pass: account.pass };

  console.log('✅ Ethereal Email account created:');
  console.log(`   User: ${account.user}`);
  console.log(`   Pass: ${account.pass}`);
  console.log(`   View sent emails: https://ethereal.email/login`);

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  return transporter;
}

export function getEtherealAccount() {
  return etherealAccount;
}
