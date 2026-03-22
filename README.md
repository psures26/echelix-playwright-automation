# Playwright E2E Test Automation — Password Reset Workflow

A Playwright-based end-to-end test automation framework that validates a complete password reset workflow spanning **API → Email → UI** within a single test run.

## Overview

This project demonstrates Playwright's capability as a unified automation framework for:

- **API Testing** — Triggering backend operations and validating responses
- **Email Verification** — Retrieving and parsing emails via the Gmail API
- **UI Automation** — Interacting with web pages using the Page Object Model
- **End-to-End Workflow** — Chaining all three layers into a single automated test

### Workflow Under Test

```
POST /api/reset-password → Gmail receives reset email → Extract reset link →
Playwright opens link → Sets new password via UI → Logs in with new credentials ✅
```

## Project Structure

```
├── tests/
│   └── passwordReset.spec.ts       # E2E test spec (4 test cases)
├── api/
│   └── userApiClient.ts            # API client for password reset endpoints
├── pages/
│   ├── loginPage.ts                # Login page object model
│   └── resetPasswordPage.ts        # Reset password page object model
├── services/
│   └── gmailService.ts             # Gmail API integration with polling
├── utils/
│   └── emailParser.ts              # Email body parser and link extractor
├── test-app/                       # Express.js application under test
│   ├── server.js                   # API + email sending via Gmail API
│   └── public/                     # HTML pages (login, reset, dashboard)
├── playwright.config.ts
├── .env.example
└── .gitignore
```

## Prerequisites

- Node.js 18+
- A Google Cloud project with the Gmail API enabled
- OAuth2 credentials (Client ID, Client Secret, Refresh Token) with `gmail.readonly` and `gmail.send` scopes

## Setup

```bash
# 1. Install dependencies
npm install
cd test-app && npm install && cd ..

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Configure environment
cp .env.example .env
# Edit .env with your Gmail API credentials and test email
```

## Running Tests

```bash
# Terminal 1 — Start the test application
cd test-app && node server.js

# Terminal 2 — Run all tests
npm test

# View the HTML report
npx playwright show-report
```

### Run Options

```bash
# Run with browser visible
npx playwright test --headed

# Run a specific test
npx playwright test --grep "TC-001"
```

## Test Cases

| Test | Description |
|------|-------------|
| TC-001 | Full E2E: API trigger → email retrieval → UI password reset → login verification |
| TC-002 | API response validation (status code and payload) |
| TC-003 | Login page UI elements and error handling |
| TC-004 | Reset password page UI validation |

## Tech Stack

- **Framework:** Playwright with TypeScript
- **Test Runner:** Playwright Test Runner
- **Email Integration:** Gmail API (OAuth2)
- **Application Under Test:** Node.js / Express
- **Reporting:** Playwright HTML Report
