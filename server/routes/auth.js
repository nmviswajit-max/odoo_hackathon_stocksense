const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register Endpoint (Accepts name, email, password, and requested role)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = db.getUserByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Account Conflict', message: 'An account with this email address already exists.' });
    }

    const validRoles = ['admin', 'manager', 'worker'];
    const assignedRole = validRoles.includes(role) ? role : 'worker';

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const newUser = db.addUser({
      name: name.trim(),
      email: normalizedEmail,
      password_hash,
      role: assignedRole
    });

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });

  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to create account.' });
  }
});

// Login Endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Please provide both email and password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db.getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid email address or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid email address or password.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Authentication successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });

  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Authentication failed.' });
  }
});

// Email Format Validation Helper
const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Send OTP for Account Creation (Signup Email Verification)
router.post('/send-signup-otp', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(trimmedEmail)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid email format. Please enter a valid address (e.g. name@gmail.com).' });
    }

    const existingUser = db.getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'Account Conflict', message: 'An account with this email address already exists. Please sign in instead.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.setSignupOTP(trimmedEmail, otpCode);

    res.json({
      message: `Gmail OTP dispatched successfully to ${trimmedEmail}`,
      otpDemoCode: otpCode,
      email: trimmedEmail
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to dispatch signup OTP code.' });
  }
});

// Verify Signup OTP Code
router.post('/verify-signup-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and 6-digit OTP code are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    db.verifySignupOTP(trimmedEmail, otp.trim());

    res.json({ message: 'Gmail address verified successfully! You may now complete account creation.' });
  } catch (err) {
    res.status(400).json({ error: 'Verification Failed', message: err.message || 'Signup OTP verification failed.' });
  }
});

// OTP Request (Sends 6-digit OTP code to registered Gmail address)
router.post('/send-otp', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(trimmedEmail)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid email format. Please enter a valid address (e.g. name@gmail.com).' });
    }

    const user = db.getUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: `No registered account found for ${trimmedEmail}.` });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    db.setOTP(user.email, otpCode);

    res.json({
      message: `Gmail OTP dispatched successfully to ${user.email}`,
      otpDemoCode: otpCode,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ error: 'Server Error', message: 'Failed to dispatch OTP code.' });
  }
});

// Gmail Direct OTP Login Endpoint (No Password Required)
router.post('/verify-otp-login', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Validation Error', message: 'Gmail address and 6-digit OTP code are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(trimmedEmail)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid email format. Must be e.g. user@gmail.com.' });
    }

    const user = db.verifyOTPOnly(trimmedEmail, otp.trim());

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Gmail OTP login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(400).json({ error: 'Verification Failed', message: err.message || 'OTP Verification failed.' });
  }
});

// Verify OTP & Reset Password
router.post('/verify-otp-reset', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email, OTP, and new password are required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmailFormat(trimmedEmail)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid email format.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    db.verifyOTPAndResetPassword(trimmedEmail, otp.trim(), newPasswordHash);

    res.json({ message: 'Password reset successful! You may now sign in with your new password.' });
  } catch (err) {
    res.status(400).json({ error: 'Verification Failed', message: err.message || 'OTP Verification failed.' });
  }
});

// Current Authenticated User Endpoint
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
