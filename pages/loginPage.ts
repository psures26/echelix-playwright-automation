import { Page, Locator, expect } from '@playwright/test';

/**
 * LoginPage
 *
 * Page Object Model for the Echelix Test App Login Page.
 * URL: http://localhost:3000/login
 *
 * Responsibilities:
 * - Navigate to the login page
 * - Fill in username and password
 * - Submit the login form
 * - Assert successful login (dashboard visible)
 * - Assert login failure (error message visible)
 */
export class LoginPage {
  readonly page: Page;

  // Locators
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly errorMessage: Locator;
  readonly dashboardHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form fields
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.loginButton = page.locator('#loginButton');

    // Forgot password link
    this.forgotPasswordLink = page.locator('#forgotPasswordLink');

    // Error message shown on invalid credentials
    this.errorMessage = page.locator('#errorMessage');

    // Dashboard heading visible after successful login
    this.dashboardHeading = page.locator('#welcomeHeading');
  }

  /**
   * Navigates to the login page and waits for it to load.
   */
  async navigate(): Promise<void> {
    console.log('[LoginPage] Navigating to login page...');
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
    console.log('[LoginPage] Login page loaded');
  }

  /**
   * Fills in the username and password fields and submits the login form.
   *
   * @param username - The username to log in with
   * @param password - The password to log in with
   */
  async login(username: string, password: string): Promise<void> {
    console.log(`[LoginPage] Logging in as: ${username}`);

    await this.usernameInput.waitFor({ state: 'visible' });
    await this.usernameInput.fill(username);

    await this.passwordInput.waitFor({ state: 'visible' });
    await this.passwordInput.fill(password);

    await this.loginButton.click();
    console.log('[LoginPage] Login form submitted');
  }

  /**
   * Asserts that the user has successfully logged in.
   * Verifies the URL contains /dashboard and the welcome heading is visible.
   */
  async assertLoginSuccess(): Promise<void> {
    console.log('[LoginPage] Asserting successful login...');

    await expect(this.page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
    await expect(this.dashboardHeading).toBeVisible({ timeout: 15000 });

    console.log('[LoginPage] ✅ Login successful — Dashboard is visible');
  }

  /**
   * Asserts that the login failed by verifying an error message is displayed.
   *
   * @param expectedMessage - Optional expected error message text to verify
   */
  async assertLoginFailure(expectedMessage?: string): Promise<void> {
    console.log('[LoginPage] Asserting login failure...');

    await expect(this.errorMessage).toBeVisible({ timeout: 10000 });

    if (expectedMessage) {
      await expect(this.errorMessage).toContainText(expectedMessage);
    }

    console.log('[LoginPage] ✅ Login failure confirmed — error message is visible');
  }

  /**
   * Clicks the "Forgot your password?" link.
   */
  async clickForgotPassword(): Promise<void> {
    console.log('[LoginPage] Clicking "Forgot your password?" link...');
    await this.forgotPasswordLink.waitFor({ state: 'visible' });
    await this.forgotPasswordLink.click();
    console.log('[LoginPage] Navigated to forgot password page');
  }

  /**
   * Returns the current page title.
   */
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }
}
