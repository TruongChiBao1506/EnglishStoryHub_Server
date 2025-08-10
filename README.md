# English Story Hub - Backend API

A community-driven platform where English learners can create, share, and improve their English stories together. This is the backend API server built with Node.js, TypeScript, Express, and MongoDB.

## 🌟 Features

- **User Authentication**: Secure registration and login with JWT tokens
- **Story Management**: Create, read, update, and delete English stories
- **Community Interaction**: Like stories and add comments
- **User Levels**: Beginner, Intermediate, Advanced classification
- **Points System**: Earn points for creating stories and engaging with the community
- **Filtering & Search**: Find stories by difficulty, tags, author, or search terms
- **RESTful API**: Clean, well-structured API endpoints
- **Input Validation**: Comprehensive request validation
- **Security**: Rate limiting, CORS, and input sanitization
- **Error Handling**: Consistent error responses and logging

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Password Hashing**: bcryptjs

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd english-story-hub-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/english-story-hub
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # Server
   PORT=5000
   NODE_ENV=development
   
   # CORS
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system:
   - **Local MongoDB**: `mongod`
   - **MongoDB Atlas**: Use your Atlas connection string in `MONGODB_URI`

5. **Run the development server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:5000`

### Build for Production

```bash
npm run build
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "bio": "Learning English every day!",
  "level": "beginner"
}
```

#### POST /auth/login
Login to an existing account.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

#### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

### Story Endpoints

#### GET /stories
Get all published stories with pagination and filtering.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 50)
- `difficulty` - Filter by difficulty level
- `tags` - Filter by tags (comma-separated)
- `author` - Filter by author ID
- `search` - Search in title and content
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort order: asc/desc (default: desc)

#### POST /stories
Create a new story (requires authentication).

**Request Body:**
```json
{
  "title": "My First English Story",
  "content": "Once upon a time, in a small village...",
  "difficulty": "beginner",
  "tags": ["adventure", "friendship"],
  "excerpt": "A short summary of the story..."
}
```

#### GET /stories/:id
Get a specific story by ID.

#### PUT /stories/:id
Update a story (requires authentication, owner only).

#### DELETE /stories/:id
Delete a story (requires authentication, owner only).

#### POST /stories/:id/like
Like/unlike a story (requires authentication).

### Comment Endpoints

#### GET /comments/story/:storyId
Get all comments for a story.

#### POST /comments/story/:storyId
Add a comment to a story (requires authentication).

**Request Body:**
```json
{
  "content": "Great story! I enjoyed reading it.",
  "parentComment": "optional-parent-comment-id"
}
```

#### PUT /comments/:commentId
Update a comment (requires authentication, owner only).

#### DELETE /comments/:commentId
Delete a comment (requires authentication, owner only).

#### POST /comments/:commentId/like
Like/unlike a comment (requires authentication).

### Response Format

All API responses follow this consistent format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]
}
```

## 🏗️ Project Structure

```
src/
├── config/
│   └── database.ts          # MongoDB connection
├── controllers/
│   ├── authController.ts    # Authentication logic
│   ├── storyController.ts   # Story management
│   └── commentController.ts # Comment management
├── middleware/
│   ├── auth.ts             # JWT authentication
│   ├── validation.ts       # Request validation
│   └── errorHandler.ts     # Error handling
├── models/
│   ├── User.ts            # User schema
│   ├── Story.ts           # Story schema
│   └── Comment.ts         # Comment schema
├── routes/
│   ├── authRoutes.ts      # Auth endpoints
│   ├── storyRoutes.ts     # Story endpoints
│   ├── commentRoutes.ts   # Comment endpoints
│   └── index.ts           # Route aggregation
└── index.ts               # Application entry point
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **Rate Limiting**: Prevents API abuse
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive request validation
- **Helmet**: Security headers
- **MongoDB Injection Protection**: Mongoose built-in protection

## 🎯 Points System

Users earn points for community engagement:
- **Create a story**: +10 points
- **Add a comment**: +2 points
- **Receive a like on story**: +1 point
- **Receive a like on comment**: +1 point

## 🚀 Deployment

### Docker Deployment (Recommended)

1. **Using Docker Compose (includes MongoDB)**
   ```bash
   docker-compose up -d
   ```

2. **Using Docker only**
   ```bash
   # Build image
   docker build -t english-story-hub .
   
   # Run container
   docker run -p 5000:5000 --env-file .env english-story-hub
   ```

### Manual Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-very-secure-production-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Deployment Platforms

- **Heroku**: 
  ```bash
  git add .
  git commit -m "Deploy to Heroku"
  git push heroku main
  ```

- **Railway**: Connect GitHub repository and deploy automatically

- **DigitalOcean App Platform**: Deploy from GitHub with auto-deploy

- **AWS Elastic Beanstalk**: 
  ```bash
  npm run deploy:build
  zip -r app.zip dist package.json
  # Upload to EB
  ```

- **Vercel (Serverless)**: Deploy with `vercel` CLI

### Database Seeding

To populate your database with sample data for testing:

```bash
npm run seed
```

This will create sample users, stories, and comments to test the application.

## 🔗 Demo & Testing

### Live Demo

- **Demo Application**: Visit `http://localhost:5000/demo` for an interactive frontend
- **API Documentation**: Visit `http://localhost:5000/api/health` for API status
- **Basic Info**: Visit `http://localhost:5000` for project overview

### Testing the API

You can test the API using the demo frontend or tools like Postman/Insomnia:

**Sample API Test Flow:**
1. Register a new user: `POST /api/auth/register`
2. Login: `POST /api/auth/login`
3. Create a story: `POST /api/stories`
4. Get all stories: `GET /api/stories`
5. Like a story: `POST /api/stories/:id/like`
6. Add a comment: `POST /api/comments/story/:storyId`

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

For support and questions:
- Create an issue on GitHub
- Contact: [your-email@example.com]

## 🔮 Future Features

- [ ] AI Grammar Checking Integration
- [ ] Audio Story Upload/Playback
- [ ] Real-time Chat
- [ ] Story Collections/Bookmarks
- [ ] Advanced Search with Elasticsearch
- [ ] Email Notifications
- [ ] Social Media Sharing
- [ ] Mobile App API support

---

**Happy Coding! 🎉**

Built with ❤️ for English learners around the world.
