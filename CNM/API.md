# API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

---

## 🔐 Authentication Endpoints

### POST /api/auth/register
Đăng ký user mới

**Request:**
```json
{
  "username": "admin1",
  "password": "secure_password_123",
  "role": "admin"
}
```

**Response (201 Created):**
```json
{
  "message": "User created",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin1",
    "role": "admin"
  }
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "message": "Username already exists"
}

{
  "message": "Missing required fields"
}
```

---

### POST /api/auth/login
Đăng nhập

**Request:**
```json
{
  "username": "admin1",
  "password": "secure_password_123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin1",
    "role": "admin"
  }
}
```

**Side Effect:**
- Sets `session` cookie (httpOnly, secure)
- Cookie sent automatically with all subsequent requests

**Error Responses:**
```json
// 400 Bad Request
{
  "message": "Username and password required"
}

// 401 Unauthorized
{
  "message": "Invalid credentials"
}
```

---

### POST /api/auth/logout
Đăng xuất

**Request:**
```
No body required
```

**Response (200 OK):**
```json
{
  "message": "Logout successful"
}
```

**Side Effect:**
- Destroys session
- Clears session cookie

---

### GET /api/auth/me
Lấy thông tin user hiện tại

**Request:**
```
Headers: 
  Cookie: session=...
```

**Response (200 OK):**
```json
{
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin1",
    "role": "admin"
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "message": "Not authenticated"
}
```

---

## 📁 Category Endpoints

### GET /api/categories
Lấy tất cả danh mục (Public)

**Request:**
```
No parameters
```

**Response (200 OK):**
```json
{
  "categories": [
    {
      "categoryId": "cat-001",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "createdAt": "2024-01-29T10:00:00Z"
    },
    {
      "categoryId": "cat-002",
      "name": "Fashion",
      "description": "Clothing and accessories",
      "createdAt": "2024-01-29T11:00:00Z"
    }
  ]
}
```

---

### GET /api/categories/:id
Lấy danh mục theo ID (Public)

**Request:**
```
Path: /api/categories/cat-001
```

**Response (200 OK):**
```json
{
  "category": {
    "categoryId": "cat-001",
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "createdAt": "2024-01-29T10:00:00Z"
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "message": "Category not found"
}
```

---

### POST /api/categories
Tạo danh mục mới (Admin only)

**Request:**
```json
{
  "name": "Books",
  "description": "Books and ebooks"
}
```

**Response (201 Created):**
```json
{
  "message": "Category created",
  "category": {
    "categoryId": "cat-003",
    "name": "Books",
    "description": "Books and ebooks",
    "createdAt": "2024-01-29T12:00:00Z"
  }
}
```

**Authorization:**
- Requires: Admin role
- If staff: `403 Forbidden`
- If not logged in: `401 Unauthorized`

**Error Responses:**
```json
// 403 Forbidden
{
  "message": "Forbidden. Admin role required."
}

// 400 Bad Request
{
  "message": "Name and description are required"
}
```

---

### PUT /api/categories/:id
Cập nhật danh mục (Admin only)

**Request:**
```json
{
  "name": "Technology",
  "description": "Tech products and gadgets"
}
```

**Response (200 OK):**
```json
{
  "message": "Category updated",
  "category": {
    "categoryId": "cat-001",
    "name": "Technology",
    "description": "Tech products and gadgets",
    "createdAt": "2024-01-29T10:00:00Z",
    "updatedAt": "2024-01-29T14:30:00Z"
  }
}
```

---

### DELETE /api/categories/:id
Xóa danh mục (Admin only)

**Request:**
```
No body
```

**Response (200 OK):**
```json
{
  "message": "Category deleted successfully"
}
```

**Business Rule:**
- Nếu category có products → Error 400
- Phải xóa products trước khi xóa category

**Error Responses:**
```json
// 400 Bad Request
{
  "message": "Cannot delete category with active products"
}
```

---

## 🛍️ Product Endpoints

### GET /api/products
Lấy danh sách sản phẩm (Public) - Pagination

**Query Parameters:**
```
limit: number (default: 20, max: 100)
lastKey: string (Base64 encoded pagination key)
```

