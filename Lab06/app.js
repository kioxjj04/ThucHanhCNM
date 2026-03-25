const express = require('express');
const app = express();
const methodOverride = require('method-override');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(methodOverride('_method'));

const productRoutes = require('./routes/productRoutes');
app.use('/', productRoutes);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});