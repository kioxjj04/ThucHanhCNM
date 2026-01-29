/**
 * Middleware kiểm tra người dùng đã đăng nhập
 */
const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  next();
};

/**
 * Middleware kiểm tra quyền admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Admin role required.' });
  }

  next();
};

/**
 * Middleware kiểm tra quyền staff (có thể xem nhưng không sửa)
 */
const requireStaff = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }

  if (req.session.user.role !== 'staff' && req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Staff role required.' });
  }

  next();
};

/**
 * Middleware ghi log audit (tùy chọn)
 */
const auditLog = (req, res, next) => {
  const userId = req.session.user?.userId || 'anonymous';
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;

  console.log(`[${timestamp}] ${method} ${path} - User: ${userId}`);
  next();
};

module.exports = {
  requireLogin,
  requireAdmin,
  requireStaff,
  auditLog
};
