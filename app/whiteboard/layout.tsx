import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CustomProvider from './redux/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'make real starter',
	description: 'draw a website and make it real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}><CustomProvider>{children}</CustomProvider></body>
		</html>
	)
}
