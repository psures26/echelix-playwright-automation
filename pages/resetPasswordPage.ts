import { Page, Locator, expect } from '@playwright/test';

/**
 * ResetPasswordPage
 *
 * Page Object Model for the Echelix Test App Password Reset page.
 * URL: http://localhost:3000/reset?token=<token>
 *
 * Responsibilities:
 * - Open the reset link from the email
 * - Fill in the new password form
 * - Submit and assert success
 */
export class ResetPasswordPage {
  readonly page: Page;

  // Reset Password Page locators
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly saveButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // New Password Page elements
    this.newPasswordInput = page.locator('#newPassword');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.saveButton = page.locator('#saveButton');
    this.errorMessage = page.locator('#errorMessage');
    this.successMessage = page.locator('#successMessage');
  }

  /**
   * Opens the password reset link directly in the browser.
   * This simulates the user clicking the link from the reset email.
   *
   * @param resetLink - The full password reset URL extracted from the email
   */
  async openResetLink(resetLink: string): Promise<void> {
    console.log(`[ResetPasswordPage] Opening reset link: ${resetLink}`);
    await this.page.goto(resetLink);
    await this.page.waitForLoadState('networkidle');
    console.log('[ResetPasswordPage] Reset link page loaded');
  }

  /**
   * Fills in the new password and confirm password fields, then submits the form.
   *
   * @param newPassword - The new password to set
   */
  async setNewPassword(newPassword: string): Promise<void> {
    console.log('[ResetPasswordPage] Setting new password...');

    await this.newPasswordInput.waitFor({ state: 'visible' });
    await this.newPasswordInput.fill(newPassword);

    await this.confirmPasswordInput.waitFor({ state: 'visible' });
    await this.confirmPasswordInput.fill(newPassword);

    await this.saveButton.click();
    console.log('[ResetPasswordPage] New password form submitted');
  }

  /**
   * Asserts that the password was reset successfully.
   * After a successful reset, the success message is shown and
   * the page redirects to /login.
   */
  async assertPasswordResetSuccess(): Promise<void> {
    console.log('[ResetPasswordPage] Asserting password reset success...');

    // Wait for success message to appear
    await expect(this.successMessage).toBeVisible({ timeout: 10000 });

    // Then wait for redirect to login page
    await expect(this.page).toHaveURL(/.*login.*/, { timeout: 10000 });

    console.log('[ResetPasswordPage] ✅ Password reset completed — redirected to login page');
  }

  /**
   * Asserts that a password mismatch error is shown.
   */
  async assertPasswordMismatchError(): Promise<void> {
    console.log('[ResetPasswordPage] Asserting password mismatch error...');
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
    await expect(this.errorMessage).toContainText('do not match');
    console.log('[ResetPasswordPage] ✅ Password mismatch error is visible');
  }

  /**
   * Returns the current URL of the page.
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
