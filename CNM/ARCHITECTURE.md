# System Architecture & Flow Documentation

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                              │
│  ┌─────────────┬──────────────────┬────────────────┬──────────────────┐ │
│  │ index.html  │ login.html       │ products.html  │ categories.html   │ │
│  │ (Home)      │ (Authentication) │ (Search/Filter)│ (Management)      │ │
│  └─────────────┴──────────────────┴────────────────┴──────────────────┘ │
│                                  ▲                                      │
│                                  │ HTTP/REST                            │
│                                  ▼                                      │
└──────────────────────────────────────────────────────────────────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                ▼                  ▼                  ▼
           ┌─────────────────────────────────────────────┐
           │     Express.js Server (Node.js)             │
           ├─────────────────────────────────────────────┤
           │ Middlewares:                                 │
           │ ├─ Session Management                       │
           │ ├─ Authentication (requireLogin)            │
           │ ├─ Authorization (requireAdmin)             │
           │ └─ Audit Logging                            │
           ├─────────────────────────────────────────────┤
           │ Routes Layer:                               │
           │ ├─ /api/auth                                │
           │ ├─ /api/categories                          │
           │ └─ /api/products                            │
           ├─────────────────────────────────────────────┤
           │ Services Layer (Business Logic):            │
           │ ├─ AuthService                              │
           │ ├─ CategoryService                          │
           │ └─ ProductService                           │
           ├─────────────────────────────────────────────┤
           │ Repositories Layer (Data Access):           │
           │ ├─ UserRepository                           │
           │ ├─ CategoryRepository                       │
           │ └─ ProductRepository                        │
           └─────────────────────────────────────────────┘
                ▲              ▲              ▲
                │              │              │
    ┌───────────┴──────────────┼──────────────┴───────────┐
    │                          │                         │
    ▼                          ▼                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  AWS DynamoDB   │    │    AWS S3        │    │    AWS IAM       │
├─────────────────┤    ├──────────────────┤    ├──────────────────┤
│ Users           │    │ Product Images   │    │ EC2 Role         │
│ Categories      │    │ (Secure Storage) │    │ (Credentials)    │
│ Products        │    │                  │    │ (No Hardcode)    │
│ ProductLogs     │    │                  │    │                  │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Detailed Request/Response Flow