**Request:**
```
GET /api/products?limit=10
GET /api/products?limit=10&lastKey=eyJpZCI6eyJTIjoicHJvZC0xMjMifX0=
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "prod-001",
      "name": "MacBook Pro 14",
      "price": 1999.99,
      "quantity": 5,
      "categoryId": "cat-001",
      "categoryName": "Electronics",
      "url_image": "https://s3.../product.jpg",
      "isDeleted": false,
      "inventoryStatus": "Còn hàng",
      "isLowStock": false,
      "isOutOfStock": false,
      "createdAt": "2024-01-29T10:00:00Z"
    }
  ],
  "lastKey": "eyJpZCI6eyJTIjoicHJvZC0xMDEifX0="
}
```

**Inventory Status:**
- `"Còn hàng"`: quantity >= 5
- `"Sắp hết"`: 0 < quantity < 5
- `"Hết hàng"`: quantity === 0

---

### GET /api/products/:id
Lấy sản phẩm theo ID (Public)

**Request:**
```
GET /api/products/prod-001
```

**Response (200 OK):**
```json
{
  "product": {
    "id": "prod-001",
    "name": "MacBook Pro 14",
    "price": 1999.99,
    "quantity": 5,
    "categoryId": "cat-001",
    "categoryName": "Electronics",
    "url_image": "https://s3.../product.jpg",
    "isDeleted": false,
    "inventoryStatus": "Còn hàng",
    "createdAt": "2024-01-29T10:00:00Z"
  }
}
```

**Error Responses:**
```json
// 404 Not Found
{
  "message": "Product not found"
}
```

---

### GET /api/products/search
Tìm kiếm & Lọc sản phẩm (Public)

**Query Parameters:**
```
categoryId: string (UUID)
minPrice: number
maxPrice: number
name: string (contains search)
limit: number (default: 20)
lastKey: string (pagination)
```

**Request Examples:**
```
GET /api/products/search?categoryId=cat-001
GET /api/products/search?minPrice=100&maxPrice=500
GET /api/products/search?name=Laptop
GET /api/products/search?categoryId=cat-001&minPrice=100&maxPrice=500&name=Pro
```

**Response (200 OK):**
```json
{
  "items": [
    {
      "id": "prod-001",
      "name": "MacBook Pro 14",
      "price": 1999.99,
      "quantity": 5,
      "categoryName": "Electronics",
      "inventoryStatus": "Còn hàng",
      "createdAt": "2024-01-29T10:00:00Z"
    }
  ],
  "lastKey": "...",
  "count": 1,
  "scannedCount": 100,
  "note": "scannedCount > count có nghĩa Scan đã duyệt nhiều items và filter"
}
```

**⚠️ Performance Note:**
- `scannedCount`: Items examined by DynamoDB
- `count`: Items matched by filters
- If `scannedCount >> count`: Query is inefficient (expensive RCU)
- Recommend using more specific filters or indexes

---

### POST /api/products
Tạo sản phẩm mới (Admin only)

**Request:**
```json
{
  "name": "iPhone 15 Pro",
  "price": 999.99,
  "quantity": 10,
  "categoryId": "cat-001",
  "imageUrl": "https://s3.../iphone.jpg"
}
```

**Response (201 Created):**
```json
{
  "message": "Product created",
  "product": {
    "id": "prod-new",
    "name": "iPhone 15 Pro",
    "price": 999.99,
    "quantity": 10,
    "categoryId": "cat-001",
    "categoryName": "Electronics",
    "inventoryStatus": "Còn hàng",
    "isDeleted": false,
    "createdAt": "2024-01-29T15:00:00Z"
  }
}
```

**Side Effects:**
- Creates entry in ProductLogs (audit trail)
- Logs action: "CREATE"

**Validation:**
- `price >= 0`
- `quantity >= 0`
- `categoryId` must exist
- All fields required except `imageUrl`

**Error Responses:**
```json
// 403 Forbidden
{
  "message": "Forbidden. Admin role required."
}

// 400 Bad Request
{
  "message": "Missing required fields"
}

{
  "message": "Category not found"
}

{
  "message": "Price and quantity must be >= 0"
}
```

---

### PUT /api/products/:id
Cập nhật sản phẩm (Admin only)

