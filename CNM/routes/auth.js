const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const { auditLog } = require('../middlewares/auth');

const authService = new AuthService();

// Middleware ghi log
router.use(auditLog);

/**
 * POST /api/auth/register
 * Đăng ký user mới (admin only)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Kiểm tra role nếu được gửi (mặc định là staff)
    const userRole = role === 'admin' ? 'admin' : 'staff';

    const user = await authService.register(username, password, userRole);
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * POST /api/auth/login
 * Đăng nhập
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await authService.login(username, password);

    // Lưu session
    req.session.user = user;

    res.json({ message: 'Login successful', user });
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Đăng xuất
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

/**
 * GET /api/auth/me
 * Lấy thông tin user hiện tại
 */
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  res.json({ user: req.session.user });
});

module.exports = router;
