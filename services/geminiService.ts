
import { GoogleGenAI } from "@google/genai";

export const suggestExample = async (word: string, language: string): Promise<string> => {
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        return "API key not configured.";
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Provide a simple, clear example sentence for the word "${word}" in ${language}. The sentence should be appropriate for a language learner. Return only the sentence.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim().replace(/\"/g, ''); // Clean up response
        return text;

    } catch (error) {
        console.error("Error fetching example from Gemini API:", error);
        return "Could not generate an example.";
    }
};
