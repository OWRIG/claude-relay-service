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

function findLastUnsignedThinkingIndex(blocks) {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]
    if (block?.type === 'thinking' && !block.signature) {
      return index
    }
  }
  return -1
}

function promoteRedactedThinkingToolSignatures(content) {
  if (!Array.isArray(content)) {
    return content
  }

  const promoted = []

  for (let index = 0; index < content.length; index += 1) {
    const block = content[index]
    const next = content[index + 1]
    const signature = block?.type === 'redacted_thinking' ? block.data : null

    if (signature && typeof signature === 'string' && next?.type === 'tool_use') {
      const thinkingIndex = findLastUnsignedThinkingIndex(promoted)
      if (thinkingIndex >= 0) {
        promoted[thinkingIndex] = {
          ...promoted[thinkingIndex],
          signature
        }
      } else {
        promoted.push({ type: 'thinking', thinking: '', signature })
      }
      continue
    }

    promoted.push(block)
  }

  return promoted
}

function normalizeContent(content, options) {
  const blocks = toContentBlocks(content)
  if (options.promoteRedactedThinkingToolSignatures) {
    return promoteRedactedThinkingToolSignatures(blocks)
  }
  return blocks
}

function mergeConsecutiveAnthropicMessages(messages, options = {}) {
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

  if (!options.promoteRedactedThinkingToolSignatures) {
    return merged
  }

  return merged.map((message) => {
    if (!message || typeof message !== 'object' || !Array.isArray(message.content)) {
      return message
    }

    return {
      ...message,
      content: normalizeContent(message.content, options)
    }
  })
}

module.exports = {
  mergeConsecutiveAnthropicMessages
}
