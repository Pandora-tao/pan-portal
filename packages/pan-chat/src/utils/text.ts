export function normalizeMessageContent(content: string): string {
  return content.trim()
}

export function isEmptyMessage(content: string): boolean {
  return normalizeMessageContent(content).length === 0
}
