# 🧾 Receipt Extraction API (NestJS)

A backend API built with **NestJS** to extract structured data (vendor, date, items, total) from uploaded receipt images.

---

## 📁 Project Structure

├── dist/ # Compiled JS output
├── node_modules/
├── sample-receipts/ # Sample input images
├── uploads/ # Uploaded receipt files
├── src/
│ ├── common/ # Shared utils/constants
│ ├── config/ # Config modules
│ ├── receipt/ # Main feature module
│ │ ├── tests/ # Unit tests
│ │ ├── dto/ # Data Transfer Objects
│ │ ├── entities/ # Entity models (if using DB)
│ │ ├── receipt.controller.ts
│ │ ├── receipt.module.ts
│ │ └── receipt.service.ts
│ ├── app.module.ts # Root module
│ └── main.ts # App entrypoint
├── receipts.db # (Optional) DB file
├── .env
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── package-lock.json
└── tsconfig.json


---

## 🚀 Getting Started

### ✅ Prerequisites

- Node.js `>= 18.x`
- npm `>= 9.x`
- Nest CLI (optional):
  ```bash
  npm i -g @nestjs/cli


cd backend
npm install



⚙️ Setup Environment
Copy .env.example to .env and fill in the required variables:

env
Copy
Edit
PORT=3000
EXTRACTION_API_URL=https://api.example.com/extract
EXTRACTION_API_KEY=your-api-key-here
UPLOAD_DIR=uploads




🧠 How It Works
Upload a receipt image via POST /upload

File is saved temporarily in uploads/

API calls an OCR/extraction service with the image

Returns structured receipt data in JSON

🌐 API Endpoints
Method	Endpoint	Description
GET	/health	Health check
POST	/upload	Upload receipt image for processing

🔍 POST /upload
Form Data:

file (required) — Image (.jpg, .jpeg, .png)

Sample Response:

json
Copy
Edit
{
  "date": "2024-06-01",
  "currency": "USD",
  "vendor_name": "Target",
  "receipt_items": [
    { "item_name": "Notebook", "item_cost": "5.99" }
  ],
  "tax": "0.45",
  "total": "6.44",
  "image_url": "/uploads/receipt123.png"
}
📜 Scripts
Script	Description
npm run start	Start dev server
npm run build	Compile the app
npm run start:prod	Run in production mode
npm run test	Run unit tests (__tests__)
npm run lint	Run code linter

🧪 Testing
All tests are in:

bash
Copy
Edit
src/receipt/__tests__/
Run tests with:

bash
Copy
Edit
npm run test
🧰 Tools & Tech
NestJS – Scalable Node.js framework

Multer – For handling file uploads

Axios – To call external extraction service

dotenv – Load .env configs

class-validator – For DTO validation








