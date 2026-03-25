const express = require('express');
const router = express.Router();
const controller = require('../controllers/productController');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: './public/uploads',
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

router.get('/', controller.index);
router.get('/create', controller.createForm);
router.post('/create', upload.single('image'), controller.create);

router.get('/edit/:id', controller.editForm);
router.post('/edit/:id', upload.single('image'), controller.update);

router.get('/delete/:id', controller.delete);
router.get('/detail/:id', controller.detail);

module.exports = router;