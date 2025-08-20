'use client'
import { useState, useRef, useEffect } from 'react'
import { fetchWeather, getCachedWeather } from '@/lib/weather'

interface OnboardingData {
  favoriteCountry: string
  favoriteContinent: string
  favoriteDestination: string
}

export default function Home() {
  const [messages, setMessages] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [favoritePlace, setFavoritePlace] = useState('')
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const endRef = useRef<HTMLDivElement>(null)

  const onboardingQuestions = [
    {
      question: "What is your favorite country?",
      placeholder: "e.g., Japan, France, United States..."
    },
    {
      question: "What is your favorite continent?",
      placeholder: "e.g., Asia, Europe, North America..."
    },
    {
      question: "What is your favorite destination?",
      placeholder: "e.g., Tokyo, Paris, New York..."
    }
  ]

  useEffect(() => { endRef.current?.scrollIntoView() }, [messages])

  function handleAnswerChange(value: string) {
    const newAnswers = [...answers]
    newAnswers[currentQuestion] = value
    setAnswers(newAnswers)
  }

  function nextQuestion() {
    if (currentQuestion < onboardingQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      completeOnboarding()
    }
  }

  function prevQuestion() {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  async function completeOnboarding() {
    const data: OnboardingData = {
      favoriteCountry: answers[0],
      favoriteContinent: answers[1],
      favoriteDestination: answers[2]
    }
    
    setOnboardingData(data)
    setFavoritePlace(answers[2]) // Use the destination for weather
    setIsOnboarded(true)
    
    // Fetch weather for favorite destination
    if (answers[2].trim()) {
      await fetchWeather(answers[2].trim())
    }
  }

  async function send() {
    if (!input.trim()) return
    const user = input.trim()
    setMessages(prev => [...prev, user])
    setInput('')

    const weather = getCachedWeather()
    const res = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: user, weather, preferences: onboardingData })
    })

    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let ai = ''
    setMessages(prev => [...prev, ''])
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      ai += decoder.decode(value)
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = ai
        return copy
      })
    }
  }

  async function updateWeather() {
    if (!favoritePlace.trim()) return
    await fetchWeather(favoritePlace.trim())
  }

  if (!isOnboarded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-4">Welcome! Let's get started</h2>
          <div className="mb-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Question {currentQuestion + 1} of {onboardingQuestions.length}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${((currentQuestion + 1) / onboardingQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg mb-3">{onboardingQuestions[currentQuestion].question}</h3>
            <input
              value={answers[currentQuestion]}
              onChange={e => handleAnswerChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && answers[currentQuestion].trim() && nextQuestion()}
              className="w-full rounded-md border px-3 py-2 bg-transparent outline-none"
              placeholder={onboardingQuestions[currentQuestion].placeholder}
            />
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              className="px-4 py-2 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={nextQuestion}
              disabled={!answers[currentQuestion].trim()}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              {currentQuestion === onboardingQuestions.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-6">
      <div className="w-80 h-96 flex flex-col rounded-lg shadow-lg border bg-white dark:bg-gray-900">
        <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[75%] break-words ${i % 2 === 0 ? 'self-end bg-blue-600 text-white' : 'self-start bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-50'} rounded-md px-3 py-1`}
            >
              {m}
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <div className="p-3 flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1 rounded-md border px-2 py-1 text-sm bg-transparent outline-none"
            placeholder="Type a message"
          />
          <button
            onClick={send}
            className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}