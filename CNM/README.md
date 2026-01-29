# Mini E-Commerce System - DynamoDB

Một hệ thống mini e-commerce được xây dựng bằng **Node.js**, **Express**, và **AWS DynamoDB** với các tính năng quản lý sản phẩm, danh mục, và xác thực người dùng.

## 🎯 Tính năng chính

✅ **Authentication & Authorization**
- Đăng nhập/đăng ký với password hash (bcrypt)
- Session-based authentication
- Phân quyền: admin (CRUD tất cả) vs staff (chỉ xem)

✅ **Product Management**
- CRUD sản phẩm với soft delete
- Theo dõi tồn kho (còn hàng / sắp hết / hết hàng)
- Upload ảnh lên S3
- Ghi log tất cả thay đổi (audit trail)

✅ **Category Management**
- CRUD danh mục
- Phân loại sản phẩm
- Business rule: Không xóa category nếu có sản phẩm

✅ **Advanced Search & Filter**
- Tìm theo tên (contains)
- Lọc theo danh mục
- Lọc theo khoảng giá
- Pagination

✅ **DynamoDB Integration**
- Serverless database
- Auto-scaling
- GSI (Global Secondary Indexes) cho efficient queries
- Soft delete pattern

✅ **AWS Cloud Ready**
- S3 cho image storage
- IAM Role (không hard-code credentials)
- EC2 deployment ready

## 📁 Project Structure

```
ecommerce-dynamodb/
├── config/
│   └── aws.js                    # AWS SDK configuration
├── repositories/
│   ├── UserRepository.js         # User data access
│   ├── CategoryRepository.js      # Category data access
│   └── ProductRepository.js       # Product data access + logging
├── services/
│   ├── AuthService.js            # Authentication logic
│   ├── CategoryService.js         # Category business logic
│   └── ProductService.js          # Product business logic
├── routes/
│   ├── auth.js                   # /api/auth endpoints
│   ├── categories.js             # /api/categories endpoints
│   └── products.js               # /api/products endpoints
├── middlewares/
│   └── auth.js                   # Authentication middlewares
├── views/
│   ├── index.ejs                 # Home page
│   ├── login.ejs                 # Login page
│   └── products.ejs              # Products page
├── app.js                        # Express app setup
├── package.json                  # Dependencies
├── .env                          # Environment variables
├── REPORT.md                     # Detailed documentation
└── DYNAMODB_SETUP.md            # DynamoDB setup guide
```

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │ (Browser)
│ (Frontend)  │
└──────┬──────┘
       │ HTTP/REST
       │
┌──────▼──────────────────────────────┐
│      Express Server (Node.js)        │
├──────────────────────────────────────┤
│ Routes                               │
│ └─ /api/auth                         │
│ └─ /api/categories                   │
│ └─ /api/products                     │
├──────────────────────────────────────┤
│ Controllers (Routes)                 │
│ └─ Receive requests                  │
├──────────────────────────────────────┤
│ Services (Business Logic)            │
│ └─ Validate, process data            │
├──────────────────────────────────────┤
│ Repositories (Data Access)           │
│ └─ Interact with DynamoDB            │
└──────┬──────────────────────────────┘
       │ AWS SDK
       │
┌──────▼──────────────────────────────┐
│      AWS Services                   │
├──────────────────────────────────────┤
│ DynamoDB (NoSQL Database)            │
│ ├─ Users table                       │
│ ├─ Categories table                  │
│ ├─ Products table                    │
│ └─ ProductLogs table (Audit)         │
├──────────────────────────────────────┤
│ S3 (Image Storage)                   │
│ └─ product images                    │
├──────────────────────────────────────┤
│ IAM Role (Credentials)               │
│ └─ Secure access (no hardcode)       │
└──────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- AWS Account
- AWS CLI configured
- DynamoDB tables created

### Installation

```bash
# 1. Clone repository
git clone <repo>
cd ecommerce-dynamodb

# 2. Install dependencies
npm install

# 3. Setup environment variables
cp .env.example .env
# Edit .env with your AWS details

# 4. Create DynamoDB tables
# See DYNAMODB_SETUP.md for commands

# 5. Start server
npm start
# Server runs on http://localhost:3000
```

### Development

```bash
# Install nodemon for auto-reload
npm install --save-dev nodemon

# Run in development mode
npm run dev
```

## 📡 API Documentation

### Authentication

```bash
# Register (admin only)
POST /api/auth/register
{
  "username": "admin1",
  "password": "password123",
  "role": "admin"
}

# Login
POST /api/auth/login
{
  "username": "admin1",
  "password": "password123"
}
→ Sets session cookie

# Logout
POST /api/auth/logout

# Get current user
GET /api/auth/me
```

### Categories (Public read, Admin write)

