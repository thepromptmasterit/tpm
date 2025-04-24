import type { NewsItem } from "./types"
import { isWithinLastDays } from "./utils"

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    // Se siamo in fase di build, restituiamo un array vuoto
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return []
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const response = await fetch(`${baseUrl}/api/news`, {
      next: { revalidate: 3600 }, // Revalidate every hour
      cache: 'no-store' // Disabilita la cache durante il build
    })

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const newsItems: NewsItem[] = await response.json()

    // Filtra per mostrare solo le notizie degli ultimi 7 giorni
    return newsItems.filter((item) => isWithinLastDays(item.date, 7))
  } catch (error) {
    console.error("Error fetching news:", error)
    return []
  }
}
