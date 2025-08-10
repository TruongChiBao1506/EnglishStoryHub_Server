import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
require('dotenv').config();

interface AuthRequest extends Request {
  user?: any;
}

interface AIFeedback {
  corrections: Array<{
    original: string;
    corrected: string;
    explanation: string;
    type: 'grammar' | 'spelling' | 'vocabulary' | 'style';
  }>;
  overallScore: number;
  suggestions: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Gemini API configuration
const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Real Gemini AI service using fetch API
class GeminiAIService {
  static async generateStoryStarter(prompt: string, userLevel: string): Promise<string> {
    try {
      const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
      
      const body = {
        contents: [
          { 
            parts: [{ 
              text: `You are an English learning assistant. Generate a story starter based on the given prompt and user level.
        
User Level: ${userLevel}
Prompt: ${prompt}

Instructions:
- For beginner: Use simple vocabulary, short sentences, present tense
- For intermediate: Use varied vocabulary, moderate complexity, mix tenses
- For advanced: Use sophisticated vocabulary, complex sentences, rich descriptions

Generate a 2-3 sentence story starter that helps students begin writing about the topic.`
            }] 
          }
        ]
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY || ''
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }

      throw new Error('Invalid response format');
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return `Let me share a story about ${prompt}. This is something that many people can relate to...`;
    }
  }

  static async checkStoryContent(content: string): Promise<AIFeedback> {
    try {
      const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
      
      const body = {
        contents: [
          { 
            parts: [{ 
              text: `You are an English grammar and writing assistant. Analyze the following text and provide feedback.

Text to analyze: "${content}"

Please provide feedback in this exact JSON format:
{
  "corrections": [
    {
      "original": "incorrect text",
      "corrected": "correct text", 
      "explanation": "explanation of the error",
      "type": "grammar"
    }
  ],
  "overallScore": 85,
  "suggestions": [
    "suggestion 1",
    "suggestion 2", 
    "suggestion 3"
  ],
  "difficulty": "beginner"
}

Analyze grammar, spelling, vocabulary usage, and writing style. Give constructive feedback to help improve English learning.`
            }] 
          }
        ]
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY || ''
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }
      
      // Fallback response
      return {
        corrections: [],
        overallScore: 80,
        suggestions: [
          'Good effort! Keep practicing your English writing.',
          'Try to use more descriptive words.',
          'Consider varying your sentence structure.'
        ],
        difficulty: 'intermediate' as const
      };
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return {
        corrections: [],
        overallScore: 75,
        suggestions: ['Keep practicing! Your writing shows good effort.'],
        difficulty: 'beginner' as const
      };
    }
  }

  static async generateStoryPrompts(userLevel: string, topic?: string): Promise<string[]> {
    try {
      const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
      
      const body = {
        contents: [
          { 
            parts: [{ 
              text: `Generate 5 creative writing prompts for English language learners.

User Level: ${userLevel}
Topic: ${topic || 'any topic'}

Instructions:
- For beginner: Simple prompts about daily life, family, hobbies
- For intermediate: Prompts about experiences, opinions, hypothetical situations  
- For advanced: Complex prompts about abstract concepts, social issues, creative scenarios

${topic ? `Focus prompts around the topic: ${topic}` : ''}

Return exactly 5 prompts, one per line, starting each with "- ".`
            }] 
          }
        ]
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY || ''
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        
        const prompts = text.split('\n')
          .filter((line: string) => line.trim().startsWith('-'))
          .map((line: string) => line.replace(/^-\s*/, '').trim())
          .slice(0, 5);
        
        return prompts.length > 0 ? prompts : [
          'Write about your daily routine',
          'Describe your favorite place', 
          'Tell a story about friendship',
          'Write about your dreams for the future',
          'Describe a memorable experience'
        ];
      }
      
      // Return fallback if no valid response
      return [
        'Write about your daily routine',
        'Describe your favorite place', 
        'Tell a story about friendship',
        'Write about your dreams for the future',
        'Describe a memorable experience'
      ];
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      const fallbackPrompts = {
        beginner: [
          'Write about your daily routine at school or work',
          'Describe your favorite food and why you like it', 
          'Tell about your family members',
          'Write about your hobbies',
          'Describe your hometown'
        ],
        intermediate: [
          'Write about a memorable travel experience',
          'Describe a challenging situation you overcame',
          'Tell about an important decision you made',
          'Write about your future goals',
          'Describe a person who influenced you'
        ],
        advanced: [
          'Explore the impact of technology on society',
          'Discuss the importance of environmental protection',
          'Analyze the role of education in personal development',
          'Examine the concept of cultural identity',
          'Evaluate the effects of globalization'
        ]
      };
      
      return fallbackPrompts[userLevel as keyof typeof fallbackPrompts] || fallbackPrompts.beginner;
    }
  }