**Request:**
```json
{
  "name": "iPhone 15 Pro Max",
  "price": 1099.99,
  "quantity": 8
}
```

**Response (200 OK):**
```json
{
  "message": "Product updated",
  "product": {
    "id": "prod-001",
    "name": "iPhone 15 Pro Max",
    "price": 1099.99,
    "quantity": 8,
    "categoryName": "Electronics",
    "inventoryStatus": "Còn hàng",
    "updatedAt": "2024-01-29T16:00:00Z"
  }
}
```

**Side Effects:**
- Creates entry in ProductLogs with action: "UPDATE"
- Stores `oldData` (before update values)

**Allowed fields to update:**
- `name`
- `price`
- `quantity`
- `categoryId`
- `url_image`

---

### DELETE /api/products/:id
Xóa sản phẩm - SOFT DELETE (Admin only)

**Request:**
```
No body
```

**Response (200 OK):**
```json
{
  "message": "Product deleted",
  "id": "prod-001"
}
```

**⚠️ Important - Soft Delete:**
- Sets `isDeleted = true` (NOT actually deleted from DB)
- Sets `deletedAt` timestamp
- Can be recovered if needed
- Audit trail preserved

**Side Effects:**
- Deletes image from S3 if exists
- Creates entry in ProductLogs with action: "DELETE"
- Stores old product data in `oldData`

**Product becomes invisible in:**
- GET /api/products
- GET /api/products/search
- All queries filter `isDeleted = false`

---

### GET /api/products/inventory/status
Lấy tổng hàng tồn kho (Public)

**Request:**
```
No parameters
```

**Response (200 OK):**
```json
{
  "total": 500,
  "lowStock": 15,
  "outOfStock": 3
}
```

**Definitions:**
- `total`: Tổng số lượng tất cả products
- `lowStock`: Số products có quantity < 5
- `outOfStock`: Số products có quantity = 0

---

## 📊 Response Format

### Success Response (2xx)
```json
{
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response (4xx, 5xx)
```json
{
  "message": "Error description",
  "statusCode": 400
}
```

---

## 🔐 Authorization Matrix

| Endpoint | Public | Staff | Admin | Note |
|----------|--------|-------|-------|------|
| GET /categories | ✅ | ✅ | ✅ | Read only |
| POST /categories | ❌ | ❌ | ✅ | Create category |
| PUT /categories | ❌ | ❌ | ✅ | Update category |
| DELETE /categories | ❌ | ❌ | ✅ | Delete category |
| GET /products | ✅ | ✅ | ✅ | List products |
| POST /products | ❌ | ❌ | ✅ | Create product |
| PUT /products | ❌ | ❌ | ✅ | Update product |
| DELETE /products | ❌ | ❌ | ✅ | Soft delete |

---

## 📡 HTTP Methods & Status Codes

### Methods Used
- **GET**: Retrieve data (safe, idempotent)
- **POST**: Create data (201 Created)
- **PUT**: Update data (200 OK)
- **DELETE**: Delete data (200 OK)

### Status Codes
- **200 OK**: Successful request
- **201 Created**: Resource created
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: No permission
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

---

## 🔄 Pagination

### Using lastKey
```
1st request:
GET /api/products?limit=10
Response:
{
  items: [10 items],
  lastKey: "encoded_key_123"
}

2nd request:
GET /api/products?limit=10&lastKey=encoded_key_123
Response:
{
  items: [next 10 items],
  lastKey: "encoded_key_456"
}

3rd request:
GET /api/products?limit=10&lastKey=encoded_key_456
Response:
{
  items: [last items],
  lastKey: null  // No more data
}
```

---

## 🧪 Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin1","password":"password123"}' \
  -c cookies.txt
```

### Get Categories
```bash
curl http://localhost:3000/api/categories \
  -b cookies.txt
```

### Search Products
```bash
curl "http://localhost:3000/api/products/search?categoryId=cat-1&minPrice=100&maxPrice=500" \
  -b cookies.txt
```

### Create Product
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name":"New Product",
    "price":99.99,
    "quantity":5,
    "categoryId":"cat-1"
  }' \
  -b cookies.txt
```

---

## Rate Limiting
Currently: None (implement in production)

Recommended:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```
