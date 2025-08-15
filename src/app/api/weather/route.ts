export const runtime = 'edge'

interface WeatherResponse {
  name: string
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  conditions: string
}

export async function POST(req: Request) {
  try {
    const { place } = await req.json()
    
    if (!place) {
      return new Response(JSON.stringify({ error: 'Place is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const apiKey = process.env.OPEN_WEATHER_MAP_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Weather API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Using API key: ${apiKey.substring(0, 8)}...`)
    
    // First, get coordinates from geocoding API
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(place)}&limit=1&appid=${apiKey}`
    console.log(`Geocoding URL: ${geoUrl.replace(apiKey, 'API_KEY_HIDDEN')}`)
    
    const geoResponse = await fetch(geoUrl)
    if (!geoResponse.ok) {
      const errorText = await geoResponse.text()
      console.log(`Geocoding error response: ${errorText}`)
      throw new Error(`Geocoding API error: ${geoResponse.status} - ${errorText}`)
    }

    const geoData = await geoResponse.json()
    if (!geoData || geoData.length === 0) {
      throw new Error(`Location not found: ${place}`)
    }

    const { lat, lon, name } = geoData[0]
    console.log(`Found coordinates for ${name}: lat=${lat}, lon=${lon}`)

    // Now get weather data using coordinates
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    console.log(`Weather URL: ${weatherUrl.replace(apiKey, 'API_KEY_HIDDEN')}`)
    
    const response = await fetch(weatherUrl)
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`Weather API error response: ${errorText}`)
      throw new Error(`Weather API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    
    const weatherData: WeatherResponse = {
      name: name,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed),
      conditions: data.weather[0].main
    }

    return new Response(JSON.stringify(weatherData), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Weather API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch weather data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}