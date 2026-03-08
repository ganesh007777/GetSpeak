import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { message, history } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not set on the server' },
        { status: 500 }
      )
    }

    const client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    
    // Build messages array with history
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful AI assistant for the Get Speak chat application. You help users with questions about the app, general questions, and provide friendly conversation. Be concise but helpful. You can help with:
        - Questions about Get Speak features
        - General knowledge questions
        - Casual conversation
        - Technical support
        
        Get Speak is a chat application that connects people worldwide with features like:
        - Real-time chat with users globally
        - AI Assistant (you)
        - Random chat matching
        - Dark/Light theme support
        - Secure messaging`
      }
    ]
    
    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message
    })
    
    const response = await client.chat.completions.create({
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    })

    const answer =
      response.choices[0]?.message?.content?.trim() ||
      'Sorry, I could not generate a response.'
    
    return NextResponse.json({ response: answer })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error.message },
      { status: 500 }
    )
  }
}