### 2.1 Login Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Client Side                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User enters credentials                                            │
│     ├─ username: "admin1"                                              │
│     └─ password: "secret123"                                           │
│                                                                         │
│  2. POST /api/auth/login                                               │
│     Body: {username, password}                                         │
│     ├─ Send via fetch/axios                                            │
│     └─ Wait for response                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Server Side - Authentication Route Handler                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  routes/auth.js: POST /api/auth/login                                  │
│  ├─ Receive {username, password}                                       │
│  ├─ Validate input                                                     │
│  │  └─ if (!username || !password) return 400                          │
│  │                                                                      │
│  └─ Call: AuthService.login(username, password)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Service Layer - Business Logic                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  services/AuthService.js: login()                                      │
│  ├─ Call: UserRepository.getUserByUsername(username)                   │
│  │  └─► [Check DynamoDB]                                              │
│  │                                                                      │
│  ├─ If user NOT found:                                                 │
│  │  └─ throw Error('Invalid credentials')                              │
│  │                                                                      │
│  ├─ If user found:                                                     │
│  │  ├─ hashedPassword = user.password (from DB)                        │
│  │  ├─ Call: UserRepository.verifyPassword(plainPassword, hashedPass)  │
│  │  │  └─ Uses bcrypt.compare()                                        │
│  │  │                                                                   │
│  │  ├─ If password match:                                              │
│  │  │  └─ Return {userId, username, role}                             │
│  │  │                                                                   │
│  │  └─ If password NOT match:                                          │
│  │     └─ throw Error('Invalid credentials')                           │
│  │                                                                      │
│  └─ Return user info                                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Repository Layer - Data Access                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  repositories/UserRepository.js                                        │
│  ├─ getUserByUsername(username)                                        │
│  │  ├─ Query DynamoDB UsernameIndex                                    │
│  │  │  ├─ TableName: "Users"                                           │
│  │  │  ├─ IndexName: "UsernameIndex"                                   │
│  │  │  ├─ KeyConditionExpression: "username = :username"              │
│  │  │  └─ ExpressionAttributeValues: {":username": username}          │
│  │  │                                                                   │
│  │  └─ Return user item or null                                        │
│  │                                                                      │
│  └─ verifyPassword(plainPassword, hashedPassword)                      │
│     ├─ Use bcryptjs.compare()                                          │
│     ├─ If match: return true                                           │
│     └─ If NOT match: return false                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Back to Route Handler - Session Management                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  routes/auth.js: POST /api/auth/login                                  │
│  ├─ Receive user info from AuthService                                 │
│  │  └─ {userId, username, role}                                        │
│  │                                                                      │
│  ├─ Save to session: req.session.user = user                           │
│  │  ├─ Session stored in:                                              │
│  │  │  ├─ Memory (development)                                         │
│  │  │  ├─ Redis (production)                                           │
│  │  │  └─ DynamoDB Sessions (option)                                   │
│  │  │                                                                   │
│  │  └─ Session ID sent as cookie (httpOnly, secure)                    │
│  │                                                                      │
│  └─ Return response: {message: "Login successful", user: {...}}        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Client Side - Handle Response                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Receive response: status 200 + {message, user}                     │
│                                                                         │
│  2. Store user info (localStorage)                                     │
│     └─ For frontend use (display username, check role)                 │
│                                                                         │
│  3. Cookie automatically sent with all subsequent requests             │
│     ├─ Browser handles this automatically                              │
│     ├─ Server validates session on each request                        │
│     └─ Protected routes require session                                │
│                                                                         │
│  4. Redirect to home page                                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Create Product Flow (Admin Only)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Client Side                                                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Admin fills product form                                            │
│     ├─ name: "MacBook Pro 14"                                           │
│     ├─ price: 1999.99                                                   │
│     ├─ quantity: 5                                                      │
│     └─ categoryId: "cat-1"                                              │
│                                                                          │
│  2. POST /api/products                                                  │
│     Body: {name, price, quantity, categoryId, imageUrl}                 │
│     └─ Automatically include session cookie                             │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Middleware Layer - Authentication & Authorization                       │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  requireAdmin Middleware:                                               │
│  ├─ Check if req.session.user exists                                    │
│  │  └─ If NOT → return 401 "Unauthorized"                              │
│  │                                                                       │
│  ├─ Check if req.session.user.role === "admin"                         │
│  │  ├─ If admin → Continue to route handler                            │
│  │  └─ If staff → return 403 "Forbidden"                               │
│  │                                                                       │
│  └─ Auditlog middleware logs request                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Route Handler                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  routes/products.js: POST /api/products                                 │
│  ├─ Extract body parameters                                             │
│  ├─ Call: ProductService.createProduct(name, price, quantity, catId)   │
│  └─ Return response                                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Service Layer - Business Logic                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  services/ProductService.js: createProduct()                            │
│  ├─ Validate input:                                                     │
│  │  ├─ if (!name || !price || !quantity || !categoryId)               │
│  │  │  └─ throw Error('Missing required fields')                       │
│  │  ├─ if (price < 0 || quantity < 0)                                 │
│  │  │  └─ throw Error('Invalid price/quantity')                        │
│  │  │                                                                    │
│  │  └─ categoryId must be valid UUID                                    │
│  │                                                                       │
│  ├─ Verify category exists:                                            │
│  │  ├─ Call: CategoryRepository.getCategoryById(categoryId)            │
│  │  │  └─► Query DynamoDB                                             │
│  │  │                                                                    │
│  │  └─ If category NOT found → throw Error('Category not found')       │
│  │                                                                       │
│  ├─ Call: ProductRepository.createProduct(...)                         │
│  │  └─► Proceed to repository layer                                    │
│  │                                                                       │
│  └─ Return created product with enrichment                              │
│     ├─ Add categoryName                                                 │
│     └─ Add inventoryStatus                                              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Repository Layer - Data Access                                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  repositories/ProductRepository.js: createProduct()                     │
│  ├─ Generate UUID for product:                                         │
│  │  └─ const id = uuidv4()                                              │
│  │                                                                       │
│  ├─ Create DynamoDB item:                                              │
│  │  └─ {                                                                │
│  │      id: UUID,                                                       │
│  │      name: "MacBook Pro 14",                                        │
│  │      price: 1999.99,                                                 │
│  │      quantity: 5,                                                    │
│  │      categoryId: "cat-1",                                            │
│  │      url_image: null,                                                │
│  │      isDeleted: false,  ◄─ Important for soft delete                │
│  │      createdAt: ISO_NOW                                              │
│  │    }                                                                  │
│  │                                                                       │
│  ├─ Execute: dynamodb.put(params)                                      │
│  │  ├─ TableName: "Products"                                           │
│  │  ├─ Item: {...product object...}                                    │
│  │  └─ WriteCapacityUnit: 1 unit consumed                              │
│  │                                                                       │
│  ├─ Call: logProductAction("CREATE", id, null)                         │
│  │  └─ Insert into ProductLogs table                                   │
│  │     {                                                                │
│  │       logId: UUID,                                                   │
│  │       productId: id,                                                 │
│  │       action: "CREATE",                                              │
│  │       userId: from_session,                                          │
│  │       time: ISO_NOW,                                                 │
│  │       oldData: null  ◄─ CREATE has no oldData                       │
│  │     }                                                                │
│  │                                                                       │
│  └─ Return created item                                                │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ DynamoDB Storage (Distributed Database)                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Partition Key (id):                                                    │
│  ├─ DynamoDB hashes id → determines partition                          │
│  └─ Data distributed across multiple servers                            │
│                                                                          │
│  Items stored:                                                           │
│  ├─ Products table: {id, name, price, categoryId, ...}                 │
│  └─ ProductLogs table: {logId, productId, action, ...}                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Response Back to Client                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Status: 201 Created                                                    │
│  Body: {                                                                │
│    message: "Product created",                                          │
│    product: {                                                           │
│      id: "prod-uuid",                                                   │
│      name: "MacBook Pro 14",                                            │
│      price: 1999.99,                                                    │
│      quantity: 5,                                                       │
│      categoryId: "cat-1",                                               │
│      categoryName: "Electronics",  ◄─ Enriched in service             │
│      inventoryStatus: "Còn hàng",                                       │
│      isDeleted: false,                                                  │
│      createdAt: ISO_TIME                                                │
│    }                                                                     │
│  }                                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Search Products Flow

