import { APIRequestContext, APIResponse, expect } from '@playwright/test';

/**
 * UserApiClient
 *
 * Handles all user-related API operations against the Echelix Test App.
 * Responsibilities:
 * - Trigger password reset via POST /api/reset-password
 * - Validate API response status codes
 * - Validate response payload structure
 */
export class UserApiClient {
  private readonly request: APIRequestContext;
  private readonly baseURL: string;

  constructor(request: APIRequestContext, baseURL?: string) {
    this.request = request;
    this.baseURL = baseURL || process.env.BASE_URL || 'http://localhost:3000';
  }

  /**
   * Sends a password reset request for the given username.
   * Makes a POST request to the Echelix Test App password reset endpoint.
   *
   * POST /api/reset-password
   * Body: { username: "testuser" }
   * Response: { success: true, message: "Password reset email sent successfully" }
   *
   * @param username - The username to request a password reset for
   * @returns APIResponse from the server
   */
  async triggerPasswordReset(username: string): Promise<APIResponse> {
    console.log(`[UserApiClient] Triggering password reset for: ${username}`);

    const response = await this.request.post(
      `${this.baseURL}/api/reset-password`,
      {
        data: { username },
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    console.log(`[UserApiClient] Response status: ${response.status()}`);
    return response;
  }

  /**
   * Validates the HTTP status code of the password reset response.
   * Accepts 200 (OK) — the Echelix Test App returns 200 on success.
   *
   * @param response - The API response to validate
   */
  async validatePasswordResetResponse(response: APIResponse): Promise<void> {
    const status = response.status();
    console.log(`[UserApiClient] Validating response status: ${status}`);

    expect(
      status,
      `Expected a successful response (200) but received: ${status}`
    ).toBe(200);

    console.log(`[UserApiClient] ✅ Response status ${status} is valid`);
  }

  /**
   * Validates and returns the response payload.
   * Verifies the response contains success: true and a message.
   *
   * @param response - The API response to parse
   * @returns Parsed response body as a record
   */
  async validateResponsePayload(
    response: APIResponse
  ): Promise<Record<string, unknown>> {
    const body = (await response.json()) as Record<string, unknown>;
    console.log(`[UserApiClient] Response payload:`, JSON.stringify(body, null, 2));

    expect(body).toBeDefined();
    expect(body.success).toBe(true);
    expect(body.message).toBeTruthy();

    return body;
  }
}
