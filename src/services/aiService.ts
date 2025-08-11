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

export class AIService {
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
        const responseText = data.candidates[0].content.parts[0].text;
        try {
          return JSON.parse(responseText);
        } catch {
          // If can't parse JSON, return structured fallback
          return this.createFallbackFeedback();
        }
      }
      
      return this.createFallbackFeedback();
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.createFallbackFeedback();
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
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Parse prompts from response
        const prompts = responseText
          .split('\n')
          .filter((line: string) => line.trim().startsWith('- '))
          .map((line: string) => line.replace(/^- /, '').trim())
          .slice(0, 5);
          
        if (prompts.length > 0) {
          return prompts;
        }
      }
      
      return this.getFallbackPrompts(userLevel);
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.getFallbackPrompts(userLevel);
    }
  }

  static async suggestVocabulary(story: string, userLevel: string) {
    try {
      const url = `${BASE_URL}/gemini-2.0-flash:generateContent`;
      
      const body = {
        contents: [
          { 
            parts: [{ 
              text: `Analyze this story and suggest vocabulary improvements for a ${userLevel} English learner:

"${story}"

Provide 5 vocabulary suggestions with:
1. Original word/phrase from the story
2. Improved alternative
3. Brief explanation
4. Example sentence

Format as JSON array.`
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
        const responseText = data.candidates[0].content.parts[0].text;
        try {
          return JSON.parse(responseText);
        } catch {
          return this.getFallbackVocabulary();
        }
      }
      
      return this.getFallbackVocabulary();
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      return this.getFallbackVocabulary();
    }
  }

  static async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
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
        const responseText = data.candidates[0].content.parts[0].text;
        return {
          success: true,
          message: 'Gemini AI connection successful! 🎉',
          data: {
            response: responseText,
            apiKey: API_KEY ? 'Present' : 'Missing'
          }
        };
      } else {
        return {
          success: false,
          message: 'Gemini AI returned unexpected response format',
          data: { rawResponse: data, apiKey: API_KEY ? 'Present' : 'Missing' }
        };
      }
      
    } catch (error: any) {
      console.error('❌ Gemini test failed:', error);
      return {
        success: false,
        message: 'Gemini AI connection failed',
        data: {
          error: error.message || error,
          apiKey: API_KEY ? 'Present' : 'Missing'
        }
      };
    }
  }

  // Helper methods
  private static createFallbackFeedback(): AIFeedback {
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
  }

  private static getFallbackPrompts(userLevel: string): string[] {
    const prompts = {
      beginner: [
        'Write about your daily routine',
        'Describe your favorite place', 
        'Tell a story about friendship',
        'Write about your family',
        'Describe your hobby'
      ],
      intermediate: [
        'Write about a challenge you overcame',
        'Describe your dreams for the future',
        'Tell about a memorable experience',
        'Write about cultural differences',
        'Describe an important decision you made'
      ],
      advanced: [
        'Analyze the impact of technology on society',
        'Write about environmental challenges',
        'Explore the concept of success',
        'Discuss the role of education in personal growth',
        'Examine the balance between tradition and progress'
      ]
    };

    return prompts[userLevel as keyof typeof prompts] || prompts.beginner;
  }

  private static getFallbackVocabulary() {
    return [
      {
        original: "good",
        improved: "excellent",
        explanation: "More specific and impactful",
        example: "The performance was excellent."
      },
      {
        original: "said",
        improved: "explained",
        explanation: "More descriptive dialogue tag",
        example: "She explained the concept clearly."
      }
    ];
  }
}
