import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import axios from 'axios';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    username: string;
    email: string;
  };
}

interface TranslateRequest extends AuthRequest {
  body: {
    text: string;
    targetLanguage: string;
  };
}

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
}

// Google Translate REST API function using axios
const googleTranslateAPI = async (text: string, targetLang: string): Promise<string> => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google Translate API key not configured');
  }

  try {
    const response = await axios.post<GoogleTranslateResponse>(
      'https://translation.googleapis.com/language/translate/v2',
      null,
      {
        params: {
          key: apiKey,
          q: text,
          source: 'en',
          target: targetLang
        }
      }
    );

    if (response.data?.data?.translations?.[0]?.translatedText) {
      return response.data.data.translations[0].translatedText;
    } else {
      throw new Error('Invalid response from Google Translate API');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Google Translate API error:', error.response?.status, error.response?.data);
    } else {
      console.error('Google Translate API error:', error);
    }
    throw error;
  }
};

// Fallback mock translation for development/demo
const mockTranslate = async (text: string, targetLang: string): Promise<string> => {
  // Better translations with full sentence context
  const translations: Record<string, Record<string, string>> = {
    'vi': {
      // Story titles
      'My First Day at University': 'Ngày Đầu Tiên Của Tôi Tại Đại Học',
      'The Adventure of Learning English': 'Cuộc Phiêu Lưu Học Tiếng Anh',
      'A Journey to Success': 'Hành Trình Đến Thành Công',
      'Friendship and Dreams': 'Tình Bạn Và Ước Mơ',
      
      // Common story beginnings
      'Once upon a time': 'Ngày xửa ngày xưa',
      'It was a bright sunny morning': 'Đó là một buổi sáng nắng đẹp',
      'In the beginning': 'Ban đầu',
      'Long ago': 'Ngày xưa',
      
      // Common phrases
      'when I stepped into': 'khi tôi bước vào',
      'university campus': 'khuôn viên trường đại học',
      'for the first time': 'lần đầu tiên',
      'My heart was beating fast': 'Tim tôi đập rất nhanh',
      'with excitement and nervousness': 'vì hồi hộp và lo lắng',
      'was huge with': 'rất rộng lớn với',
      'deep gardens': 'những khu vườn sâu',
      'modern buildings': 'những tòa nhà hiện đại',
      'I met my roommate': 'Tôi gặp bạn cùng phòng',
      'who was very friendly': 'người rất thân thiện',
      'and helped me settle in': 'và giúp tôi ổn định',
      
      // Single words (fallback)
      'University': 'Đại Học',
      'morning': 'buổi sáng',
      'campus': 'khuôn viên',
      'first': 'đầu tiên',
      'bright': 'tươi sáng',
      'sunny': 'nắng đẹp',
      'heart': 'trái tim',
      'excitement': 'hứng thú',
      'nervousness': 'lo lắng',
      'huge': 'rộng lớn',
      'gardens': 'khu vườn',
      'modern': 'hiện đại',
      'buildings': 'tòa nhà',
      'roommate': 'bạn cùng phòng',
      'friendly': 'thân thiện',
      'helped': 'giúp đỡ',
      'settle': 'ổn định'
    },
    'zh': {
      'My First Day at University': '我在大学的第一天',
      'It was a bright sunny morning': '那是一个阳光明媚的早晨',
      'when I stepped into': '当我走进',
      'university campus': '大学校园',
      'for the first time': '第一次',
      'My heart was beating fast': '我的心跳得很快',
      'with excitement and nervousness': '兴奋和紧张',
      'University': '大学',
      'morning': '早晨',
      'campus': '校园',
      'first': '第一',
      'heart': '心'
    },
    'ja': {
      'My First Day at University': '大学での初日',
      'It was a bright sunny morning': '明るく晴れた朝でした',
      'when I stepped into': '私が足を踏み入れたとき',
      'university campus': '大学キャンパス',
      'for the first time': '初めて',
      'University': '大学',
      'morning': '朝',
      'campus': 'キャンパス',
      'first': '最初'
    }
  };

  const targetTranslations = translations[targetLang] || {};
  let translatedText = text;

  // Sort by length (longer phrases first) to avoid partial replacements
  const sortedEntries = Object.entries(targetTranslations)
    .sort(([a], [b]) => b.length - a.length);

  // Replace phrases in order of length (longest first)
  sortedEntries.forEach(([english, translated]) => {
    const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    translatedText = translatedText.replace(regex, translated);
  });

  // If minimal translation occurred, add language prefix
  const changedWords = sortedEntries.filter(([eng]) => 
    text.toLowerCase().includes(eng.toLowerCase())
  ).length;
  
  if (changedWords === 0) {
    return `[Translated to ${targetLang.toUpperCase()}] ${text}`;
  }

  return translatedText;
};

// POST /api/translate
export const translateText = asyncHandler(async (req: TranslateRequest, res: Response): Promise<void> => {
  const { text, targetLanguage } = req.body;

  if (!text || !targetLanguage) {
    res.status(400).json({
      success: false,
      message: 'Text and target language are required'
    });
    return;
  }

  try {
    let translatedText: string;
    let provider = 'mock';

    // Try Google Translate REST API first
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.log(`🌍 Using Google Translate API for: ${text.substring(0, 50)}...`);
      try {
        translatedText = await googleTranslateAPI(text, targetLanguage);
        provider = 'google';
        console.log(`✅ Google translation successful`);
      } catch (googleError) {
        console.error('Google Translate failed, falling back to mock:', googleError);
        translatedText = await mockTranslate(text, targetLanguage);
      }
    } else {
      console.log(`🎭 Using mock translation for: ${text.substring(0, 50)}...`);
      translatedText = await mockTranslate(text, targetLanguage);
    }

    res.json({
      success: true,
      translatedText,
      originalText: text,
      targetLanguage,
      provider,
      message: 'Translation completed successfully'
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation service unavailable'
    });
  }
});

export default { translateText };
