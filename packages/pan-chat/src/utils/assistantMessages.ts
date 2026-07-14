const MAX_ASSISTANT_MESSAGES = 3

export function splitAssistantContent(content: string): string[] {
  const parts = content
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length <= MAX_ASSISTANT_MESSAGES) return parts

  return [
    parts[0],
    parts[1],
    parts.slice(2).join('\n'),
  ]
}

export function normalizeAssistantContents(
  messages: string[] | undefined,
  fallback: string,
): string[] {
  const normalized = messages
    ?.map((message) => message.trim())
    .filter(Boolean)

  return normalized?.length ? normalized : splitAssistantContent(fallback)
}
