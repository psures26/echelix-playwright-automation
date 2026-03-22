import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

/**
 * GmailMessage
 * Represents a parsed email message retrieved from Gmail API.
 */
export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  receivedAt: Date;
}

/**
 * GmailService
 *
 * Handles Gmail API integration for email verification.
 * Responsibilities:
 * - Authenticate with Gmail API via OAuth2
 * - Poll inbox for incoming emails matching a subject filter
 * - Retrieve and return parsed email message content
 */
export class GmailService {
  private oauth2Client: OAuth2Client;
  private readonly maxRetries: number;
  private readonly retryIntervalMs: number;

  constructor(maxRetries = 10, retryIntervalMs = 5000) {
    this.maxRetries = maxRetries;
    this.retryIntervalMs = retryIntervalMs;

    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });
  }

  /**
   * Polls the Gmail inbox for an email matching the given subject.
   * Retries up to maxRetries times with retryIntervalMs delay between attempts.
   *
   * @param subjectFilter - Partial subject string to search for
   * @param afterTimestamp - Only look for emails received after this time (ms since epoch)
   * @returns The matching GmailMessage
   * @throws Error if email is not found after all retries
   */
  async waitForEmail(
    subjectFilter: string,
    afterTimestamp: number
  ): Promise<GmailMessage> {

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {

      try {
        const message = await this.findEmail(subjectFilter, afterTimestamp);
        if (message) {
          return message;
        }
      } catch (error) {
        console.warn(`[GmailService] Error on attempt ${attempt}:`, error);
      }

      if (attempt < this.maxRetries) {
        await this.sleep(this.retryIntervalMs);
      }
    }

    throw new Error(
      `[GmailService] Email with subject "${subjectFilter}" not found after ` +
        `${this.maxRetries} attempts (${(this.maxRetries * this.retryIntervalMs) / 1000}s total wait)`
    );
  }

  /**
   * Searches Gmail inbox for an email matching the subject filter.
   *
   * @param subjectFilter - Partial subject string to search for
   * @param afterTimestamp - Only look for emails received after this time
   * @returns The matching GmailMessage or null if not found
   */
  private async findEmail(
    subjectFilter: string,
    afterTimestamp: number
  ): Promise<GmailMessage | null> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const afterSeconds = Math.floor(afterTimestamp / 1000);

    const query = `subject:"${subjectFilter}" after:${afterSeconds}`;

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 5,
    });

    const messages = listResponse.data.messages;
    if (!messages || messages.length === 0) {
      return null;
    }

    // Get the most recent matching message (first in list)
    const messageId = messages[0].id!;

    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    return this.parseGmailMessage(messageResponse.data);
  }

  /**
   * Parses a raw Gmail API message into a structured GmailMessage object.
   * Extracts headers (Subject, From, To, Date) and decodes the body.
   *
   * @param rawMessage - Raw Gmail API message object
   * @returns Parsed GmailMessage
   */
  private parseGmailMessage(
    rawMessage: ReturnType<typeof Object.create>
  ): GmailMessage {
    const headers: Array<{ name: string; value: string }> =
      rawMessage.payload?.headers || [];

    // Helper to find a header value by name (case-insensitive)
    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase()
      );
      return header?.value || '';
    };

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const dateStr = getHeader('Date');

    // Extract and decode the email body
    const body = this.extractEmailBody(rawMessage.payload);

    return {
      id: rawMessage.id || '',
      subject,
      from,
      to,
      body,
      receivedAt: dateStr ? new Date(dateStr) : new Date(),
    };
  }

  /**
   * Recursively extracts the email body from the Gmail message payload.
   * Prefers HTML content over plain text for link extraction.
   * Handles both simple and multipart/alternative messages.
   *
   * @param payload - Gmail message payload
   * @returns Decoded email body string
   */
  private extractEmailBody(payload: ReturnType<typeof Object.create>): string {
    if (!payload) return '';

    // Simple message: body data is directly on the payload
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts && Array.isArray(payload.parts)) {
      const htmlPart = payload.parts.find(
        (p: { mimeType: string }) => p.mimeType === 'text/html'
      );
      if (htmlPart?.body?.data) {
        return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
      }

      // Fall back to plain text
      const textPart = payload.parts.find(
        (p: { mimeType: string }) => p.mimeType === 'text/plain'
      );
      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }

      for (const part of payload.parts) {
        const body = this.extractEmailBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  /**
   * Utility sleep function used between polling attempts.
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
