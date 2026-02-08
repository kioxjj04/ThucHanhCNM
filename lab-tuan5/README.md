# Product Management System with AWS DynamoDB

Hệ thống quản lý sản phẩm với Node.js, Express, AWS DynamoDB và EJS.

## Cài đặt

### 1. Clone hoặc copy thư mục

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình AWS

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật thông tin AWS trong file `.env`:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=ap-southeast-1

# DynamoDB Table Names
DYNAMODB_PRODUCTS_TABLE=Products
DYNAMODB_USERS_TABLE=Users

# Session Secret
SESSION_SECRET=your-secret-key-here

# Server Port
PORT=3000
```

### 4. Setup DynamoDB Tables

Chạy script setup để tạo bảng trên AWS:

```bash
node db/setup.js
```

Script sẽ tạo 2 bảng:
- **Products**: Lưu trữ sản phẩm
- **Users**: Lưu trữ người dùng

### 5. Thêm user mặc định

Sử dụng AWS Console hoặc AWS CLI để thêm user vào bảng Users:

**Sử dụng AWS Console:**
1. Truy cập AWS DynamoDB Console
2. Chọn bảng "Users"
3. Click "Create item"
4. Thêm:
   - username: `admin`
   - password: `admin`

**Hoặc sử dụng AWS CLI:**

```bash
aws dynamodb put-item \
    --table-name Users \
    --item '{
        "username": {"S": "admin"},
        "password": {"S": "admin"},
        "createdAt": {"S": "2026-01-26T00:00:00.000Z"}
    }'
```

### 6. Chạy ứng dụng

```bash
node app.js
```

Truy cập: http://localhost:3000

## Đăng nhập

**Username**: `admin`  
**Password**: `admin`

## Công nghệ sử dụng

- **Backend**: Node.js, Express.js
- **Database**: AWS DynamoDB (NoSQL)
- **Template Engine**: EJS
- **Session**: express-session
- **AWS SDK**: @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb
- **UUID**: uuid v4
- **Environment**: dotenv

## Lưu ý

### AWS Credentials

Đảm bảo bạn đã cấu hình AWS credentials đúng cách. Bạn có thể:
1. Sử dụng file `.env` (khuyến nghị cho development)
2. Sử dụng AWS CLI configured credentials
3. Sử dụng IAM role (khuyến nghị cho production trên EC2)

### IAM Permissions

User/Role cần có các quyền sau:
- `dynamodb:CreateTable`
- `dynamodb:DescribeTable`
- `dynamodb:ListTables`
- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:Scan`
- `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`

### DynamoDB Billing

Ứng dụng sử dụng **PAY_PER_REQUEST** (On-Demand) billing mode, phù hợp cho:
- Development
- Testing
- Ứng dụng có traffic không đều

Nếu có traffic cao và đều đặn, nên chuyển sang **PROVISIONED** mode để tiết kiệm chi phí.

### S3 Image URLs

Để hiển thị hình ảnh:
1. Upload hình ảnh lên S3 bucket
2. Đảm bảo bucket có public read access hoặc sử dụng CloudFront
3. Copy URL và paste vào trường "URL Hình ảnh"

## So sánh với MySQL Version

| Tính năng | MySQL (lab_Tuan01) | DynamoDB (lab_Tuan02) |
|-----------|-------------------|----------------------|
| Database | MySQL (Relational) | DynamoDB (NoSQL) |
| ID | Auto-increment Integer | UUID String |
| Setup | Local MySQL server | AWS DynamoDB |
| Scalability | Vertical scaling | Auto-scaling |
| Cost | Free (local) | Pay-per-request |
| Image | Không hỗ trợ | S3 URL support |

## Troubleshooting

### Lỗi AWS Credentials
```
Error: Missing credentials in config
```
**Giải pháp**: Kiểm tra file `.env` và đảm bảo AWS credentials được cấu hình đúng.

### Lỗi Table not found
```
ResourceNotFoundException: Cannot do operations on a non-existent table
```
**Giải pháp**: Chạy lại `node db/setup.js` để tạo bảng.

### Không đăng nhập được
**Giải pháp**: Kiểm tra đã thêm user vào DynamoDB chưa (xem bước 5 trong Cài đặt).

## Tác giả

Lab Tuần 02 - DynamoDB Version

---

Dựa trên lab_Tuan01 (MySQL version) - Chuyển đổi sang AWS DynamoDB
