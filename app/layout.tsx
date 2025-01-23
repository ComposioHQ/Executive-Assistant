import "./globals.css"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: 'Executive Assistant',
  description: 'Your personal Executive Assistant with Gmail integration'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

