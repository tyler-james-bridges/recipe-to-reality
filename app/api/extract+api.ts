/**
 * Recipe Extraction API Route
 * Server-side recipe extraction using Claude API
 */

// Types for the request/response
interface ExtractRequest {
  url: string
  isTranscript?: boolean
  transcript?: string
}

interface ExtractedIngredient {
  name: string
  quantity: string | null
  unit: string | null
  category: string
}

interface ExtractedRecipe {
  title: string
  servings: number | null
  prepTime: string | null
  cookTime: string | null
  ingredients: ExtractedIngredient[]
  instructions: string[]
  imageURL: string | null
  sourceURL: string
  sourceType: string
}

const SYSTEM_PROMPT = `You are a recipe extraction assistant. Extract recipe information from the provided webpage content.
Return a JSON object with the following structure:
{
    "title": "Recipe Title",
    "servings": 4,
    "prepTime": "15 minutes",
    "cookTime": "30 minutes",
    "ingredients": [
        {"name": "ingredient name", "quantity": "2", "unit": "cups", "category": "produce"}
    ],
    "instructions": ["Step 1...", "Step 2..."],
    "imageURL": "https://..."
}

For ingredient categories, use one of: produce, meat, dairy, bakery, pantry, frozen, beverages, condiments, spices, other

If you cannot find a recipe in the content, return:
{"error": "No recipe found"}

Only return valid JSON, no other text.`

const TRANSCRIPT_SYSTEM_PROMPT = `You are a recipe extraction assistant specializing in cooking video transcripts.
Extract recipe information from the spoken content of a cooking video.

Return a JSON object with the following structure:
{
    "title": "Recipe Title",
    "servings": 4,
    "prepTime": "15 minutes",
    "cookTime": "30 minutes",
    "ingredients": [
        {"name": "ingredient name", "quantity": "2", "unit": "cups", "category": "produce"}
    ],
    "instructions": ["Step 1...", "Step 2..."]
}

For ingredient categories, use one of: produce, meat, dairy, bakery, pantry, frozen, beverages, condiments, spices, other

If the transcript doesn't contain a recipe, return:
{"error": "No recipe found"}

Only return valid JSON, no other text.`

