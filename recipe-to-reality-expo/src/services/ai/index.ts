/**
 * AI Provider Factory
 * Ported from AIProvider.swift
 */

import * as SecureStore from 'expo-secure-store';
import { AIProviderType, ExtractedRecipe, IngredientCategory, SourceType } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';

// Secure storage keys
const AI_API_KEY_PREFIX = 'ai_api_key_';

// AI Provider interface
export interface AIProvider {
  name: string;
  extractRecipe(content: string, url: URL): Promise<ExtractedRecipe>;
  extractRecipeFromTranscript(transcript: string, url: URL): Promise<ExtractedRecipe>;
}

// Prompts
const SYSTEM_PROMPT = `You are a recipe extraction assistant. Extract recipe information from the provided webpage content.
Return a JSON object with the following structure:
{
    "title": "Recipe Title",
    "servings": 4,
    "prepTime": "15 minutes",
    "cookTime": "30 minutes",
    "ingredients": [
        {"name": "ingredient name", "quantity": "2", "unit": "cups", "category": "produce"},
        ...
    ],
    "instructions": ["Step 1...", "Step 2...", ...],
    "imageURL": "https://..." (if found)
}

For ingredient categories, use one of: produce, meat, dairy, bakery, pantry, frozen, beverages, condiments, spices, other

If you cannot find a recipe in the content, return:
{"error": "No recipe found"}

Only return valid JSON, no other text.`;

const TRANSCRIPT_SYSTEM_PROMPT = `You are a recipe extraction assistant specializing in cooking video transcripts.
Extract recipe information from the spoken content of a cooking video.

The transcript may contain:
- Casual spoken language and filler words
- Approximate measurements ("a good handful", "about two cups")
- Steps described conversationally rather than formally
- Comments, tips, and personal stories mixed with recipe instructions

Your job is to:
1. Identify all ingredients mentioned, inferring reasonable quantities if only approximate amounts are given
2. Extract clear step-by-step instructions from the conversational content
3. Infer prep time and cook time from context if mentioned
4. Create a descriptive title if one isn't explicitly stated

Return a JSON object with the following structure:
{
    "title": "Recipe Title",
    "servings": 4,
    "prepTime": "15 minutes",
    "cookTime": "30 minutes",
    "ingredients": [
        {"name": "ingredient name", "quantity": "2", "unit": "cups", "category": "produce"},
        ...
    ],
    "instructions": ["Step 1...", "Step 2...", ...]
}

For ingredient categories, use one of: produce, meat, dairy, bakery, pantry, frozen, beverages, condiments, spices, other

Convert casual measurements to standard when possible:
- "a pinch" → quantity: "1", unit: "pinch"
- "a handful" → estimate cups or grams
- "some" or "a bit" → use reasonable default amounts

If the transcript doesn't contain a recipe, return:
{"error": "No recipe found"}

Only return valid JSON, no other text.`;

/**
 * Get the current AI provider based on settings
 */
export async function getAIProvider(): Promise<AIProvider> {
  const providerType = useSettingsStore.getState().aiProvider;
  const apiKey = await getAPIKey(providerType);

  if (!apiKey) {
    throw new Error(`No API key configured for ${providerType}. Please add your API key in Settings.`);
  }

  switch (providerType) {
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'google':
      return new GoogleProvider(apiKey);
    default:
      throw new Error(`Unknown AI provider: ${providerType}`);
  }
}

/**
 * Get stored API key for a provider
 */
export async function getAPIKey(provider: AIProviderType): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(`${AI_API_KEY_PREFIX}${provider}`);
  } catch {
    return null;
  }
}

/**
 * Save API key for a provider
 */
export async function saveAPIKey(provider: AIProviderType, apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(`${AI_API_KEY_PREFIX}${provider}`, apiKey);
}

/**
 * Delete API key for a provider
 */
export async function deleteAPIKey(provider: AIProviderType): Promise<void> {
  await SecureStore.deleteItemAsync(`${AI_API_KEY_PREFIX}${provider}`);
}

/**
 * Check if API key exists for a provider
 */