```
Client: GET /api/products/search?categoryId=cat-1&minPrice=100&maxPrice=500&name=Laptop

                              ▼

Server: routes/products.js
├─ Extract query parameters:
│  ├─ categoryId: "cat-1"
│  ├─ minPrice: 100
│  ├─ maxPrice: 500
│  └─ name: "Laptop"
│
└─ Call: ProductService.searchProducts(criteria)

                              ▼

Service: services/ProductService.js
└─ Call: ProductRepository.searchProducts(criteria)

                              ▼

Repository: repositories/ProductRepository.js
├─ Build DynamoDB Scan parameters:
│
│  FilterExpression:
│    isDeleted = :false
│    AND categoryId = :catId
│    AND price BETWEEN :minPrice AND :maxPrice
│    AND contains(#name, :name)
│
│  ExpressionAttributeValues:
│    ":false" = false
│    ":catId" = "cat-1"
│    ":minPrice" = 100
│    ":maxPrice" = 500
│    ":name" = "Laptop"
│
├─ Execute: dynamodb.scan(params)
│
│  ⚠️ WARNING: This is a SCAN operation
│  └─ Scan reads ALL items in Products table
│     └─ Then filters based on FilterExpression
│     └─ This consumes many RCU (Read Capacity Units)
│     └─ For large datasets, this is EXPENSIVE!
│
├─ DynamoDB returns:
│  ├─ Items: [...matching products...]
│  ├─ Count: 5 (items returned)
│  ├─ ScannedCount: 1000 (items examined)
│  │  └─ ScannedCount > Count = Many items filtered out
│  │  └─ Indicates poor query efficiency
│  │
│  └─ LastEvaluatedKey: {...} (for pagination)
│
└─ Return:
   {
     items: [...],
     count: 5,
     scannedCount: 1000,
     lastKey: {...},
     note: "Scan inefficient - use Query if possible"
   }

                              ▼

Response to Client:
{
  items: [
    {
      id: "prod-1",
      name: "Laptop Gaming",
      price: 299.99,
      categoryName: "Electronics",
      inventoryStatus: "Còn hàng",
      ...
    },
    ...
  ],
  count: 5,
  scannedCount: 1000,  ← Show cost
  note: "..."
}

⚠️ Better Approach: Use Query with GSI
If searching only by categoryId (no name contains):
  GET /api/products/search?categoryId=cat-1&minPrice=100&maxPrice=500

Use Query on CategoryIdIndex:
  ├─ Query (efficient) instead of Scan
  ├─ Only scans category items
  ├─ Lower RCU cost
  └─ Much faster
```

