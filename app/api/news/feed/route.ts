import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import type { NewsItem } from "../../../../lib/news/types"
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
    
    return translatedText
  } catch (error) {
    console.error("Error translating text:", error)
    throw error
  }
}

function parseDate(dateStr: string): Date {
  // Il formato è MM.DD.YY
  const [month, day, year] = dateStr.split('.').map(Number)
  return new Date(2000 + year, month - 1, day)
}

function isWithinLast7Days(date: Date): boolean {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= sevenDaysAgo
}

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'Translation service not available',
        details: 'OPENAI_API_KEY is not set'
      }, { status: 500 })
    }

    const response = await fetch("https://www.futuretools.io/news", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.8,en-US;q=0.5,en;q=0.3",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to fetch news',
        status: response.status,
        statusText: response.statusText
      }, { status: response.status })
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const newsItems: NewsItem[] = []

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

    if (newsItems.length === 0) {
      return NextResponse.json({ error: "No news items found" }, { status: 404 })
    }

    // Filtra le notizie degli ultimi 7 giorni
    const recentNews = newsItems.filter(item => {
      const newsDate = parseDate(item.date)
      return isWithinLast7Days(newsDate)
    })

    // Traduci i titoli delle notizie recenti
    const translatedNewsItems = await Promise.all(
      recentNews.map(async (item) => {
        try {
          const translatedTitle = await translateToItalian(item.title)
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

    // Formatta la risposta per il feed
    const feed = {
      lastUpdated: new Date().toISOString(),
      items: translatedNewsItems.map(item => ({
        date: item.date,
        title: item.title,
        source: item.source,
        url: item.url
      }))
    }

    return NextResponse.json(feed, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error("Error in GET function:", error)
    return NextResponse.json({ 
      error: "Failed to fetch news",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 