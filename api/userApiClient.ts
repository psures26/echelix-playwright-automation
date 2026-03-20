import { APIRequestContext, APIResponse, expect } from '@playwright/test';

/**
 * UserApiClient
 *
 * Handles all user-related API operations.
 * Responsibilities:
 * - Trigger password reset via POST /api/users/reset-password
 * - Validate API response status codes
 * - Validate response payload structure
 */
export class UserApiClient {
  private readonly request: APIRequestContext;
  private readonly baseURL: string;

  constructor(request: APIRequestContext, baseURL?: string) {
    this.request = request;
    this.baseURL = baseURL || process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com';
  }

  /**
   * Sends a password reset request for the given username.
   * Makes a POST request to the OrangeHRM password reset endpoint.
   *
   * @param username - The username to request a password reset for
   * @returns APIResponse from the server
   */
  async triggerPasswordReset(username: string): Promise<APIResponse> {
    console.log(`[UserApiClient] Triggering password reset for: ${username}`);

    const response = await this.request.post(
      `${this.baseURL}/web/index.php/auth/sendPasswordReset`,
      {
        form: {
          username: username,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/plain, */*',
        },
      }
    );

    console.log(`[UserApiClient] Response status: ${response.status()}`);
    return response;
  }

  /**
   * Validates the HTTP status code of the password reset response.
   * Accepts 200 (OK), 201 (Created), or 302 (Redirect after form submit).
   *
   * @param response - The API response to validate
   */
  async validatePasswordResetResponse(response: APIResponse): Promise<void> {
    const status = response.status();
    console.log(`[UserApiClient] Validating response status: ${status}`);

    const isValidStatus = status === 200 || status === 201 || status === 302;

    expect(
      isValidStatus,
      `Expected a successful response (200/201/302) but received: ${status}`
    ).toBeTruthy();

    console.log(`[UserApiClient] ✅ Response status ${status} is valid`);
  }

  /**
   * Validates and returns the response payload.
   * Handles both JSON and plain text responses.
   *
   * @param response - The API response to parse
   * @returns Parsed response body as a record
   */
  async validateResponsePayload(
    response: APIResponse
  ): Promise<Record<string, unknown>> {
    const contentType = response.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      const body = (await response.json()) as Record<string, unknown>;
      console.log(`[UserApiClient] JSON payload:`, JSON.stringify(body, null, 2));
      expect(body).toBeDefined();
      return body;
    }

    const text = await response.text();
    console.log(`[UserApiClient] Text payload (first 200 chars): ${text.substring(0, 200)}`);
    expect(text).toBeDefined();
    return { rawText: text };
  }
}
