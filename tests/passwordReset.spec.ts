import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { UserApiClient } from '../api/userApiClient';
import { GmailService } from '../services/gmailService';
import { EmailParser } from '../utils/emailParser';
import { LoginPage } from '../pages/loginPage';
import { ResetPasswordPage } from '../pages/resetPasswordPage';

// Load environment variables from .env file
dotenv.config();

/**
 * Password Reset Workflow — E2E Test Suite
 *
 * Target Application: Echelix Test App (http://localhost:3000)
 * A custom Express.js application built to demonstrate the full
 * password reset automation workflow.
 *
 * Full Workflow:
 *   Step 1 → Trigger password reset via API (POST /api/reset-password)
 *   Step 2 → App sends real reset email to Gmail via Nodemailer
 *   Step 3 → Retrieve email via Gmail API (with polling)
 *   Step 4 → Extract reset link from email body
 *   Step 5 → Open reset link via Playwright UI automation
 *   Step 6 → Set new password through the web interface
 *   Step 7 → Verify login succeeds with the new password
 *
 * Prerequisites:
 *   - Test app must be running: cd test-app && node server.js
 *   - Gmail API credentials must be configured in .env
 */
test.describe('Password Reset Workflow', () => {
  // Test configuration — uses the Echelix Test App's test user
  const TEST_USERNAME = process.env.TEST_USERNAME || 'testuser';
  const NEW_PASSWORD = process.env.NEW_PASSWORD || 'NewSecurePass@123';
  const EMAIL_POLL_MAX_RETRIES = parseInt(
    process.env.EMAIL_POLL_MAX_RETRIES || '10'
  );
  const EMAIL_POLL_INTERVAL_MS = parseInt(
    process.env.EMAIL_POLL_INTERVAL_MS || '5000'
  );

  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test to ensure a clean session
    await page.context().clearCookies();
  });

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * TC-001: Full End-to-End Password Reset Workflow
   *
   * Validates the complete flow:
   * API trigger → Email receipt → Link extraction → UI reset → Login verification
   */
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-001: should complete full password reset workflow end-to-end', async ({
    page,
    request,
  }) => {
    // ── STEP 1: Trigger password reset via API ────────────────────────────
    console.log('\n══════════════════════════════════════════════════════');
    console.log('STEP 1: Triggering password reset via API');
    console.log('══════════════════════════════════════════════════════');

    const apiClient = new UserApiClient(request);

    // Record timestamp before triggering reset (used to filter emails)
    const resetTimestamp = Date.now();

    const apiResponse = await apiClient.triggerPasswordReset(TEST_USERNAME);
    await apiClient.validatePasswordResetResponse(apiResponse);
    await apiClient.validateResponsePayload(apiResponse);

    console.log('✅ STEP 1 COMPLETE: Password reset API request successful\n');

    // ── STEP 2 & 3: Wait for and retrieve the reset email ─────────────────
    console.log('══════════════════════════════════════════════════════');
    console.log('STEP 2-3: Waiting for password reset email via Gmail API');
    console.log('══════════════════════════════════════════════════════');

    const gmailService = new GmailService(
      EMAIL_POLL_MAX_RETRIES,
      EMAIL_POLL_INTERVAL_MS
    );

    // Poll Gmail inbox for the reset email (only emails after resetTimestamp)
    const resetEmail = await gmailService.waitForEmail(
      'Reset Password',
      resetTimestamp
    );

    // Validate email was received and has content
    expect(resetEmail).toBeDefined();
    expect(resetEmail.subject).toBeTruthy();
    expect(resetEmail.body).toBeTruthy();

    console.log(
      `✅ STEP 2-3 COMPLETE: Email received — Subject: "${resetEmail.subject}"\n`
    );

    // ── STEP 4: Extract the password reset link from the email body ────────
    console.log('══════════════════════════════════════════════════════');
    console.log('STEP 4: Extracting password reset link from email body');
    console.log('══════════════════════════════════════════════════════');

    const emailParser = new EmailParser();
    const resetLink = emailParser.extractPasswordResetLink(resetEmail.body);

    // Validate the extracted link is a valid URL
    expect(resetLink).toBeTruthy();
    expect(emailParser.isValidUrl(resetLink)).toBeTruthy();
    expect(resetLink).toContain('localhost:3000/reset');

    console.log(`✅ STEP 4 COMPLETE: Reset link extracted: ${resetLink}\n`);

    // ── STEP 5 & 6: Open reset link and set new password via UI ───────────
    console.log('══════════════════════════════════════════════════════');
    console.log('STEP 5-6: Opening reset link and setting new password');
    console.log('══════════════════════════════════════════════════════');

    const resetPasswordPage = new ResetPasswordPage(page);

    // Open the reset link from the email in the browser
    await resetPasswordPage.openResetLink(resetLink);

    // Fill in and submit the new password form
    await resetPasswordPage.setNewPassword(NEW_PASSWORD);

    // Assert the password was reset successfully
    await resetPasswordPage.assertPasswordResetSuccess();

    console.log('✅ STEP 5-6 COMPLETE: New password set successfully\n');

    // ── STEP 7: Verify login with the new password ─────────────────────────
    console.log('══════════════════════════════════════════════════════');
    console.log('STEP 7: Verifying login with new password');
    console.log('══════════════════════════════════════════════════════');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();
    await loginPage.login(TEST_USERNAME, NEW_PASSWORD);
    await loginPage.assertLoginSuccess();

    console.log('✅ STEP 7 COMPLETE: Login with new password successful\n');
    console.log('══════════════════════════════════════════════════════');
    console.log('🎉 TC-001 PASSED: Full Password Reset Workflow Complete');
    console.log('══════════════════════════════════════════════════════\n');
  });

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * TC-002: API — Password Reset Request Validation
   *
   * Validates:
   * - API accepts a valid username
   * - Returns HTTP 200 with success: true
   * - Returns a valid response payload with message
   */
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-002: should validate password reset API response', async ({
    request,
  }) => {
    console.log('\nTC-002: Validating password reset API response');

    const apiClient = new UserApiClient(request);

    // Trigger password reset
    const response = await apiClient.triggerPasswordReset(TEST_USERNAME);

    // Assert status code is 200
    const status = response.status();
    console.log(`[TC-002] API Response Status: ${status}`);
    expect(status).toBe(200);

    // Assert response payload
    const payload = await apiClient.validateResponsePayload(response);
    expect(payload.success).toBe(true);
    expect(payload.message).toBeTruthy();

    console.log('✅ TC-002 PASSED: API response validation successful');
  });

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * TC-003: UI — Login Page Validation
   *
   * Validates:
   * - Login page loads correctly
   * - All form elements are visible (username, password, submit, forgot password)
   * - Invalid credentials show an error message
   */
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-003: should validate login page elements and error handling', async ({
    page,
  }) => {
    console.log('\nTC-003: Validating login page elements');

    const loginPage = new LoginPage(page);
    await loginPage.navigate();

    // Assert page title is set
    const title = await loginPage.getPageTitle();
    expect(title).toBeTruthy();
    console.log(`[TC-003] Page title: ${title}`);

    // Assert all form elements are visible
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.forgotPasswordLink).toBeVisible();

    // Test that invalid credentials show an error message
    await loginPage.login('invaliduser', 'wrongpassword');
    await loginPage.assertLoginFailure();

    console.log('✅ TC-003 PASSED: Login page validation successful');
  });

  // ─────────────────────────────────────────────────────────────────────────
  /**
   * TC-004: UI — Reset Password Page Validation
   *
   * Validates:
   * - Reset password page loads correctly
   * - Password fields and submit button are visible
   * - Password mismatch shows an error
   */
  // ─────────────────────────────────────────────────────────────────────────
  test('TC-004: should validate reset password page elements', async ({
    page,
  }) => {
    console.log('\nTC-004: Validating reset password page');

    const resetPasswordPage = new ResetPasswordPage(page);

    // Navigate directly to reset page (without a token for UI validation)
    await page.goto('/reset');
    await page.waitForLoadState('networkidle');

    // Assert form elements are visible
    await expect(resetPasswordPage.newPasswordInput).toBeVisible();
    await expect(resetPasswordPage.confirmPasswordInput).toBeVisible();
    await expect(resetPasswordPage.saveButton).toBeVisible();

    // Test password mismatch validation
    await resetPasswordPage.newPasswordInput.fill('Password123');
    await resetPasswordPage.confirmPasswordInput.fill('DifferentPassword456');
    await resetPasswordPage.saveButton.click();

    // Assert mismatch error is shown
    await resetPasswordPage.assertPasswordMismatchError();

    console.log('✅ TC-004 PASSED: Reset password page validation successful');
  });
});
