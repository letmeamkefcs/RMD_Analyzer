import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getGeminiInsight = async (analysis: AnalysisResult) => {
  if (!apiKey) {
    console.warn("API Key not found");
    return "Please configure your API_KEY to see Gemini insights.";
  }

  const prompt = `
    I have performed a pixel-by-pixel color analysis of a map image.
    
    Here is the statistical data:
    - Total Pixels in Image: ${analysis.totalPixels}
    - Valid Map Area Pixels (excluding background/borders): ${analysis.processedPixels}
    - Coverage Ratio: ${((analysis.processedPixels / analysis.totalPixels) * 100).toFixed(2)}%
    
    Color Distribution within the Map Area:
    ${analysis.categories.map(c => `- ${c.name}: ${c.count.toLocaleString()} pixels (${c.percentage.toFixed(2)}%)`).join('\n')}
    
    Based on this distribution, please provide a concise analytical summary. 
    1. What is the dominant color group and by how much?
    2. If this were a land-use map or zoning map, what might these ratios imply based on standard color coding (e.g., Yellow/Red often implies residential/commercial/urban, Green implies nature/parks, Blue implies water/institutional)?
    3. Is there a significant balance or is it heavily skewed?
    
    Provide the response in plain text, formatted nicely with headers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 } // Moderate thinking for analysis
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insight at this time.";
  }
};
