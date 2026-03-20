/**
 * EmailParser
 *
 * Utility for parsing email content.
 * Responsibilities:
 * - Extract password reset links from email body (HTML or plain text)
 * - Decode HTML entities in URLs
 * - Validate extracted URLs
 */
export class EmailParser {
  /**
   * Extracts the password reset link from an email body.
   * Tries HTML href extraction first, then plain text patterns, then generic URL search.
   *
   * @param emailBody - Raw email body (HTML or plain text)
   * @returns The extracted password reset URL
   * @throws Error if no reset link is found
   */
  extractPasswordResetLink(emailBody: string): string {
    console.log('[EmailParser] Attempting to extract password reset link...');

    const resetLink =
      this.extractFromHtmlHref(emailBody) ||
      this.extractFromPlainTextUrl(emailBody) ||
      this.extractFromGenericUrl(emailBody);

    if (!resetLink) {
      console.error(
        '[EmailParser] Email body preview (first 500 chars):',
        emailBody.substring(0, 500)
      );
      throw new Error(
        '[EmailParser] Could not find a password reset link in the email body. ' +
          'Check the email content and update the extraction patterns if needed.'
      );
    }

    console.log(`[EmailParser] ✅ Reset link extracted: ${resetLink}`);
    return resetLink;
  }

  /**
   * Extracts a URL from an HTML anchor tag href attribute.
   * Looks for href values containing reset-related keywords.
   *
   * Example match:
   *   <a href="https://example.com/resetPassword?token=abc">Click here</a>
   *   → returns "https://example.com/resetPassword?token=abc"
   *
   * @param html - HTML email body
   * @returns Extracted URL or null
   */
  private extractFromHtmlHref(html: string): string | null {
    // Match href attributes containing reset/password/token/verify keywords
    const resetHrefPattern =
      /href=["']([^"']*(?:reset|password|token|verify)[^"']*)["']/gi;
    const matches = [...html.matchAll(resetHrefPattern)];

    if (matches.length > 0) {
      const url = matches[0][1];
      const decoded = this.decodeHtmlEntities(url);
      console.log(`[EmailParser] Found href URL: ${decoded}`);
      return decoded;
    }

    return null;
  }

  /**
   * Extracts a URL from plain text email content.
   * Looks for URLs appearing after common reset-related phrases.
   *
   * Example match:
   *   "Click here to reset your password: https://example.com/reset?token=abc"
   *   → returns "https://example.com/reset?token=abc"
   *
   * @param text - Plain text email body
   * @returns Extracted URL or null
   */
  private extractFromPlainTextUrl(text: string): string | null {
    const plainTextPattern =
      /(?:click here|reset password|reset link|follow this link)[:\s]*\n?\s*(https?:\/\/[^\s\n<>"]+)/gi;
    const match = plainTextPattern.exec(text);

    if (match) {
      const url = match[1].trim();
      console.log(`[EmailParser] Found plain text URL: ${url}`);
      return url;
    }

    return null;
  }

  /**
   * Generic URL extractor — finds any HTTPS URL containing reset-related keywords.
   * Used as a fallback when the above patterns don't match.
   *
   * Example match:
   *   "...https://example.com/auth/resetPassword?token=xyz123..."
   *   → returns "https://example.com/auth/resetPassword?token=xyz123"
   *
   * @param content - Email body content
   * @returns Extracted URL or null
   */
  private extractFromGenericUrl(content: string): string | null {
    const genericPattern =
      /https?:\/\/[^\s<>"']+(?:reset|password|token|verify)[^\s<>"']*/gi;
    const matches = [...content.matchAll(genericPattern)];

    if (matches.length > 0) {
      // Remove trailing punctuation that may have been captured
      const url = matches[0][0].replace(/[.,;)]+$/, '');
      console.log(`[EmailParser] Found generic URL: ${url}`);
      return url;
    }

    return null;
  }

  /**
   * Decodes HTML entities in a URL string.
   * Email HTML often encodes & as &amp; which breaks URLs.
   *
   * Example:
   *   "https://example.com/reset?token=abc&amp;user=123"
   *   → "https://example.com/reset?token=abc&user=123"
   *
   * @param url - URL potentially containing HTML entities
   * @returns Decoded URL string
   */
  private decodeHtmlEntities(url: string): string {
    return url
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /**
   * Validates that a string is a properly formed HTTP/HTTPS URL.
   *
   * @param url - URL string to validate
   * @returns true if valid, false otherwise
   */
  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /**
   * Strips HTML tags from email body to get plain text.
   * Removes style and script blocks first, then all remaining tags.
   *
   * @param html - HTML email body
   * @returns Plain text content
   */
  stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
