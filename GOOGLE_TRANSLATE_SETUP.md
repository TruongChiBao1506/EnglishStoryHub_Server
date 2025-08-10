# Google Cloud Translation API Setup Guide

## 🌍 **Setup Instructions**

### **Option 1: Using API Key (Recommended for Development)**

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project:**
   - Create new project or select existing one

3. **Enable Translation API:**
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Translation API"
   - Click "Enable"

4. **Create API Key:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

5. **Update .env File:**
   ```env
   GOOGLE_TRANSLATE_API_KEY=your_actual_api_key_here
   ```

6. **Secure API Key (Optional but Recommended):**
   - In Google Cloud Console, click on your API key
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Translation API"
   - Under "Application restrictions", set HTTP referrers or IP addresses

### **Option 2: Using Service Account (Production)**

1. **Create Service Account:**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description

2. **Add Permissions:**
   - Add role: "Cloud Translation API User"

3. **Generate Key:**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the key file

4. **Update .env File:**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```

## 💰 **Pricing Information**

- **Free Tier:** 500,000 characters per month
- **Paid:** $20 per 1 million characters
- **Character count:** Includes spaces and punctuation

## 🔧 **Testing**

1. **Without API Key:**
   - System will use mock translation (current behavior)
   - Good for development/demo

2. **With API Key:**
   - System will use Google Cloud Translation
   - Real, accurate translations
   - Supports 100+ languages

## 🌐 **Supported Languages**

The API supports translation between any of these language codes:
- `vi` - Vietnamese (Tiếng Việt)
- `zh` - Chinese (中文)
- `ja` - Japanese (日本語)
- `ko` - Korean (한국어)
- `th` - Thai (ไทย)
- `es` - Spanish (Español)
- `fr` - French (Français)
- `de` - German (Deutsch)
- `ru` - Russian (Русский)
- And 100+ more languages

## 🚀 **Production Deployment**

For production deployment, use Service Account method:

1. Store service account key securely
2. Set environment variables on your server
3. Never commit API keys to version control
4. Set up monitoring and usage alerts
5. Implement caching to reduce API calls

## 📊 **Features**

✅ **Automatic Language Detection**
✅ **High-Quality Neural Machine Translation**
✅ **100+ Languages Supported**
✅ **Real-time Translation**
✅ **Batch Translation Support**
✅ **Fallback to Mock Translation**
