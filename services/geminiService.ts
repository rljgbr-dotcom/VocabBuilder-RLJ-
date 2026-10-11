
import { GoogleGenAI } from "@google/genai";
import { ProcessedPassage } from "../types";

export const suggestExample = async (word: string, language: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        console.error("API_KEY not configured.");
        return "API key not configured. Add it in Settings.";
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey });
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

export const extractTextFromFile = async (base64Data: string, mimeType: string, apiKey: string): Promise<string> => {
    if (!apiKey) {
        throw new Error("API key not configured. Add it in Settings.");
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: "Extract all the Swedish text from this document. Preserve the original formatting (paragraphs) as much as possible. Return ONLY the extracted Swedish text, without any additional commentary." },
                        { inlineData: { data: base64Data, mimeType } }
                    ]
                }
            ]
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error extracting text with Gemini:", error);
        throw new Error("Could not extract text from the file.");
    }
};

export const processFullReadingPassage = async (text: string, apiKey: string): Promise<ProcessedPassage> => {
    if (!apiKey) {
        throw new Error("API key not configured. Add it in Settings.");
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
You are an expert Swedish-to-English translator and linguist. Analyze the following Swedish text.
Your task is to break it down into sentences, and for each sentence, break it down into words.
Provide literal and idiomatic English translations for every sentence.
For every word, provide its literal translation, idiomatic meaning in the context of the sentence, and note any dependencies (e.g., if a word is part of a phrasal verb like 'tycker om', the dependencies for 'tycker' should include 'om', and vice versa).

You MUST return the output strictly as a JSON object matching this TypeScript interface:

interface ProcessedWord {
  swedish: string; // The exact word as it appears in the text, preserving any attached punctuation EXACTLY (e.g. 'hej,' or 'morgon.'). DO NOT STRIP PUNCTUATION.
  literal: string; // Literal English translation
  idiomatic: string; // Meaning in this specific context
  dependencies: string[]; // Exact Swedish words in the same sentence that change this word's meaning (e.g., particles, prepositions). Empty array if none.
}

interface ProcessedSentence {
  swedish: string; // The full Swedish sentence
  literal: string; // Literal translation of the sentence
  idiomatic: string; // Natural, idiomatic translation of the sentence
  words: ProcessedWord[];
}

interface ProcessedPassage {
  sentences: ProcessedSentence[];
}

Here is the Swedish text:
"""
${text}
"""
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        let jsonText = response.text.trim();
        // Sometimes the model might wrap in markdown even with JSON mime type
        if (jsonText.startsWith('\`\`\`json')) {
            jsonText = jsonText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
        }

        const parsed: ProcessedPassage = JSON.parse(jsonText);
        return parsed;
    } catch (error) {
        console.error("Error processing passage with Gemini:", error);
        throw new Error("Could not process the reading passage.");
    }
};
