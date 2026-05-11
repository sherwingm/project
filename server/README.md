# Server Setup

This server handles authentication, groups, and receipt OCR.

## Environment

Create a `server/.env` file or set these variables in your runtime environment:

```env
MONGODB_URI=mongodb://localhost:27017/budget-split-expenser
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here
```

## OCR

Receipt OCR is proxied through `POST /api/ocr/scan-receipt`. The frontend sends base64 image data to the server, and the server calls Gemini with the backend API key.
