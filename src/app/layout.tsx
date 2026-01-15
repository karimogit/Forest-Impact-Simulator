import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://forest-impact-simulator.vercel.app'),
  title: 'Forest Impact Simulator - Analyze the Impact of Forest Planting',
  description: 'Simulate the real-world impact of forests using live soil, climate, and biodiversity data. Plan tree planting projects with scientific accuracy and visualize carbon sequestration, biodiversity impact, and environmental benefits.',
  authors: [{ name: 'Karim Osman' }],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Forest Impact Simulator - Analyze the Impact of Forest Planting',
    description: 'Simulate the real-world impact of forests using live soil, climate, and biodiversity data. Plan tree planting projects with scientific accuracy and visualize carbon sequestration, biodiversity impact, and environmental benefits.',
    url: '/',
    siteName: 'Forest Impact Simulator',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Forest Impact Simulator - Interactive map showing forest planting simulation with environmental impact metrics',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Forest Impact Simulator - Analyze the Impact of Forest Planting',
    description: 'Simulate the real-world impact of forests using live soil, climate, and biodiversity data. Plan tree planting projects with scientific accuracy.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Forest Impact Simulator",
              "description": "Simulate the real-world impact of forests using live soil, climate, and biodiversity data. Plan tree planting projects with scientific accuracy and visualize carbon sequestration, biodiversity impact, and environmental benefits.",
              "url": "https://forest-impact-simulator.vercel.app",
              "applicationCategory": "EnvironmentalApplication",
              "operatingSystem": "Web Browser",
              "author": {
                "@type": "Person",
                "name": "Karim Osman",
                "url": "https://kar.im"
              },
              "creator": {
                "@type": "Person",
                "name": "Karim Osman",
                "url": "https://kar.im"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Real-time environmental data",
                "80 tree species across 7 climate zones",
                "Climate prediction modeling",
                "Carbon sequestration analysis",
                "Biodiversity impact assessment",
                "Comprehensive ecosystem benefits analysis",
                "Export results in multiple formats"
              ],
              "screenshot": "https://forest-impact-simulator.vercel.app/og-image.png",
              "softwareVersion": "1.0.0"
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}
