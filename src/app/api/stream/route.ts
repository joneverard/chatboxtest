import OpenAI from 'openai'

export const runtime = 'edge'

interface WeatherData {
  name: string
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  conditions: string
}

interface OnboardingData {
  favoriteDestination: string
  travelInterests: string
  informationStyle: string
}

interface RequestBody {
  message: string
  weather?: WeatherData
  preferences?: OnboardingData
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { message, weather, preferences } = await req.json() as RequestBody
    
    let systemContent = 'You are a helpful geography and travel assistant.'
    
    // Add preferences context if available
    if (preferences) {
      systemContent += `\n\nUSER_PREFERENCES:\n- Favorite destination: ${preferences.favoriteDestination}\n- Travel interests: ${preferences.travelInterests}\n- Information style preference: ${preferences.informationStyle}`
    }

    // Add weather context if available
    if (weather) {
      systemContent += `\n\nWEATHER_CONTEXT:\n${weather.name}, temp=${weather.temp}C, feels_like=${weather.feelsLike}C, humidity=${weather.humidity}%, wind=${weather.wind} m/s, ${weather.conditions.toLowerCase()}`
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemContent
      }
    ]

    messages.push({
      role: 'user',
      content: message
    })

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      stream: true,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    return new Response('Error processing request', { status: 500 })
  }
}