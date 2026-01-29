# Mini E-Commerce System - DynamoDB Implementation Report

## 📋 Mục lục
1. [Sơ đồ quan hệ bảng DynamoDB](#sơ-đồ-quan-hệ-bảng-dynamodb)
2. [Luồng xử lý chính](#luồng-xử-lý-chính)
3. [So sánh DynamoDB vs MySQL](#so-sánh-dynamodb-vs-mysql)
4. [Nhận xét ưu/nhược điểm mô hình NoSQL](#nhận-xét-ưunhược-điểm-mô-hình-nosql)
5. [Hướng dẫn triển khai](#hướng-dẫn-triển-khai)

---

## 1. Sơ đồ quan hệ bảng DynamoDB

### 1.1 Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│     Users       │
├─────────────────┤
│ userId (PK)     │ ◄─────────┐
│ username        │           │
│ password (hash) │           │
│ role            │           │
│ createdAt       │           │
└─────────────────┘           │
                              │ (Many-to-One)
                              │
                    ┌─────────┴──────────┐
                    │                    │
         ┌──────────▼──────────┐  ┌──────▼─────────────┐
         │   ProductLogs       │  │   Categories       │
         ├─────────────────────┤  ├────────────────────┤
         │ logId (PK)          │  │ categoryId (PK)    │
         │ productId (FK)      │  │ name               │
         │ action (CREATE/     │  │ description        │
         │  UPDATE/DELETE)     │  │ createdAt          │
         │ userId (FK)         │  └────────┬───────────┘
         │ oldData (JSON)      │           │
         │ time                │           │ (One-to-Many)
         └─────────────────────┘           │
                    ▲                      │
                    │                      │
                    └──────────────────────┤
                     (One-to-Many)         │
                                           │
                        ┌──────────────────▼──────────┐
                        │      Products               │
                        ├─────────────────────────────┤
                        │ id (PK)                     │
                        │ name                        │
                        │ price                       │
                        │ quantity                    │
                        │ categoryId (FK)             │
                        │ url_image (S3 URL)          │
                        │ isDeleted (boolean)         │
                        │ createdAt                   │
                        │ updatedAt                   │
                        │ deletedAt                   │
                        └─────────────────────────────┘
```

### 1.2 Chi tiết từng bảng

#### **Users Table**
```
Partition Key: userId (String UUID)
Sort Key: Không có (Simple PK)

Global Secondary Indexes (GSI):
- UsernameIndex:
  - PK: username
  - Sort Key: Không có
  - Projection: All

Attributes:
- userId: String (UUID)
- username: String
- password: String (bcrypt hash)
- role: String ("admin" | "staff")
- createdAt: String (ISO 8601)
```

**Tại sao cấu trúc này:**
- `username` cần GSI vì đôi khi ta tìm theo username chứ không phải userId
- `role` quyết định quyền hạn CRUD trên sản phẩm

---

#### **Categories Table**
```
Partition Key: categoryId (String UUID)
Sort Key: Không có

Attributes:
- categoryId: String (UUID)
- name: String
- description: String
- createdAt: String (ISO 8601)
- updatedAt: String (ISO 8601) - tùy chọn
```

**Lưu ý Business Rule:**
- Khi xóa category: Phải kiểm tra xem có product nào liên kết
- Nếu có product: Không cho xóa hoặc soft delete category
- Không xóa products khi xóa category

---

#### **Products Table**
```
Partition Key: id (String UUID)
Sort Key: Không có

Global Secondary Indexes (GSI):
1. CategoryIdIndex:
   - PK: categoryId
   - Sort Key: createdAt (tùy chọn)
   - Projection: All
   
2. PriceIndex (tùy chọn):
   - PK: categoryId
   - Sort Key: price
   - Projection: All

Attributes:
- id: String (UUID) - Partition Key
- name: String
- price: Number (float)
- quantity: Number (integer)
- categoryId: String (FK to Categories)
- url_image: String (S3 URL, nullable)
- isDeleted: Boolean (soft delete flag)
- createdAt: String (ISO 8601)
- updatedAt: String (ISO 8601)
- deletedAt: String (ISO 8601, nullable)
```

**Soft Delete Pattern:**
- Thay vì xóa khỏi DB, đánh dấu `isDeleted = true`
- Lợi ích:
  - Dễ phục hồi dữ liệu
  - Giữ audit trail hoàn chỉnh
  - Giữ relationships nguyên vẹn
- Tất cả queries phải filter `isDeleted = false`

---

#### **ProductLogs Table**
```
Partition Key: logId (String UUID)
Sort Key: time (String ISO 8601) - tùy chọn

Global Secondary Indexes (GSI):
- ProductIdIndex:
  - PK: productId
  - Sort Key: time
  - Projection: All

Attributes:
- logId: String (UUID)
- productId: String (FK to Products)
- action: String ("CREATE" | "UPDATE" | "DELETE")
- userId: String (FK to Users)
- time: String (ISO 8601)
- oldData: Map/JSON (giá trị cũ trước khi update)
```

**Audit Logging:**
- Ghi log mọi thay đổi: CREATE, UPDATE, DELETE
- Lưu `oldData` để có thể restore
- Dùng để audit, compliance, troubleshooting

---

## 2. Luồng xử lý chính

### 2.1 Luồng Đăng nhập

```
Client (Frontend)
  │
  ├─► POST /api/auth/login
  │   {username, password}
  │
  └─────────────────────────────────────────────────────┐
                                                         │
  Server (Backend)                                      │
  │                                                     │
  ├─► AuthService.login(username, password)            │
  │   │                                                 │
  │   └─► UserRepository.getUserByUsername(username)   │
  │       └─► DynamoDB Query on UsernameIndex          │
  │           └─► user found?                          │
  │               │                                     │
  │               ├─ YES ─► bcrypt.compare(password)   │
  │               │         │                           │
  │               │         ├─ MATCH ─► Generate       │
  │               │         │            session       │
  │               │         │                           │
  │               │         └─ NO MATCH ─► Error       │
  │               │                                     │
  │               └─ NO ─► User not found error        │
  │                                                     │
  ├─► Save session in Express Session Store             │
  │   (Memory / Redis / DynamoDB Sessions)              │
  │                                                     │
  └─ Response: {user: {userId, username, role}}        │
                                                        │
                                                   Client
                                                   Gets: session cookie
```

### 2.2 Luồng Thêm Sản phẩm

```
Client (Admin)
  │
  ├─ POST /api/products
  │ {name, price, quantity, categoryId, imageUrl}
  │
  └─────────────────────────────────────────────────────┐
                                                         │
  Server                                                 │
  │                                                      │
  ├─ Middleware: requireAdmin                           │
  │ └─► Check session.user.role === "admin"             │
  │                                                      │
  ├─ ProductService.createProduct()                     │
  │ ├─► Validate input                                  │
  │ ├─► CategoryRepository.getCategoryById(categoryId)  │
  │ │   └─► DynamoDB GetItem (Category)                 │
  │ │       └─ Category exists?                         │
  │ │           ├─ YES ──────────────┐                  │
  │ │           └─ NO ───► ERROR ────┤                  │
  │ │                                 │                  │
  │ └─ ProductRepository.createProduct()                │
  │    ├─► Generate id = UUID                           │
  │    ├─► Put item to DynamoDB                         │
  │    │   └─ PutItem to Products table                 │
  │    │       {id, name, price, categoryId, ...}       │
  │    │       isDeleted: false                         │
  │    │       createdAt: ISO_NOW                       │
  │    │                                                │
  │    └─► ProductRepository.logProductAction()         │
  │        └─ PutItem to ProductLogs table              │
  │            {logId, productId, action: "CREATE",     │
  │             userId, time}                           │
  │                                                      │
  └─ Response: {message, product}                      │
                                                        │
                                                   Client
                                              Success message
```

### 2.3 Luồng Tìm kiếm & Lọc Sản phẩm

```
Client
  │
  ├─ GET /api/products/search
  │ ?categoryId=xxx&minPrice=100&maxPrice=500
  │ &name=Laptop&limit=20
  │
  └─────────────────────────────────────────────────────┐
                                                         │
  Server                                                 │
  │                                                      │
  ├─ ProductService.searchProducts(criteria)            │
  │                                                      │
  ├─ ProductRepository.searchProducts()                 │
  │ ├─ Build DynamoDB Scan parameters                   │
  │ ├─ FilterExpression:                                │
  │ │  isDeleted = false                                │
  │ │  AND categoryId = :categoryId (if provided)       │
  │ │  AND price BETWEEN :minPrice AND :maxPrice        │
  │ │  AND contains(#name, :name) (if provided)         │
  │ │                                                    │
  │ ├─ Execute Scan                                     │
  │ │ └─ Scan entire Products table                     │
  │ │    └─ Apply filter expressions                    │
  │ │    └─ Return items + LastEvaluatedKey             │
  │ │                                                    │
  │ └─ Return {items, lastKey, count, scannedCount}     │
  │    - scannedCount: số items Scan đã duyệt           │
  │    - count: số items match filter                   │
  │    - Nếu scannedCount >> count: Scan tốn RCU       │
  │                                                      │
  └─ Response: {items: [...], lastKey, count, ...}    │
                                                        │
                                                   Client
                                            Display products
```

**⚠️ Quan trọng: Query vs Scan**

**Query:**
```
Ưu điểm:
- Chỉ đọc items cần thiết
- Hiệu quả, tốn ít RCU
- Nhanh

Nhược điểm:
- Chỉ dùng cho PK hoặc GSI
- Không thể tìm kiếm free-text

Ví dụ:
  Query CategoryIdIndex với categoryId = "cat-123"
  └─ Chỉ lấy items của category này
```

**Scan:**
```
Ưu điểm:
- Có thể filter bất kỳ attribute nào
- Linh hoạt hơn

Nhược điểm:
- Duyệt tất cả items
- Tốn nhiều RCU (capacity units)
- Chậm với dữ liệu lớn
- Costly!

Ví dụ:
  Scan + contains(name, "Laptop")
  └─ Phải duyệt tất cả items, filter name
```

---

## 3. So sánh DynamoDB vs MySQL

### 3.1 Bảng so sánh

| Tiêu chí | DynamoDB (NoSQL) | MySQL (SQL) |
|----------|------------------|------------|
| **Mô hình dữ liệu** | Document/Key-Value | Relational |
| **Schema** | Flexible (schemaless) | Rigid (predefined) |
| **Scaling** | Auto-scaling, Horizontal | Vertical primarily |
| **Join** | Không hỗ trợ JOIN | Hỗ trợ tốt |
| **Consistency** | Eventually consistent (default) | ACID transactions |
| **Query** | Dùng PK, GSI, Scan | SQL queries |
| **Full-text Search** | Không (cần Elasticsearch) | Có LIKE, FULLTEXT |
| **Pricing** | On-demand hoặc Provisioned | Per instance |
| **Relationship** | Denormalization | Foreign keys |

### 3.2 Cụ thể cho bài toán mini e-commerce

#### **Nếu dùng MySQL:**
```sql
-- Users table
CREATE TABLE Users (
  userId VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'staff'),
  createdAt TIMESTAMP
);

-- Categories table
CREATE TABLE Categories (
  categoryId VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200),
  description TEXT,
  createdAt TIMESTAMP
);

-- Products table
CREATE TABLE Products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(200),
  price DECIMAL(10,2),
  quantity INT,
  categoryId VARCHAR(36),
  url_image VARCHAR(500),
  isDeleted BOOLEAN,
  createdAt TIMESTAMP,
  FOREIGN KEY (categoryId) REFERENCES Categories(categoryId)
);

-- Lấy product với category name (JOIN)
SELECT p.*, c.name as categoryName 
FROM Products p
JOIN Categories c ON p.categoryId = c.categoryId
WHERE p.isDeleted = false;

-- Tìm kiếm (efficient)
SELECT * FROM Products 
WHERE name LIKE '%Laptop%' 
  AND price BETWEEN 100 AND 500
  AND categoryId = 'cat-1'
LIMIT 20;
```

**Ưu điểm:**
- Dễ JOIN giữa tables
- LIKE query hiệu quả
- ACID transactions
- Backup/Restore dễ

**Nhược điểm:**
- Khó scale horizontally
- Cần quản lý server
- Schema rigid, thay đổi khó

---

#### **Nếu dùng DynamoDB:**
```javascript
// Không hỗ trợ JOIN - phải denormalize

// Lấy product
const product = await dynamodb.get({
  TableName: 'Products',
  Key: { id: 'prod-123' }
});
// product = {id, name, categoryId, ...}

// Phải query riêng để lấy category name
const category = await dynamodb.get({
  TableName: 'Categories',
  Key: { categoryId: product.categoryId }
});

// Hoặc denormalize: lưu categoryName trực tiếp
// Products item:
{
  id: 'prod-123',
  name: 'Laptop',
  categoryId: 'cat-1',
  categoryName: 'Electronics', // Redundant nhưng không JOIN
  ...
}

// Tìm kiếm (không efficient)
const result = await dynamodb.scan({
  TableName: 'Products',
  FilterExpression: 'isDeleted = :deleted AND contains(#name, :name) AND price BETWEEN :min AND :max',
  ExpressionAttributeNames: {'#name': 'name'},
  ExpressionAttributeValues: {
    ':deleted': false,
    ':name': 'Laptop',
    ':min': 100,
    ':max': 500
  },
  Limit: 20
});
// ⚠️ Duyệt toàn bộ table, tốn RCU!
```

**Ưu điểm:**
- Không quản lý server (Serverless)
- Scale tự động
- Tốc độ cao (nếu dùng đúng PK)
- Flexible schema

**Nhược điểm:**
- Phải denormalize (data redundant)
- Không JOIN (fetch multiple)
- Scan tốn RCU
- Limited query options

---

### 3.3 Khi nào dùng cái nào?

**Chọn MySQL nếu:**
- Dữ liệu relational phức tạp
- Cần ACID transactions
- Budget hạn chế (open source)
- Team quen SQL

**Chọn DynamoDB nếu:**
- Cần serverless
- Read/write traffic không dự đoán
- Scale cần linh hoạt
- Không cần complex joins
- Budget cho AWS

---

## 4. Nhận xét ưu/nhược điểm mô hình NoSQL

### 4.1 Ưu điểm

#### ✅ **Scalability (Khả năng mở rộng)**
```
MySQL: Vertical scaling
  Server A (100GB) ──► Upgrade Server B (200GB)
  Chi phí cao, có downtime

DynamoDB: Horizontal scaling
  Server A | Server B | Server C | Server D
  Tự động chia sẻ dữ liệu (Sharding tự động)
  Không downtime
```

#### ✅ **Flexibility (Tính linh hoạt)**
- Thêm attribute mới không cần migration
- Mỗi item có thể schema khác nhau
- Cập nhật dễ dàng

```javascript
// Có thể thêm field mới bất kỳ lúc nào
await dynamodb.put({
  Item: {
    id: '123',
    name: 'Product A',
    customField: 'value', // Field mới
    metaData: {...}        // Nested object
  }
});
```

#### ✅ **Performance (Hiệu suất)**
- Query nhanh (millisecond)
- Auto cache
- Optimized cho key-value access

#### ✅ **Cost (Chi phí)**
- Serverless = không pay server idle
- Pay per request model
- Giảm operational overhead

### 4.2 Nhược điểm

#### ❌ **Denormalization (Lặp lại dữ liệu)**
```
// Khi update category name, phải update:
// 1. Categories table
// 2. Tất cả Products của category đó
// Nếu quên: Data inconsistency

Products items trước:
{id: 1, categoryName: 'Electronics'}
{id: 2, categoryName: 'Electronics'}

Update Categories: Electronics → Tech Gadgets

Products items sau (nếu update):
{id: 1, categoryName: 'Tech Gadgets'} ✓
{id: 2, categoryName: 'Electronics'}  ✗ Stale!
```

#### ❌ **Lack of JOINs (Không JOIN)**
```
// MySQL: 1 query
SELECT p.*, c.name FROM Products p
JOIN Categories c ON p.categoryId = c.categoryId;

// DynamoDB: 2 queries
1. Get products
2. Loop through each product, get category
// N+1 query problem!
```

#### ❌ **Limited Query Flexibility**
```
// MySQL: Có thể query bất kỳ field
SELECT * FROM Products WHERE name LIKE '%phone%' AND price > 100;

// DynamoDB: Phải dùng Scan (tốn)
// Hoặc tạo GSI trước (extra cost)
```

#### ❌ **Eventual Consistency**
```
Write thành công
  ├─ Ngay lập tức: Write node
  ├─ Sau vài ms: Replica node 1
  ├─ Sau vài ms: Replica node 2
  └─ Read từ replica trước replic xong = stale data

MySQL: ACID - Consistency luôn đảm bảo
```

#### ❌ **Cost at Scale (Chi phí khi data lớn)**
```
Vài GB: DynamoDB rẻ
Vài TB: DynamoDB có thể đắt hơn MySQL cluster
```

---

## 5. Hướng dẫn triển khai

### 5.1 Yêu cầu hệ thống
- Node.js v14+
- AWS Account
- DynamoDB tables đã tạo
- S3 bucket cho images
- EC2 instance (nếu deploy)

### 5.2 Setup Local

```bash
# 1. Install dependencies
npm install

# 2. Setup DynamoDB Local (tùy chọn)
# Download: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html

# 3. Configure .env
AWS_REGION=ap-southeast-1
DYNAMODB_TABLE_USERS=Users
DYNAMODB_TABLE_CATEGORIES=Categories
DYNAMODB_TABLE_PRODUCTS=Products
DYNAMODB_TABLE_LOGS=ProductLogs
S3_BUCKET_NAME=ecommerce-products

# 4. Create DynamoDB tables (AWS CLI)
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=username,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    IndexName=UsernameIndex,Keys=[{AttributeName=username,KeyType=HASH}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST

# Tương tự cho Categories, Products, ProductLogs

# 5. Run server
npm start
```

### 5.3 Deploy trên AWS EC2

```bash
# 1. SSH vào EC2
ssh -i key.pem ec2-user@instance-ip

# 2. Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install nodejs

# 3. Clone repo
git clone <repo>
cd ecommerce-dynamodb

# 4. Install + Start
npm install
npm start

# 5. Setup IAM Role (quan trọng!)
# EC2 Instance Profile phải có quyền DynamoDB, S3
# Policy:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*"
      ],
      "Resource": "arn:aws:dynamodb:ap-southeast-1:ACCOUNT:table/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::ecommerce-products/*"
    }
  ]
}
```

### 5.4 API Endpoints

```
# Authentication
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

# Categories
GET    /api/categories
GET    /api/categories/:id
POST   /api/categories (admin)
PUT    /api/categories/:id (admin)
DELETE /api/categories/:id (admin)

# Products
GET    /api/products
GET    /api/products/:id
GET    /api/products/search?categoryId=...&minPrice=...
POST   /api/products (admin)
PUT    /api/products/:id (admin)
DELETE /api/products/:id (admin)
GET    /api/products/inventory/status

# Frontend
GET    /
GET    /login
GET    /products
GET    /categories
```

---

## 6. Kết luận

Mô hình NoSQL + DynamoDB phù hợp cho:
✅ **Mini e-commerce** cần scale, serverless, deployment nhanh
✅ Thích hợp cho startup, MVP
✅ Dữ liệu không quá complex

Cần cẩn thận:
⚠️ Denormalization → Data consistency
⚠️ Scan operation → RCU cost
⚠️ No JOINs → Application logic phức tạp

**Recommendation:** Bắt đầu DynamoDB, nếu thấy pain points → migrate MySQL sau.
