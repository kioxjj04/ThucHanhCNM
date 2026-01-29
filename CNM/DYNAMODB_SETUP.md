# DynamoDB Tables Setup Guide

## 📊 Tạo bảng Users

```bash
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=username,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "UsernameIndex",
      "KeySchema": [
        {"AttributeName": "username", "KeyType": "HASH"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

**Giải thích:**
- `userId` (HASH): Partition key - dùng để distribute data
- `UsernameIndex` (GSI): Cho phép query theo username
- `PAY_PER_REQUEST`: Tính tiền theo request thực tế (linh hoạt hơn)

---

## 📊 Tạo bảng Categories

```bash
aws dynamodb create-table \
  --table-name Categories \
  --attribute-definitions \
    AttributeName=categoryId,AttributeType=S \
  --key-schema \
    AttributeName=categoryId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

---

## 📊 Tạo bảng Products

```bash
aws dynamodb create-table \
  --table-name Products \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=categoryId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=id,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "CategoryIdIndex",
      "KeySchema": [
        {"AttributeName": "categoryId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

**Lưu ý:**
- `CategoryIdIndex`: Cho phép query products by category
- `createdAt` là sort key trong GSI: query newest products first

---

## 📊 Tạo bảng ProductLogs

```bash
aws dynamodb create-table \
  --table-name ProductLogs \
  --attribute-definitions \
    AttributeName=logId,AttributeType=S \
    AttributeName=productId,AttributeType=S \
    AttributeName=time,AttributeType=S \
  --key-schema \
    AttributeName=logId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "ProductIdIndex",
      "KeySchema": [
        {"AttributeName": "productId", "KeyType": "HASH"},
        {"AttributeName": "time", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
    }]' \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-1
```

**Audit trail:**
- `ProductIdIndex`: Xem lịch sử thay đổi của 1 product
- `time` sort key: Log mới nhất trước

---

## 📝 Sample Data

### Insert Users

```bash
aws dynamodb put-item \
  --table-name Users \
  --item '{
    "userId": {"S": "user-1"},
    "username": {"S": "admin1"},
    "password": {"S": "$2b$10$...hash..."},
    "role": {"S": "admin"},
    "createdAt": {"S": "2024-01-29T10:00:00Z"}
  }' \
  --region ap-southeast-1
```

### Insert Categories

```bash
aws dynamodb put-item \
  --table-name Categories \
  --item '{
    "categoryId": {"S": "cat-1"},
    "name": {"S": "Electronics"},
    "description": {"S": "Electronic devices and accessories"},
    "createdAt": {"S": "2024-01-29T10:00:00Z"}
  }' \
  --region ap-southeast-1
```

### Insert Products

```bash
aws dynamodb put-item \
  --table-name Products \
  --item '{
    "id": {"S": "prod-1"},
    "name": {"S": "MacBook Pro 14"},
    "price": {"N": "1999.99"},
    "quantity": {"N": "5"},
    "categoryId": {"S": "cat-1"},
    "url_image": {"S": "https://s3.../macbook.jpg"},
    "isDeleted": {"BOOL": false},
    "createdAt": {"S": "2024-01-29T10:00:00Z"}
  }' \
  --region ap-southeast-1
```

---

## 🔍 Query Examples

### Query Users by username

```bash
aws dynamodb query \
  --table-name Users \
  --index-name UsernameIndex \
  --key-condition-expression "username = :username" \
  --expression-attribute-values '{
    ":username": {"S": "admin1"}
  }' \
  --region ap-southeast-1
```

### Query Products by category

```bash
aws dynamodb query \
  --table-name Products \
  --index-name CategoryIdIndex \
  --key-condition-expression "categoryId = :catId AND createdAt > :date" \
  --expression-attribute-values '{
    ":catId": {"S": "cat-1"},
    ":date": {"S": "2024-01-01T00:00:00Z"}
  }' \
  --region ap-southeast-1
```

### Scan products with filter

```bash
aws dynamodb scan \
  --table-name Products \
  --filter-expression "isDeleted = :deleted AND #p BETWEEN :minPrice AND :maxPrice" \
  --expression-attribute-names '{
    "#p": "price"
  }' \
  --expression-attribute-values '{
    ":deleted": {"BOOL": false},
    ":minPrice": {"N": "100"},
    ":maxPrice": {"N": "500"}
  }' \
  --region ap-southeast-1
```

---

## ⚠️ Best Practices

### 1. **Naming Convention**
- PK: Unique identifier (UUID preferred)
- GSI: Secondary access patterns
- Attributes: camelCase

### 2. **Optimization**
- ✅ Query với GSI (efficient)
- ❌ Scan + Filter (costly)
- ✅ Pagination (limit + lastKey)
- ❌ Fetch all items at once

### 3. **Data Type**
```javascript
String:   "S"
Number:   "N"
Binary:   "B"
Boolean:  "BOOL"
Null:     "NULL"
List:     "L"
Map:      "M"
```

### 4. **Soft Delete**
```
Luôn filter: isDeleted = false
Giúp recovery + audit trail
```

### 5. **TTL (Time To Live) - tùy chọn**
```bash
aws dynamodb update-time-to-live \
  --table-name ProductLogs \
  --time-to-live-specification AttributeName=expiresAt,Enabled=true \
  --region ap-southeast-1
```

Auto-delete old logs sau thời gian

---

## 🐛 Troubleshooting

### "Item size exceeds 400 KB"
- Chia nhỏ item hoặc store large data on S3

### "Provisioned throughput exceeded"
- Switch sang PAY_PER_REQUEST
- Hoặc increase capacity

### "Scan returned 0 items nhưng biết có data"
- Check filter expression
- Check isDeleted flag

---

## 📚 References
- [AWS DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
- [Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
