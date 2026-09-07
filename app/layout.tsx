import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Round Table · Flyer Finisher",description:"Original logos, activity tags and flyer tools for Area 1–18 and RT 1–400."};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<footer className="site-credit">Developed by <a href="https://aaibuilt.com" target="_blank" rel="noopener noreferrer">aaibuilt.com</a> | <a href="tel:+917009191914">7009191914</a> | LMF Tr Sanyam Tayal</footer></body></html>;}