```bash
# Get all categories
GET /api/categories

# Get category by ID
GET /api/categories/:id

# Create category (admin)
POST /api/categories
{
  "name": "Electronics",
  "description": "Electronic devices"
}

# Update category (admin)
PUT /api/categories/:id
{
  "name": "Tech",
  "description": "..."
}

# Delete category (admin)
DELETE /api/categories/:id
# ⚠️ Cannot delete if has products
```

### Products (Public read, Admin write)

```bash
# Get all products
GET /api/products?limit=20&lastKey=...

# Get product by ID
GET /api/products/:id

# Search/Filter products
GET /api/products/search
  ?categoryId=cat-1
  &minPrice=100
  &maxPrice=500
  &name=Laptop
  &limit=20
  &lastKey=...

# Create product (admin)
POST /api/products
{
  "name": "MacBook Pro",
  "price": 1999.99,
  "quantity": 5,
  "categoryId": "cat-1",
  "imageUrl": "https://s3.../image.jpg"
}

# Update product (admin)
PUT /api/products/:id
{
  "name": "MacBook Pro M2",
  "price": 2299.99,
  "quantity": 3
}

# Delete product (admin) - soft delete
DELETE /api/products/:id

# Get inventory status
GET /api/products/inventory/status
→ {total: 100, lowStock: 5, outOfStock: 2}
```

## 🗄️ Database Design

### Tables Overview

| Table | PK | GSI | Soft Delete |
|-------|----|----|-----------|
| Users | userId | UsernameIndex | No |
| Categories | categoryId | - | No |
| Products | id | CategoryIdIndex | Yes (isDeleted) |
| ProductLogs | logId | ProductIdIndex | No |

**Key Points:**
- ✅ No JOINs - Denormalized (e.g., categoryName in Products)
- ✅ Soft Delete - isDeleted flag instead of actual delete
- ✅ Audit Trail - ProductLogs table for compliance
- ✅ GSI for efficient queries

## ⚠️ DynamoDB Concepts

### Query vs Scan

**Query** (Efficient ✅)
```
Use: Partition Key or GSI
Cost: Low RCU
Speed: Fast
Example: Get all products in "Electronics" category
```

**Scan** (Expensive ❌)
```
Use: Flexible filters
Cost: High RCU (scans all items)
Speed: Slow with large data
Example: Search products by name (contains)
```

### Soft Delete Pattern

```javascript
// Instead of:
DELETE FROM products WHERE id = '123'

// Do:
UPDATE products SET isDeleted = true WHERE id = '123'

// Benefits:
// - Easy recovery
// - Audit trail preserved
// - Relationships intact
```

## 🔐 Security

### Password Hashing
- Using **bcryptjs**
- 10 salt rounds
- Stored hash, never plain text

### Authentication
- Express sessions
- Cookie-based (httpOnly, secure)
- Session secret in .env

### AWS Credentials
- ✅ Use **IAM Role** on EC2 (not hard-code)
- ❌ Never commit AWS keys to git

### HTTPS
- Use in production
- Set `secure: true` in session config

## 📊 Sample Data

See `DYNAMODB_SETUP.md` for sample INSERT commands.

## 🐛 Troubleshooting

### "Cannot get users - DynamoDB error"
- Check AWS credentials / IAM role
- Verify table names in .env
- Ensure DynamoDB tables exist

### "Scan returned 0 items"
- Check filter expression syntax
- Verify attributes exist
- Check isDeleted = false filter

### "Item size exceeds 400 KB"
- Store large objects on S3
- Only store S3 URL in DynamoDB

## 📚 Documentation

- [REPORT.md](./REPORT.md) - Detailed analysis + DynamoDB vs MySQL comparison
- [DYNAMODB_SETUP.md](./DYNAMODB_SETUP.md) - Table creation + queries
- [AWS DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)

## 📝 Learning Points

This project demonstrates:
1. ✅ Layered architecture (Controllers → Services → Repositories)
2. ✅ NoSQL database design patterns
3. ✅ Authentication & authorization
4. ✅ Soft delete & audit logging
5. ✅ AWS integration (DynamoDB, S3, IAM)
6. ✅ REST API design
7. ✅ Frontend integration

## 🎓 For Students

**Key Takeaways:**
- DynamoDB is serverless but requires different mindset than SQL
- Denormalization is necessary (accepts some redundancy)
- Query by PK/GSI (efficient) vs Scan (expensive)
- Audit logs are important for business

**Assignments:**
1. Add pagination to all list endpoints
2. Implement image upload to S3
3. Add rate limiting to API
4. Create admin dashboard
5. Implement user reviews for products

## 📄 License

MIT License - Free for educational use

## 👨‍💻 Author

Created for educational purposes (2024)

---

**Ready to deploy?** See deployment guide in DYNAMODB_SETUP.md
