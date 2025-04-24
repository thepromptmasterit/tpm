import { Suspense } from "react"
import NewsList from "@/components/news/news-list"
import type { Metadata } from "next"
import Header from '../../components/Header'
import LoopingText from '../../components/LoopingText'

export const metadata: Metadata = {
  title: "News - ThePromptMaster",
  description: "Le ultime notizie dal mondo dell'intelligenza artificiale",
}

// Disabilita il prerendering statico
export const dynamic = 'force-dynamic'

async function getNews() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/news`, {
      next: { revalidate: 3600 }
    })
    
    if (!res.ok) {
      throw new Error('Failed to fetch news')
    }
    
    return res.json()
  } catch (error) {
    console.error('Error fetching news:', error)
    return []
  }
}

export default async function NewsPage() {
  const newsItems = await getNews()

  return (
    <>
      <Header color='dark' /> 
      <div className='headMargin'>
        <div className="strip">
          <LoopingText
            text='THE PROMPT MASTER'
            size='big'
            velocity={0.08}
            color='dark'
          />
        </div>
        <div className="strip">
          <LoopingText
            text={`L'INTELLIGENZA ARTIFICIALE COME NON LA IMMAGINAVI`}
            size='small'
            velocity={0.08}
            color='dark'
          />
        </div>
      </div>

      <div className='section-content'>
        <div className='content rich-text-block rich-text-block--newsletter'>
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 uppercase">Ultime Notizie AI</h1>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Non importa che punto hai raggiunto, queste notizie ti aiuteranno a rimanere aggiornato sull&apos;Intelligenza
            Artificiale e i suoi utilizzi.
          </p>

          <Suspense fallback={<NewsListSkeleton />}>
            <NewsList newsItems={newsItems} />
          </Suspense>
        </div>
      </div>      
    </>
  )
}

function NewsListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="bg-muted px-4 py-3">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
          </div>
          <div className="col-span-8">
            <div className="h-4 bg-muted-foreground/20 rounded w-24"></div>
          </div>
          <div className="col-span-2">
            <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-card px-4 py-3 animate-pulse">
            <div className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-2">
                <div className="h-4 bg-muted-foreground/10 rounded w-16"></div>
              </div>
              <div className="col-span-8">
                <div className="h-4 bg-muted-foreground/10 rounded w-full mb-2"></div>
                <div className="h-3 bg-muted-foreground/10 rounded w-24"></div>
              </div>
              <div className="col-span-2 flex justify-end">
                <div className="h-8 bg-muted-foreground/10 rounded w-24"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
