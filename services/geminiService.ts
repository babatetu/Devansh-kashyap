
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { AdStyle, AspectRatio } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (retries > 0 && isRateLimit) {
        console.log(`Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryOperation(operation, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async analyzeProduct(base64Image: string): Promise<string> {
    try {
      return await this.retryOperation(async () => {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { mimeType: "image/png", data: base64Image.split(',')[1] } },
              { text: "Identify this product. Return just the product name." }
            ]
          }
        });
        return response.text || "A product";
      }, 2, 1000);
    } catch (error) {
      console.error("Product analysis failed, using fallback:", error);
      return "A high-quality product";
    }
  }

  async researchProduct(productName: string): Promise<string> {
    try {
      return await this.retryOperation(async () => {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Summarize top 3 selling points for: ${productName}.`,
          config: { tools: [{ googleSearch: {} }] }
        });
        return response.text || "";
      }, 1, 1000);
    } catch (error) {
      console.warn("Product research failed, skipping:", error);
      return "";
    }
  }

  async generateAdStrategy(productInfo: string, style: AdStyle, isComplex: boolean = false): Promise<{ imagePrompt: string, copyAngle: string }> {
    // Default fallback
    const fallbackStrategy = { 
      imagePrompt: `A professional photo of the product in ${style} style. High quality, commercial lighting.`, 
      copyAngle: "Focus on quality and premium features." 
    };

    try {
      // Try Pro model first if complex
      if (isComplex) {
        try {
          return await this.retryOperation(async () => {
            const response = await this.ai.models.generateContent({
              model: "gemini-3.1-pro-preview",
              contents: `Create ad strategy for ${productInfo} in ${style} style. Return JSON with 'imagePrompt' and 'copyAngle'.`,
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    imagePrompt: { type: Type.STRING },
                    copyAngle: { type: Type.STRING }
                  },
                  required: ["imagePrompt", "copyAngle"]
                }
              }
            });
            return JSON.parse(response.text || '{}');
          }, 1, 1000); // 1 retry for Pro
        } catch (e) {
          console.log("Pro strategy failed, falling back to Flash...");
        }
      }

      // Fallback to Flash
      return await this.retryOperation(async () => {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Create ad strategy for ${productInfo} in ${style} style. Return JSON with 'imagePrompt' and 'copyAngle'.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                imagePrompt: { type: Type.STRING },
                copyAngle: { type: Type.STRING }
              },
              required: ["imagePrompt", "copyAngle"]
            }
          }
        });
        return JSON.parse(response.text || '{}');
      }, 2, 1000);

    } catch (error) {
      console.error("All strategy generation failed, using hardcoded fallback:", error);
      return fallbackStrategy;
    }
  }

  async generateAdCopy(productDescription: string, style: AdStyle, angle?: string) {
    const fallbackCopy = { headline: "Experience Excellence", subheadline: "The perfect choice for you.", cta: "Shop Now" };
    
    try {
      return await this.retryOperation(async () => {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Write ad copy for ${productDescription}. Style: ${style}. ${angle ? `Angle: ${angle}` : ''}. Return JSON: headline, subheadline, cta.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                cta: { type: Type.STRING },
              },
              required: ["headline", "subheadline", "cta"],
            },
          },
        });
        return JSON.parse(response.text || '{}');
      });
    } catch (e) {
      console.error("Ad copy generation failed, using fallback:", e);
      return fallbackCopy;
    }
  }

  async transformImage(base64Image: string, style: AdStyle, aspectRatio: AspectRatio, customPrompt?: string) {
    try {
      return await this.retryOperation(async () => {
        // Enhanced prompt for Nano Banana
        const prompt = `
          Transform this product image into a high-end professional advertisement.
          Style: ${style}.
          ${customPrompt ? `User Instructions: ${customPrompt}` : ''}
          
          Key Requirements:
          - Photorealistic 8k resolution
          - Professional studio lighting and composition
          - Preserve the product's core details and branding
          - Clean, commercial aesthetic suitable for high-end marketing
          - Seamless integration with the background
        `.trim();

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
              { text: prompt },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            }
          }
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        throw new Error("No image generated");
      });
    } catch (error) {
      console.error("Image generation failed:", error);
      throw error; // Rethrow to let UI handle it
    }
  }

  async transformImagePro(base64Image: string, style: AdStyle, aspectRatio: AspectRatio, customPrompt?: string) {
    try {
      // Try Pro first
      return await this.retryOperation(async () => {
        const aiPro = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        
        // Enhanced prompt for Pro model
        const prompt = `
          Create a masterpiece commercial advertisement featuring this product.
          Style Theme: ${style}.
          ${customPrompt ? `Specific Instructions: ${customPrompt}` : ''}
          
          Visual Guidelines:
          - Ultra-photorealistic, 8k UHD, highly detailed texture
          - Cinematic lighting with perfect shadows and highlights
          - Sophisticated composition following the rule of thirds
          - Luxurious and premium atmosphere
          - Ensure the product is the clear focal point
        `.trim();
        
        const response = await aiPro.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: {
            parts: [
              { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
              { text: prompt },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
              imageSize: "1K"
            }
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
      }, 1, 2000);

    } catch (error) {
      console.warn("Pro image generation failed, falling back to Standard...", error);
      // Fallback to Standard (Nano Banana)
      return this.transformImage(base64Image, style, aspectRatio, customPrompt);
    }
  }
}