export async function hasAPIKey(provider: AIProviderType): Promise<boolean> {
  const key = await getAPIKey(provider);
  return key !== null && key.length > 0;
}

// Helper functions
function determineSourceType(url: URL): SourceType {
  const host = url.hostname.toLowerCase();
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
  if (host.includes('tiktok.com')) return 'tiktok';
  if (host.includes('instagram.com')) return 'instagram';
  return 'url';
}

function mapCategory(category?: string): IngredientCategory {
  switch (category?.toLowerCase()) {
    case 'produce': return 'Produce';
    case 'meat':
    case 'meat & seafood': return 'Meat & Seafood';
    case 'dairy':
    case 'dairy & eggs': return 'Dairy & Eggs';
    case 'bakery': return 'Bakery';
    case 'pantry': return 'Pantry';
    case 'frozen': return 'Frozen';
    case 'beverages': return 'Beverages';
    case 'condiments':
    case 'condiments & sauces': return 'Condiments & Sauces';
    case 'spices':
    case 'spices & seasonings': return 'Spices & Seasonings';
    default: return 'Other';
  }
}

function parseRecipeJSON(jsonString: string, url: URL): ExtractedRecipe {
  // Extract JSON from potential markdown code blocks
  let cleanJSON = jsonString;
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanJSON = jsonMatch[0];
  }

  const json = JSON.parse(cleanJSON);

  if (json.error) {
    throw new Error(json.error);
  }

  const ingredients = (json.ingredients || []).map((item: Record<string, unknown>) => ({
    name: item.name as string,
    quantity: item.quantity as string | null,
    unit: item.unit as string | null,
    category: mapCategory(item.category as string),
  }));

  return {
    title: json.title || 'Untitled Recipe',
    servings: json.servings || null,
    prepTime: json.prepTime || null,
    cookTime: json.cookTime || null,
    ingredients,
    instructions: json.instructions || [],
    imageURL: json.imageURL || null,
    sourceURL: url.toString(),
    sourceType: determineSourceType(url),
  };
}

// OpenAI Provider
class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractRecipe(content: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(SYSTEM_PROMPT, `Extract the recipe from this webpage content:\n\n${content}`, url);
  }

  async extractRecipeFromTranscript(transcript: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(TRANSCRIPT_SYSTEM_PROMPT, `Extract the recipe from this cooking video transcript:\n\n${transcript}`, url);
  }

  private async makeRequest(systemPrompt: string, userPrompt: string, url: URL): Promise<ExtractedRecipe> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited. Try again later.');
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('No response from AI');

    return parseRecipeJSON(content, url);
  }
}

// Anthropic Provider
class AnthropicProvider implements AIProvider {
  name = 'Anthropic';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractRecipe(content: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(SYSTEM_PROMPT, `Extract the recipe from this webpage content:\n\n${content}`, url);
  }

  async extractRecipeFromTranscript(transcript: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(TRANSCRIPT_SYSTEM_PROMPT, `Extract the recipe from this cooking video transcript:\n\n${transcript}`, url);
  }

  private async makeRequest(systemPrompt: string, userPrompt: string, url: URL): Promise<ExtractedRecipe> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited. Try again later.');
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: Record<string, unknown>) => block.type === 'text');
    const content = textBlock?.text;
    if (!content) throw new Error('No response from AI');

    return parseRecipeJSON(content, url);
  }
}

// Google Provider
class GoogleProvider implements AIProvider {
  name = 'Google';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractRecipe(content: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(SYSTEM_PROMPT, `Extract the recipe from this webpage content:\n\n${content}`, url);
  }

  async extractRecipeFromTranscript(transcript: string, url: URL): Promise<ExtractedRecipe> {
    return this.makeRequest(TRANSCRIPT_SYSTEM_PROMPT, `Extract the recipe from this cooking video transcript:\n\n${transcript}`, url);
  }

  private async makeRequest(systemPrompt: string, userPrompt: string, url: URL): Promise<ExtractedRecipe> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) throw new Error('Invalid API key');
      if (response.status === 429) throw new Error('Rate limited. Try again later.');
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No response from AI');

    return parseRecipeJSON(content, url);
  }
}
