
import { GoogleGenAI, Type } from "@google/genai";
import { Note, QuizQuestion } from "../types";

// Initialize the GoogleGenAI client with the mandatory API key from the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuizFromNotes = async (bookTitle: string, notes: Note[]): Promise<QuizQuestion[]> => {
  const selectedNotes = notes.filter(n => n.isForQuiz).map(n => n.text).join('\n');
  
  if (!selectedNotes) return [];

  const prompt = `Based on the following book notes from "${bookTitle}", generate 3 multiple-choice questions for a test. 
  Each question should have 4 options and a clear correct answer.
  
  Notes:
  ${selectedNotes}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

/**
 * Fetches book information specifically using Google Search grounding 
 * to scrape/retrieve data related to Books.com.tw (博客來).
 */
export const fetchBookInfoFromBooksTW = async (query: string) => {
  const prompt = `Find the book details for the following Books.com.tw (博客來) link or search query: "${query}". 
  Provide the result strictly in JSON format with the following fields: 
  title, author, isbn, category, coverImageUrl. 
  Ensure the information is accurate as per Books.com.tw data.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
            isbn: { type: Type.STRING },
            category: { type: Type.STRING },
            coverImageUrl: { type: Type.STRING }
          },
          required: ["title", "author", "isbn", "category", "coverImageUrl"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("No data returned from AI");
  } catch (error) {
    console.error("Error fetching from Books.com.tw via AI:", error);
    throw error;
  }
};
