import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User';
import Story from '../src/models/Story';
import Comment from '../src/models/Comment';

dotenv.config();

const sampleUsers = [
  {
    username: 'alice_learner',
    email: 'alice@example.com',
    password: 'Alice123!',
    level: 'beginner',
    bio: 'Just started learning English. Love reading stories!',
    points: 45,
  },
  {
    username: 'bob_writer',
    email: 'bob@example.com', 
    password: 'Bob123!',
    level: 'intermediate',
    bio: 'I enjoy writing short stories to practice English.',
    points: 78,
  },
  {
    username: 'carol_teacher',
    email: 'carol@example.com',
    password: 'Carol123!',
    level: 'advanced',
    bio: 'English teacher helping students improve their writing.',
    points: 156,
  },
];

const sampleStories = [
  {
    title: 'The Magic Library',
    content: `Once upon a time, there was a small library in the center of town. This library was different from all the others because it had magic books.

Emma, a curious 10-year-old girl, loved to visit this library every weekend. One day, she found a book that glowed with a soft blue light. When she opened it, the characters jumped out of the pages and started talking to her!

"Welcome to our world!" said a small dragon with green scales. "We need your help to save our kingdom from the evil wizard."

Emma was scared at first, but then she felt excited. She had always dreamed of going on an adventure. She took the dragon's tiny hand and stepped into the book.

Inside the story, everything was colorful and magical. There were talking animals, flying carpets, and castles in the clouds. Emma helped the dragon find the magic sword that could defeat the evil wizard.

After many challenges, they succeeded! The kingdom was saved, and Emma became a hero. When she returned to the real world, she realized that reading was the greatest adventure of all.

From that day on, Emma visited the magic library every day, ready for new adventures in every book she opened.`,
    difficulty: 'beginner',
    tags: ['magic', 'adventure', 'library', 'children'],
    excerpt: 'A young girl discovers a magical library where book characters come to life and take her on incredible adventures.',
  },
  {
    title: 'The Coffee Shop Connection',
    content: `Sarah had been working remotely for three years, and she was tired of being alone all day. She decided to try working from a local coffee shop called "The Daily Grind."

On her first day there, she ordered a large cappuccino and found a quiet corner table. She opened her laptop and started working on her design project. The atmosphere was perfect – not too loud, not too quiet, with the gentle hum of conversations and coffee machines in the background.

After an hour, she noticed a man at the next table struggling with his laptop. His coffee had spilled on the keyboard, and he looked frustrated. Sarah, being a tech-savvy person, offered to help.

"I think I can fix that," she said with a smile. "I've had the same problem before."

The man, whose name was David, was grateful for her help. They started talking, and Sarah discovered that David was a freelance writer working on a novel about time travel. They had an interesting conversation about creativity and remote work.

From that day on, both Sarah and David became regulars at The Daily Grind. They would sit at neighboring tables, working on their projects but also sharing ideas and encouraging each other.

Three months later, they realized they had become more than just coffee shop friends. Their shared love for creativity and good coffee had grown into something special.

Sometimes, the best connections happen when you least expect them – over a spilled cup of coffee.`,
    difficulty: 'intermediate',
    tags: ['romance', 'work', 'coffee', 'modern-life'],
    excerpt: 'Two remote workers find an unexpected connection at a local coffee shop that changes both of their lives.',
  },
  {
    title: 'The Last Bookstore on Earth',
    content: `In the year 2087, physical books had become obsolete. Everything was digital, stored in neural chips that could download entire libraries instantly. Marcus Chen was the owner of the last bookstore on Earth, located in what used to be called New York City.

His store, "Paper Dreams," was considered a relic by most people. The government had offered him substantial compensation to close it and convert the space into another virtual reality center, but Marcus refused. He believed that there was something irreplaceable about the tactile experience of reading a physical book – the smell of paper, the weight in your hands, the sound of turning pages.

Every day, fewer people visited his store. Most of his customers were elderly individuals who remembered the "old days" or curious teenagers who had heard stories about physical books from their grandparents. Marcus often wondered if he was fighting a losing battle.

One rainy Tuesday, a young woman named Elena entered the store. She was different from his usual customers – she was probably in her twenties, dressed in the latest smart-fabric clothing, and had the neural implants that indicated she was fully integrated with the digital world.

"I've never touched a real book before," she admitted, running her fingers along the spines of the novels on the shelf. "My grandmother told me about them before she died. She said they were magical."

Marcus handed her a copy of "To Kill a Mockingbird," one of his favorite classics. "Try this one," he said. "Don't just read it – experience it. Feel the pages, smell the paper, take your time with each word."

Elena spent the entire afternoon in the store, completely absorbed in the book. When she finished, tears were in her eyes. "I understand now," she said. "This is completely different from downloading information. This is... meditation. This is art."

Word spread through Elena's social networks. Soon, young people began visiting "Paper Dreams" regularly. They formed reading groups, discussed books face-to-face instead of through neural links, and rediscovered the joy of slow, contemplative reading.

Marcus realized that he wasn't just preserving books – he was preserving humanity's connection to patience, reflection, and genuine intellectual intimacy. In a world of instant everything, his bookstore had become a sanctuary for the soul.

The last bookstore on Earth was no longer dying. It was teaching the world how to live again.`,
    difficulty: 'advanced',
    tags: ['dystopia', 'technology', 'books', 'future', 'philosophy'],
    excerpt: 'In a digital future, the owner of the last physical bookstore on Earth fights to preserve the irreplaceable experience of reading real books.',
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/english-story-hub';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Story.deleteMany({});
    await Comment.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.username}`);
    }

    // Create stories
    const createdStories = [];
    for (let i = 0; i < sampleStories.length; i++) {
      const storyData = {
        ...sampleStories[i],
        author: createdUsers[i]._id,
      };
      const story = new Story(storyData);
      await story.save();
      createdStories.push(story);
      console.log(`📚 Created story: ${story.title}`);
    }

    // Create sample comments
    const sampleComments = [
      {
        content: "This is such a beautiful story! I love how magical it feels. It reminds me of my childhood dreams.",
        author: createdUsers[1]._id,
        story: createdStories[0]._id,
      },
      {
        content: "Great beginner-level story. The vocabulary is perfect for English learners like me!",
        author: createdUsers[2]._id,
        story: createdStories[0]._id,
      },
      {
        content: "I can really relate to this story. Working from coffee shops has changed my life too!",
        author: createdUsers[0]._id,
        story: createdStories[1]._id,
      },
      {
        content: "This story makes me think about our relationship with technology. Very thought-provoking.",
        author: createdUsers[1]._id,
        story: createdStories[2]._id,
      },
      {
        content: "Wow, such a dystopian vision but also hopeful at the same time. Excellent writing!",
        author: createdUsers[0]._id,
        story: createdStories[2]._id,
      },
    ];

    for (const commentData of sampleComments) {
      const comment = new Comment(commentData);
      await comment.save();
      
      // Update story comment count
      await Story.findByIdAndUpdate(comment.story, {
        $inc: { commentsCount: 1 }
      });
      
      console.log(`💬 Created comment on story: ${comment.story}`);
    }

    // Add some likes to stories
    for (let i = 0; i < createdStories.length; i++) {
      const story = createdStories[i];
      const likesCount = Math.floor(Math.random() * 5) + 1; // 1-5 likes
      
      for (let j = 0; j < likesCount; j++) {
        const randomUser = createdUsers[j % createdUsers.length];
        if (!story.likes.includes(randomUser._id)) {
          story.likes.push(randomUser._id);
        }
      }
      
      story.likesCount = story.likes.length;
      story.viewsCount = Math.floor(Math.random() * 50) + 10; // 10-60 views
      await story.save();
      
      console.log(`❤️  Added ${story.likesCount} likes to: ${story.title}`);
    }

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👤 Users created: ${createdUsers.length}`);
    console.log(`   📚 Stories created: ${createdStories.length}`);
    console.log(`   💬 Comments created: ${sampleComments.length}`);
    console.log('\n🚀 You can now start the server and test the demo!');
    console.log('   npm run dev');
    console.log('   Visit: http://localhost:5000/demo\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();
