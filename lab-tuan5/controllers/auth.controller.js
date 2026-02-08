const UserModel = require('../models/user.model');

class AuthController {
    // Hiển thị trang login
    static showLogin(req, res) {
        if (req.session.user) {
            return res.redirect('/products');
        }
        res.render('auth/login', { error: null });
    }

    // Xử lý login
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await UserModel.findByUsername(username);

            // Kiểm tra đơn giản (trong thực tế nên hash password)
            if (user && user.password === password) {
                req.session.user = {
                    username: user.username
                };
                return res.redirect('/products');
            }

            res.render('auth/login', { error: 'Sai tên đăng nhập hoặc mật khẩu!' });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }

    // Xử lý logout
    static logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error(err);
            }
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;