---

## 3. Database Operations Summary

### DynamoDB Best Practices

```
✅ DO:
├─ Query by Partition Key or GSI
├─ Use filters only when necessary
├─ Implement soft delete (isDeleted flag)
├─ Paginate results (Limit + LastEvaluatedKey)
├─ Design schema around access patterns
├─ Use appropriate indexes
└─ Monitor RCU/WCU usage

❌ DON'T:
├─ Scan tables with large datasets
├─ Store large objects (>400KB)
├─ Create complex joins (no JOIN support)
├─ Assume strong consistency (eventually consistent)
├─ Hard-code AWS credentials
├─ Forget to filter isDeleted = false
└─ Update indexes manually
```

---

## 4. Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AWS Cloud                                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────┐                        │
│  │      Load Balancer (ALB)        │                        │
│  │  Distributes traffic to EC2s    │                        │
│  └──────────────┬──────────────────┘                        │
│                 │                                            │
│     ┌───────────┼───────────┐                               │
│     ▼           ▼           ▼                               │
│  ┌─────┐    ┌─────┐    ┌─────┐                             │
│  │ EC2 │    │ EC2 │    │ EC2 │  Auto-scaling group         │
│  │ i-1 │    │ i-2 │    │ i-3 │                             │
│  │     │    │     │    │     │                             │
│  │ IAM │    │ IAM │    │ IAM │  Instance Profiles           │
│  │Role │    │Role │    │Role │  (No credentials hardcoded) │
│  └─────┘    └─────┘    └─────┘                             │
│     │           │           │                               │
│     │ Node.js + Express     │                               │
│     │ App running on each   │                               │
│     │                       │                               │
│     └───────────┬───────────┘                               │
│                 │                                            │
│   ┌─────────────┼─────────────┐                             │
│   ▼             ▼             ▼                             │
│ ┌──────────┐ ┌──────┐ ┌──────────┐                         │
│ │DynamoDB  │ │  S3  │ │CloudWatch│                         │
│ │(Database)│ │(Files)│ │(Logging) │                         │
│ └──────────┘ └──────┘ └──────────┘                         │
│                                                              │
│ IAM Policy:                                                  │
│ - DynamoDB: GetItem, Query, Scan, PutItem, UpdateItem      │
│ - S3: GetObject, PutObject, DeleteObject                   │
│ - CloudWatch: PutMetricData, PutLogEvents                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Security Flow

```
Request arrives:
├─ ALB checks security groups
├─ Express receives request
├─ Session middleware:
│  ├─ Checks if request has session cookie
│  └─ Validates session is not expired
├─ Route middleware (requireAdmin):
│  ├─ Checks req.session.user exists
│  └─ Checks req.session.user.role === "admin"
├─ Route handler processes request
├─ Service validates business logic
├─ Repository accesses DynamoDB
│  ├─ Uses IAM Role credentials
│  ├─ No hardcoded keys
│  └─ Credentials auto-rotated by AWS
└─ Response sent with security headers
```

---

## Conclusion

This architecture ensures:
- ✅ **Scalability**: Auto-scaling, distributed database
- ✅ **Security**: No hardcoded credentials, IAM roles, session-based auth
- ✅ **Maintainability**: Layered architecture, separation of concerns
- ✅ **Performance**: Indexed queries, pagination
- ✅ **Compliance**: Audit logs, soft deletes
