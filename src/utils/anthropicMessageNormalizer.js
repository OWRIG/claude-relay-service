function toContentBlocks(content) {
  if (Array.isArray(content)) {
    return content.filter(Boolean)
  }
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  if (content === null || content === undefined) {
    return []
  }
  return [content]
}

function mergeContent(left, right) {
  return [...toContentBlocks(left), ...toContentBlocks(right)]
}

function mergeConsecutiveAnthropicMessages(messages) {
  if (!Array.isArray(messages)) {
    return messages
  }

  const merged = []

  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      merged.push(message)
      continue
    }

    const previous = merged[merged.length - 1]
    if (previous && typeof previous === 'object' && previous.role === message.role) {
      merged[merged.length - 1] = {
        ...previous,
        content: mergeContent(previous.content, message.content)
      }
      continue
    }

    merged.push(message)
  }

  return merged
}

module.exports = {
  mergeConsecutiveAnthropicMessages
}