  static async suggestVocabulary(story: string, userLevel: string) {
    try {
      const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
      
      const body = {
        contents: [
          { 
            parts: [{ 
              text: `Analyze this text and suggest vocabulary improvements for an English learner.

Text: "${story}"
User Level: ${userLevel}

Suggest 3-5 vocabulary words that would improve this text, appropriate for the user's level.

Return in this exact JSON format:
[
  {
    "word": "vocabulary word",
    "definition": "clear definition", 
    "example": "example sentence using the word"
  }
]

Choose words that:
- Are appropriate for ${userLevel} level
- Would enhance the original text
- Are useful for English learning`
            }] 
          }
        ]
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": API_KEY || ''
        },
        body: JSON.stringify(body)
      });

      const data = await response.json() as any;
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        
        try {
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
        }
      }
      
      // Fallback vocabulary by level
      const fallbackVocabulary = {
        beginner: [
          { word: 'interesting', definition: 'arousing curiosity', example: 'The book was very interesting.' },
          { word: 'beautiful', definition: 'pleasing to look at', example: 'The sunset was beautiful.' },
          { word: 'important', definition: 'of great significance', example: 'Education is very important.' }
        ],
        intermediate: [
          { word: 'fascinating', definition: 'extremely interesting', example: 'The documentary was fascinating.' },
          { word: 'remarkable', definition: 'worthy of attention', example: 'She made remarkable progress.' },
          { word: 'significant', definition: 'sufficiently great or important', example: 'This is a significant achievement.' }
        ],
        advanced: [
          { word: 'profound', definition: 'having deep meaning', example: 'His words had a profound impact.' },
          { word: 'compelling', definition: 'evoking interest or attention', example: 'She made a compelling argument.' },
          { word: 'nuanced', definition: 'characterized by subtle distinctions', example: 'His analysis was nuanced and thoughtful.' }
        ]
      };
      
      return fallbackVocabulary[userLevel as keyof typeof fallbackVocabulary] || fallbackVocabulary.beginner;
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return [
        { word: 'enhance', definition: 'intensify, increase, or further improve', example: 'Reading will enhance your vocabulary.' },
        { word: 'express', definition: 'convey thoughts or feelings', example: 'She can express herself clearly in English.' },
        { word: 'develop', definition: 'grow or come into existence gradually', example: 'Practice helps develop writing skills.' }
      ];
    }
  }
}

// AI Controllers
export const generateStoryStarter = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { prompt, userLevel = 'beginner' } = req.body;

  if (!prompt) {
    res.status(400).json({
      success: false,
      message: 'Prompt is required'
    });
    return;
  }

  try {
    const starter = await GeminiAIService.generateStoryStarter(prompt, userLevel);
    
    res.status(200).json({
      success: true,
      data: starter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate story starter'
    });
  }
});

export const checkStoryContent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { content } = req.body;

  if (!content) {
    res.status(400).json({
      success: false,
      message: 'Story content is required'
    });
    return;
  }

  try {
    const feedback = await GeminiAIService.checkStoryContent(content);
    
    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check story content'
    });
  }
});

export const generateStoryPrompts = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { userLevel = 'beginner', topic } = req.query;

  try {
    const prompts = await GeminiAIService.generateStoryPrompts(userLevel as string, topic as string);
    
    res.status(200).json({
      success: true,
      data: prompts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate story prompts'
    });
  }
});

export const suggestVocabulary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { story, userLevel = 'beginner' } = req.body;

  if (!story) {
    res.status(400).json({
      success: false,
      message: 'Story content is required'
    });
    return;
  }

  try {
    const vocabulary = await GeminiAIService.suggestVocabulary(story, userLevel);
    
    res.status(200).json({
      success: true,
      data: vocabulary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to suggest vocabulary'
    });
  }
});

// Test endpoint
export const testGeminiConnection = asyncHandler(async (_req: AuthRequest, res: Response) => {
  try {
    console.log('🧪 Testing Gemini connection...');
    console.log('🔑 API Key exists:', !!API_KEY);
    
    const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
    
    const body = {
      contents: [
        { parts: [{ text: "Say hello in English" }] }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": API_KEY || ''
      },
      body: JSON.stringify(body)
    });

    const data = await response.json() as any;
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      res.status(200).json({
        success: true,
        message: 'Gemini AI is working!',
        data: data.candidates[0].content.parts[0].text,
        apiKey: API_KEY ? 'Present' : 'Missing'
      });
    } else {
      throw new Error('Invalid response format');
    }
    
  } catch (error: any) {
    console.error('❌ Gemini test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Gemini AI connection failed',
      error: error.message || error,
      apiKey: API_KEY ? 'Present' : 'Missing'
    });
  }
});