import nodemailer from 'nodemailer';
import { getEmailTransporter } from '../config/ethereal';
import prisma from '../config/database';
import { elasticsearchService } from './elasticsearch.service';

/**
 * Sends a single email via Ethereal SMTP and updates the DB record.
 */
export async function sendEmail(
  emailId: string,
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string; previewUrl: string | false }> {
  const transporter = await getEmailTransporter();

  // Mark as PROCESSING to prevent duplicate sends
  await prisma.email.update({
    where: { id: emailId },
    data: { status: 'PROCESSING' },
  });

  try {
    const info = await transporter.sendMail({
      from: `"ReachInbox" <${from}>`,
      to,
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML for plain text
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    // Mark as SENT
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        etherealUrl: previewUrl ? previewUrl.toString() : null,
      },
    });

    // Index in Elasticsearch
    try {
      const updatedEmail = await prisma.email.findUnique({ where: { id: emailId } });
      if (updatedEmail) {
        await elasticsearchService.indexEmail(updatedEmail);
      }
    } catch (esErr) {
      console.warn('⚠️  Failed to index email in Elasticsearch:', (esErr as Error).message);
    }

    console.log(`✉️  Email sent: ${to} | Subject: ${subject}`);
    if (previewUrl) {
      console.log(`   Preview: ${previewUrl}`);
    }

    return { messageId: info.messageId, previewUrl };
  } catch (error) {
    // Mark as FAILED
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
      },
    });

    throw error;
  }
}
