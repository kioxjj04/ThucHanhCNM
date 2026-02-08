const ProductModel = require('../models/product.model');

class ProductController {
    // Hiển thị danh sách sản phẩm
    static async index(req, res) {
        try {
            const products = await ProductModel.getAll();
            // Sắp xếp theo thời gian tạo (mới nhất trước)
            products.sort((a, b) => {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });
            res.render('products/index', { products, user: req.session.user });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }

    // Hiển thị form thêm sản phẩm
    static showAddForm(req, res) {
        res.render('products/add', { user: req.session.user });
    }

    // Xử lý thêm sản phẩm
    static async create(req, res) {
        try {
            const { name, price, url_image } = req.body;
            await ProductModel.create(name, price, url_image || '');
            res.redirect('/products');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }

    // Hiển thị form sửa sản phẩm
    static async showEditForm(req, res) {
        try {
            const product = await ProductModel.getById(req.params.id);
            if (!product) {
                return res.status(404).send('Product not found');
            }
            res.render('products/edit', { product, user: req.session.user });
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }

    // Xử lý cập nhật sản phẩm
    static async update(req, res) {
        try {
            const { name, price, url_image } = req.body;
            await ProductModel.update(req.params.id, name, price, url_image || '');
            res.redirect('/products');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }

    // Xử lý xóa sản phẩm
    static async delete(req, res) {
        try {
            await ProductModel.delete(req.params.id);
            res.redirect('/products');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server Error');
        }
    }
}

module.exports = ProductController;
