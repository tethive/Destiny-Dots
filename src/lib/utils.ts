export { cn } from "cn"

/** "Aarav Sharma" → "AS" */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/** Date `days` days before now (kept outside components so render stays pure). */
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
