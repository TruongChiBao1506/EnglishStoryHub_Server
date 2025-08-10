import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS configuration - ĐẶT TRƯỚC rate limiter
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  preflightContinue: false
};

// Debug CORS
app.use((req, res, next) => {
  next();
});

app.use(cors(corsOptions));

// Handle preflight OPTIONS requests for all routes
app.options('*', cors(corsOptions));

// Rate limiting - ĐẶT SAU CORS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', routes);

// Root route - serve demo page
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Demo app route
app.get('/demo', (_, res) => {
  res.sendFile(path.join(__dirname, '../public/demo.html'));
});

// Error handling middleware (must be after routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 English Story Hub Server Started!');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🎯 Demo Page: http://localhost:${PORT}`);
  console.log(`💻 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('\n📚 Available Endpoints:');
  console.log('  GET  /api/health          - Health check');
  console.log('  POST /api/auth/register   - User registration');
  console.log('  POST /api/auth/login      - User login');
  console.log('  GET  /api/stories         - Get all stories');
  console.log('  POST /api/stories         - Create new story');
  console.log('  GET  /api/comments/story/:id - Get story comments');
  console.log('\n✨ Happy coding! ✨\n');
});

export default app;