import './globals.css'
import { paper, sans } from '../lib/theme'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Be+Vietnam+Pro:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: paper.cream, fontFamily: sans, fontWeight: 300, margin: 0 }}>{children}</body>
    </html>
  )
}
