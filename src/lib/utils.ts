import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { createElement, ReactNode } from "react"
import { CitationBadge } from "@/components/pdf/shared/CitationBadge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseCitations(text: string): ReactNode[] {
  const regex = /\[(\d+)페이지\]/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Add unmatched text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add CitationBadge for the matched pattern
    const pageNumber = parseInt(match[1], 10)
    parts.push(createElement(CitationBadge, { page: pageNumber }))

    lastIndex = match.index + match[0].length
  }

  // Add remaining unmatched text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
