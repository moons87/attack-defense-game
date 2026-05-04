import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Атака и Защита - Интерактивная игра',
  description: 'Игра для уроков кибербезопасности',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
