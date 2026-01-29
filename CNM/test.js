// test.js - Unit Tests (dùng Jest)

const AuthService = require('./services/AuthService');
const CategoryService = require('./services/CategoryService');
const ProductService = require('./services/ProductService');
const UserRepository = require('./repositories/UserRepository');
const CategoryRepository = require('./repositories/CategoryRepository');
const ProductRepository = require('./repositories/ProductRepository');

// Mock DynamoDB để test không cần AWS
jest.mock('./config/aws');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
  });

  test('Should register new user', async () => {
    const user = await authService.register('testuser', 'password123', 'staff');
    
    expect(user).toHaveProperty('userId');
    expect(user.username).toBe('testuser');
    expect(user.role).toBe('staff');
  });

  test('Should throw error if user already exists', async () => {
    await authService.register('testuser', 'password123');
    
    await expect(
      authService.register('testuser', 'password456')
    ).rejects.toThrow('Username already exists');
  });

  test('Should login with correct credentials', async () => {
    await authService.register('testuser', 'password123', 'admin');
    const user = await authService.login('testuser', 'password123');
    
    expect(user).toHaveProperty('userId');
    expect(user.role).toBe('admin');
  });

  test('Should fail login with wrong password', async () => {
    await authService.register('testuser', 'password123');
    
    await expect(
      authService.login('testuser', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });
});

describe('CategoryService', () => {
  let categoryService;

  beforeEach(() => {
    categoryService = new CategoryService();
  });

  test('Should create new category', async () => {
    const category = await categoryService.createCategory(
      'Electronics',
      'Electronic devices'
    );
    
    expect(category).toHaveProperty('categoryId');
    expect(category.name).toBe('Electronics');
  });

  test('Should get all categories', async () => {
    await categoryService.createCategory('Cat1', 'Description 1');
    await categoryService.createCategory('Cat2', 'Description 2');
    
    const categories = await categoryService.getAllCategories();
    
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThanOrEqual(2);
  });

  test('Should update category', async () => {
    const created = await categoryService.createCategory('OldName', 'Desc');
    const updated = await categoryService.updateCategory(
      created.categoryId,
      'NewName',
      'New Desc'
    );
    
    expect(updated.name).toBe('NewName');
  });

  test('Should throw error on invalid input', async () => {
    await expect(
      categoryService.createCategory('', 'Description')
    ).rejects.toThrow('Name and description are required');
  });
});

describe('ProductService', () => {
  let productService;
  let testCategoryId;

  beforeEach(async () => {
    productService = new ProductService();
    // Create a test category
    const category = await productService.categoryRepo.createCategory(
      'Test Category',
      'Test'
    );
    testCategoryId = category.categoryId;
  });

  test('Should create new product', async () => {
    const product = await productService.createProduct(
      'Laptop',
      999.99,
      10,
      testCategoryId
    );
    
    expect(product).toHaveProperty('id');
    expect(product.name).toBe('Laptop');
    expect(product.price).toBe(999.99);
  });

  test('Should validate price >= 0', async () => {
    await expect(
      productService.createProduct('Product', -100, 5, testCategoryId)
    ).rejects.toThrow('Price and quantity must be >= 0');
  });

  test('Should check category exists', async () => {
    await expect(
      productService.createProduct('Product', 100, 5, 'non-existent-cat')
    ).rejects.toThrow('Category not found');
  });

  test('Should get product by ID', async () => {
    const created = await productService.createProduct(
      'Test Product',
      99.99,
      5,
      testCategoryId
    );
    
    const product = await productService.getProductById(created.id);
    
    expect(product.name).toBe('Test Product');
  });

  test('Should update product', async () => {
    const created = await productService.createProduct(
      'Old Name',
      100,
      10,
      testCategoryId
    );
    
    const updated = await productService.updateProduct(created.id, {
      name: 'New Name',
      price: 150
    });
    
    expect(updated.name).toBe('New Name');
    expect(updated.price).toBe(150);
  });

  test('Should soft delete product', async () => {
    const created = await productService.createProduct(
      'To Delete',
      100,
      5,
      testCategoryId
    );
    
    await productService.deleteProduct(created.id);
    
    await expect(
      productService.getProductById(created.id)
    ).rejects.toThrow('Product not found');
  });

  test('Should search products by category', async () => {
    const created = await productService.createProduct(
      'Search Test',
      99.99,
      5,
      testCategoryId
    );
    
    const results = await productService.searchProducts({
      categoryId: testCategoryId
    });
    
    expect(results.items.length).toBeGreaterThan(0);
  });

  test('Should filter products by price range', async () => {
    await productService.createProduct('Cheap', 50, 5, testCategoryId);
    await productService.createProduct('Expensive', 500, 5, testCategoryId);
    
    const results = await productService.searchProducts({
      minPrice: 100,
      maxPrice: 400
    });
    
    results.items.forEach(item => {
      expect(item.price).toBeGreaterThanOrEqual(100);
      expect(item.price).toBeLessThanOrEqual(400);
    });
  });

  test('Should return inventory status', () => {
    expect(productService.productRepo.getInventoryStatus(0)).toBe('Hết hàng');
    expect(productService.productRepo.getInventoryStatus(3)).toBe('Sắp hết');
    expect(productService.productRepo.getInventoryStatus(10)).toBe('Còn hàng');
  });
});

describe('DynamoDB Concepts', () => {
  test('Should understand Soft Delete pattern', () => {
    // Soft Delete: Set isDeleted = true instead of DELETE
    // Advantages:
    // 1. Recovery is easy
    // 2. Audit trail preserved
    // 3. Relationships intact
    
    const product = {
      id: '123',
      name: 'Product',
      isDeleted: false  // Initially not deleted
    };
    
    // Delete
    product.isDeleted = true;
    
    // Queries should filter: isDeleted = false
    const active = product.isDeleted === false;
    expect(active).toBe(false);
  });

  test('Should understand Query vs Scan', () => {
    const operationComparison = {
      'Query': {
        uses: 'Partition Key or GSI',
        cost: 'Low RCU',
        speed: 'Fast',
        example: 'Get products by categoryId'
      },
      'Scan': {
        uses: 'Filter any attribute',
        cost: 'High RCU',
        speed: 'Slow',
        example: 'Search by product name'
      }
    };
    
    // Query is preferred for this e-commerce app
    expect(operationComparison.Query.cost).toBe('Low RCU');
  });

  test('Should understand DynamoDB indexes', () => {
    const indexes = {
      'Partition Key': {
        role: 'Primary identifier',
        required: true,
        example: 'userId, productId'
      },
      'GSI (Global Secondary Index)': {
        role: 'Alternative access pattern',
        required: false,
        example: 'UsernameIndex to query by username'
      }
    };
    
    expect(indexes['GSI (Global Secondary Index)'].role).toContain('Alternative');
  });
});

// Run tests: npm test
