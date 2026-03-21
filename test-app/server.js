/**
 * Echelix Test App — Express Server
 *
 * A minimal Node.js/Express application built specifically for
 * Playwright end-to-end automation testing of the password reset workflow.
 *
 * Features:
 * - POST /api/reset-password     → Validates user, generates token, sends real email via Gmail API
 * - POST /api/reset-password/confirm → Validates token, updates password
 * - POST /api/login              → Validates credentials, returns success
 * - GET  /login                  → Login page
 * - GET  /reset                  → Reset password page (reads token from query param)
 * - GET  /dashboard              → Dashboard page (shown after successful login)
 */

require('dotenv').config({ path: '../.env' });
const express = require('express');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.TEST_APP_PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── In-Memory Data Store ──────────────────────────────────────────────────────
const users = {
  testuser: {
    password: 'OldPassword123',
    email: process.env.TEST_EMAIL || 'prarthanasureshkumar200@gmail.com',
  },
};

// Stores active reset tokens: { token: { username, expiresAt } }
const resetTokens = {};

// ── Gmail API Send Email ──────────────────────────────────────────────────────
// Uses Gmail API directly (not SMTP) — required for OAuth2 in modern Gmail
async function sendResetEmail(toEmail, username, resetLink) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const emailBody = [
    `From: "Echelix Test App" <${process.env.TEST_EMAIL}>`,
    `To: ${toEmail}`,
    `Subject: Reset Password — Echelix Test App`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`,
    `  <h2>Password Reset Request</h2>`,
    `  <p>Hello <strong>${username}</strong>,</p>`,
    `  <p>We received a request to reset your password. Click the link below to set a new password:</p>`,
    `  <p style="margin: 24px 0;">`,
    `    <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">`,
    `      Reset Password`,
    `    </a>`,
    `  </p>`,
    `  <p>Or copy and paste this link into your browser:</p>`,
    `  <p><a href="${resetLink}">${resetLink}</a></p>`,
    `  <p>This link will expire in 1 hour.</p>`,
    `  <hr>`,
    `  <p style="color: #666; font-size: 12px;">Echelix Test App — Playwright Automation POC</p>`,
    `</div>`,
  ].join('\n');

  // Base64url encode the email
  const encodedEmail = Buffer.from(emailBody)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedEmail },
  });

  console.log(`[API] Reset email sent to: ${toEmail}`);
}

// ── API Routes ────────────────────────────────────────────────────────────────

/**
 * POST /api/reset-password
 * Body: { username: "testuser" }
 * Response: { success: true, message: "Password reset email sent successfully" }
 */
app.post('/api/reset-password', async (req, res) => {
  const { username } = req.body;
  console.log(`[API] POST /api/reset-password — username: ${username}`);

  const user = users[username];
  if (!user) {
    console.log(`[API] User not found: ${username}`);
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Generate a unique reset token (expires in 1 hour)
  const token = uuidv4();
  resetTokens[token] = {
    username,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };

  console.log(`[API] Generated reset token for ${username}: ${token}`);

  const resetLink = `http://localhost:${PORT}/reset?token=${token}`;

  try {
    await sendResetEmail(user.email, username, resetLink);
    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error) {
    console.error('[API] Failed to send email:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset email',
      error: error.message,
    });
  }
});

/**
 * POST /api/reset-password/confirm
 * Body: { token: "uuid", newPassword: "NewPass123" }
 * Response: { success: true, message: "Password updated" }
 */
app.post('/api/reset-password/confirm', (req, res) => {
  const { token, newPassword } = req.body;
  console.log(`[API] POST /api/reset-password/confirm — token: ${token}`);

  const tokenData = resetTokens[token];
  if (!tokenData) {
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }

  if (Date.now() > tokenData.expiresAt) {
    delete resetTokens[token];
    return res.status(400).json({ success: false, message: 'Token has expired' });
  }

  const { username } = tokenData;
  users[username].password = newPassword;
  delete resetTokens[token];

  console.log(`[API] Password updated for user: ${username}`);
  res.status(200).json({ success: true, message: 'Password updated successfully' });
});

/**
 * POST /api/login
 * Body: { username: "testuser", password: "NewPass123" }
 * Response: { success: true, message: "Login successful" }
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`[API] POST /api/login — username: ${username}`);

  const user = users[username];
  if (!user || user.password !== password) {
    console.log(`[API] Login failed for: ${username}`);
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  console.log(`[API] Login successful for: ${username}`);
  res.status(200).json({ success: true, message: 'Login successful', username });
});

// ── Page Routes ───────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/reset', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/', (req, res) => {
  res.redirect('/login');
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Echelix Test App running at http://localhost:${PORT}`);
  console.log(`   Login page:     http://localhost:${PORT}/login`);
  console.log(`   Reset page:     http://localhost:${PORT}/reset?token=<token>`);
  console.log(`   Dashboard:      http://localhost:${PORT}/dashboard`);
  console.log(`\n   Test user:      testuser / OldPassword123`);
  console.log(`   Reset email to: ${process.env.TEST_EMAIL || 'prarthanasureshkumar200@gmail.com'}\n`);
});

module.exports = app;
