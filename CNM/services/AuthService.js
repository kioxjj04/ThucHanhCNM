const UserRepository = require('../repositories/UserRepository');

class AuthService {
  constructor() {
    this.userRepo = new UserRepository();
  }

  /**
   * Đăng ký user mới
   */
  async register(username, password, role = 'staff') {
    // Kiểm tra user đã tồn tại
    const existingUser = await this.userRepo.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    const user = await this.userRepo.createUser(username, password, role);
    return {
      userId: user.userId,
      username: user.username,
      role: user.role
    };
  }

  /**
   * Đăng nhập
   */
  async login(username, password) {
    const user = await this.userRepo.getUserByUsername(username);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this.userRepo.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    return {
      userId: user.userId,
      username: user.username,
      role: user.role
    };
  }

  /**
   * Lấy thông tin user
   */
  async getUserInfo(userId) {
    const user = await this.userRepo.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.userId,
      username: user.username,
      role: user.role
    };
  }
}

module.exports = AuthService;
