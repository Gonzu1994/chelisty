import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Chelisty',
  description: 'MVP checklist app with Google Sheets dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="container">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Chelisty</h1>
            <nav className="text-sm">
              <a className="mr-4" href="/">Strona główna</a>
              <a className="mr-4" href="/dashboard">Dashboard</a>
              <a className="" href="/login">Wyloguj</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
