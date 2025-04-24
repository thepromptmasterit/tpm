import { NextResponse } from "next/server"
import * as cheerio from "cheerio"
import type { NewsItem } from "../../../lib/news/types"
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour

async function translateToItalian(text: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set')
      return text
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

    const translatedText = completion.choices[0].message.content?.trim() || text
    console.log(`Original: ${text} | Translated: ${translatedText}`)
    return translatedText
  } catch (error) {
    console.error("Error translating text:", error)
    return text
  }
}

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set in environment variables')
      return NextResponse.json({ error: 'Translation service not available' }, { status: 500 })
    }

    // Fetch the HTML content from futuretools.io/news
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
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)
    const newsItems: NewsItem[] = []

    // Aggiorniamo i selettori CSS per la nuova struttura
    $('.collection-item-6').each((_, element) => {
      try {
        // Estrai la data
        const dateElement = $(element).find(".text-block-30")
        const date = dateElement.text().trim()

        // Estrai il titolo
        const titleElement = $(element).find(".text-block-27")
        const title = titleElement.text().trim()

        // Estrai la fonte
        const sourceElement = $(element).find(".text-block-28")
        const source = sourceElement.text().trim()

        // Estrai l'URL
        const linkElement = $(element).find("a.link-block-8")
        let url = linkElement.attr("href") || "#"

        // Rimuovi i parametri UTM
        url = url.replace(/\?utm_source=.*$/, "")

        // Aggiungi la notizia solo se abbiamo almeno data e titolo
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
      console.error("No news items found in the HTML")
      return NextResponse.json({ error: "No news items found" }, { status: 404 })
    }

    // Traduci i titoli delle news
    const translatedNewsItems = await Promise.all(
      newsItems.map(async (item) => {
        const translatedTitle = await translateToItalian(item.title)
        return {
          ...item,
          title: translatedTitle
        }
      })
    )

    return NextResponse.json(translatedNewsItems)
  } catch (error) {
    console.error("Error fetching news:", error)
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 })
  }
}
