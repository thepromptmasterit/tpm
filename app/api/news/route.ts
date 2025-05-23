import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import type { NewsItem } from "../../../lib/news/types"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function translateToItalian(text: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set')
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Sei un traduttore professionista dall'inglese all'italiano. Traduci il testo mantenendo il tono e lo stile originale, adattandolo al contesto italiano. Non aggiungere spiegazioni o commenti, restituisci solo la traduzione."
        },
        {
          role: "user",
          content: `Traduci in italiano il seguente titolo di una news sull'intelligenza artificiale: "${text}"`
        }
      ],
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      max_tokens: 100
    })

    const translatedText = completion.choices[0].message.content?.trim()
    if (!translatedText) {
      throw new Error('Translation failed: empty response')
    }
    
    console.log(`Original: ${text} | Translated: ${translatedText}`)
    return translatedText
  } catch (error) {
    console.error("Error translating text:", error)
    throw error
  }
}

export async function GET() {
  try {
    console.log('=== API NEWS START ===')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('API Key available:', !!process.env.OPENAI_API_KEY)
    console.log('API Key length:', process.env.OPENAI_API_KEY?.length || 0)

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables')
      return NextResponse.json({ 
        error: 'Translation service not available',
        details: 'OPENAI_API_KEY is not set',
        environment: process.env.NODE_ENV
      }, { status: 500 })
    }

    // Fetch the HTML content from futuretools.io/news
    console.log('Fetching news from futuretools.io...')
    const response = await fetch("https://www.futuretools.io/news", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.8,en-US;q=0.5,en;q=0.3",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`Failed to fetch: ${response.status}`, await response.text())
      return NextResponse.json({ 
        error: 'Failed to fetch news',
        status: response.status,
        statusText: response.statusText
      }, { status: response.status })
    }

    const html = await response.text()
    console.log('HTML fetched successfully, length:', html.length)
    
    const $ = cheerio.load(html)
    const newsItems: NewsItem[] = []

    console.log('Parsing news items...')
    $('.collection-item-6').each((_, element) => {
      try {
        const dateElement = $(element).find(".text-block-30")
        const date = dateElement.text().trim()

        const titleElement = $(element).find(".text-block-27")
        const title = titleElement.text().trim()

        const sourceElement = $(element).find(".text-block-28")
        const source = sourceElement.text().trim()

        const linkElement = $(element).find("a.link-block-8")
        let url = linkElement.attr("href") || "#"
        url = url.replace(/\?utm_source=.*$/, "")

        if (date && title) {
          newsItems.push({
            date,
            title,
            source,
            url,
          })
        }
      } catch (error) {
        console.error("Error parsing news item:", error)
      }
    })

    console.log(`Found ${newsItems.length} news items`)

    if (newsItems.length === 0) {
      console.error("No news items found in the HTML")
      return NextResponse.json({ error: "No news items found" }, { status: 404 })
    }

    console.log('Starting translation process...')
    const translatedNewsItems = await Promise.all(
      newsItems.map(async (item) => {
        try {
          console.log(`Translating: ${item.title}`)
          const translatedTitle = await translateToItalian(item.title)
          console.log(`Translated: ${translatedTitle}`)
          return {
            ...item,
            title: translatedTitle
          }
        } catch (error) {
          console.error(`Error translating title: ${item.title}`, error)
          return item
        }
      })
    )

    console.log('=== API NEWS END ===')
    return NextResponse.json(translatedNewsItems)
  } catch (error) {
    console.error("Error in GET function:", error)
    return NextResponse.json({ 
      error: "Failed to fetch news",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