export async function POST(request: Request) {
  try {
    const body: ExtractRequest = await request.json()
    const { url, isTranscript, transcript } = body

    if (!url) {
      return Response.json({ error: 'Missing required field: url' }, { status: 400 })
    }

    // Use server-side Anthropic API key
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY environment variable not set')
      return Response.json({ error: 'Server configuration error' }, { status: 500 })
    }

    let content: string
    let systemPrompt: string

    if (isTranscript && transcript) {
      content = transcript
      systemPrompt = TRANSCRIPT_SYSTEM_PROMPT
    } else {
      content = await fetchWebContent(url)
      systemPrompt = SYSTEM_PROMPT
    }

    const result = await callAnthropic(apiKey, systemPrompt, content)
    const recipe = parseRecipeJSON(result, url)
    return Response.json(recipe)
  } catch (error) {
    console.error('Extraction error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

async function fetchWebContent(urlString: string): Promise<string> {
  const response = await fetch(urlString, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch page: ${response.status}`)
  }

  const html = await response.text()

  // Try JSON-LD extraction first — structured data is cleaner and more accurate
  const jsonLdRecipe = extractJsonLd(html)
  if (jsonLdRecipe) {
    const ogMeta = extractOgMeta(html)
    return formatJsonLdForClaude(jsonLdRecipe, ogMeta)
  }

  return stripHTML(html)
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  const scriptRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const recipe = findRecipeInLd(data)
      if (recipe) return recipe
    } catch {
      // Invalid JSON, skip
    }
  }
  return null
}

function findRecipeInLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInLd(item)
      if (found) return found
    }
    return null
  }

  const obj = data as Record<string, unknown>

  // Check @graph pattern
  if (Array.isArray(obj['@graph'])) {
    return findRecipeInLd(obj['@graph'])
  }

  // Check if this object is a Recipe
  const type = obj['@type']
  if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) {
    return obj
  }

  return null
}

function extractOgMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {}
  const metaRegex = /<meta[^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*\/?>/gi
  const metaRegex2 = /<meta[^>]*content\s*=\s*["']([^"']*)["'][^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*\/?>/gi
  let m
  while ((m = metaRegex.exec(html)) !== null) {
    meta[m[1]] = m[2]
  }
  while ((m = metaRegex2.exec(html)) !== null) {
    meta[m[2]] = m[1]
  }
  return meta
}

function formatJsonLdForClaude(recipe: Record<string, unknown>, ogMeta: Record<string, string>): string {
  const lines: string[] = []

  const title = (recipe.name as string) || ogMeta['og:title'] || ''
  if (title) lines.push(`Title: ${title}`)

  if (recipe.recipeYield) lines.push(`Servings: ${Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield}`)
  if (recipe.prepTime) lines.push(`Prep Time: ${formatDuration(recipe.prepTime as string)}`)
  if (recipe.cookTime) lines.push(`Cook Time: ${formatDuration(recipe.cookTime as string)}`)

  const image = (recipe.image as string) || (Array.isArray(recipe.image) ? (recipe.image as string[])[0] : null) || ogMeta['og:image'] || ''
  if (image) {
    const imageUrl = typeof image === 'object' ? (image as Record<string, unknown>).url as string : image
    if (imageUrl) lines.push(`Image: ${imageUrl}`)
  }

  if (Array.isArray(recipe.recipeIngredient)) {
    lines.push('\nIngredients:')
    for (const ing of recipe.recipeIngredient as string[]) {
      lines.push(`- ${ing}`)
    }
  }

  if (Array.isArray(recipe.recipeInstructions)) {
    lines.push('\nInstructions:')
    let step = 1
    for (const inst of recipe.recipeInstructions as Array<string | Record<string, unknown>>) {
      if (typeof inst === 'string') {
        lines.push(`${step++}. ${inst}`)
      } else if (inst && typeof inst === 'object') {
        const text = (inst.text as string) || (inst.name as string) || ''
        if (text) lines.push(`${step++}. ${text}`)
      }
    }
  }

  return lines.join('\n')
}

function formatDuration(iso: string): string {
  if (!iso || !iso.startsWith('PT')) return iso
  const hours = iso.match(/(\d+)H/)?.[1]
  const minutes = iso.match(/(\d+)M/)?.[1]
  const parts: string[] = []
  if (hours) parts.push(`${hours} hour${hours === '1' ? '' : 's'}`)
  if (minutes) parts.push(`${minutes} minute${minutes === '1' ? '' : 's'}`)
  return parts.join(' ') || iso
}

function stripHTML(html: string): string {
  let result = html
  result = result.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  result = result.replace(/<[^>]+>/g, ' ')
  result = result.replace(/\s+/g, ' ')
  result = result
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  if (result.length > 15000) result = result.substring(0, 15000)
  return result.trim()
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  content: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Extract the recipe from this content:\n\n${content}` }],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    if (response.status === 401) throw new Error('Invalid API key')
    if (response.status === 429) throw new Error('Rate limited. Try again later.')
    throw new Error(error.error?.message || `HTTP ${response.status}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find((block: Record<string, unknown>) => block.type === 'text')
  return textBlock?.text || ''
}

function parseRecipeJSON(jsonString: string, urlString: string): ExtractedRecipe {
  let cleanJSON = jsonString
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
  if (jsonMatch) cleanJSON = jsonMatch[0]

  const json = JSON.parse(cleanJSON)
  if (json.error) throw new Error(json.error)

  const url = new URL(urlString)
  const sourceType = determineSourceType(url)

  const ingredients = (json.ingredients || []).map((item: Record<string, unknown>) => ({
    name: item.name as string,
    quantity: (item.quantity as string) || null,
    unit: (item.unit as string) || null,
    category: mapCategory(item.category as string),
  }))

  return {
    title: json.title || 'Untitled Recipe',
    servings: json.servings || null,
    prepTime: json.prepTime || null,
    cookTime: json.cookTime || null,
    ingredients,
    instructions: json.instructions || [],
    imageURL: json.imageURL || null,
    sourceURL: urlString,
    sourceType,
  }
}

function determineSourceType(url: URL): string {
  const host = url.hostname.toLowerCase()
  if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube'
  if (host.includes('tiktok.com')) return 'tiktok'
  if (host.includes('instagram.com')) return 'instagram'
  return 'url'
}

function mapCategory(category?: string): string {
  switch (category?.toLowerCase()) {
    case 'produce':
      return 'Produce'
    case 'meat':
    case 'meat & seafood':
      return 'Meat & Seafood'
    case 'dairy':
    case 'dairy & eggs':
      return 'Dairy & Eggs'
    case 'bakery':
      return 'Bakery'
    case 'pantry':
      return 'Pantry'
    case 'frozen':
      return 'Frozen'
    case 'beverages':
      return 'Beverages'
    case 'condiments':
    case 'condiments & sauces':
      return 'Condiments & Sauces'
    case 'spices':
    case 'spices & seasonings':
      return 'Spices & Seasonings'
    default:
      return 'Other'
  }
}
