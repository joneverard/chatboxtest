interface WeatherData {
  name: string
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  conditions: string
}

declare global {
  interface Window {
    __WEATHER__?: WeatherData
  }
}

export async function fetchWeather(place: string): Promise<WeatherData | null> {
  try {
    const response = await fetch('/api/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place })
    })

    if (!response.ok) {
      console.error('Weather fetch failed:', response.status)
      return null
    }

    const weatherData = await response.json()
    
    // Store in window context as specified
    window.__WEATHER__ = weatherData
    
    return weatherData
  } catch (error) {
    console.error('Error fetching weather:', error)
    return null
  }
}

export function getCachedWeather(): WeatherData | undefined {
  return window.__WEATHER__
}