import { NextResponse } from "next/server"
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    const isApiKeyAvailable = !!apiKey
    const apiKeyLength = apiKey?.length || 0
    const environment = process.env.NODE_ENV

    return NextResponse.json({
      isApiKeyAvailable,
      apiKeyLength,
      environment,
      message: isApiKeyAvailable ? 'API key is available' : 'API key is not available'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 