/** Convert DSH's structured conversation into the plain prompt Codex accepts. */
function serializeBlocks(blocks, toolNames = new Map()) {
    return blocks.map((block) => {
        switch (block.type) {
            case 'text':
            case 'reasoning':
                return block.text;
            case 'image':
                return `[图片: ${String(block.attachment.attachmentId)}]`;
            case 'tool-call':
                return `[工具调用: ${block.name}; toolCallId=${String(block.id)}; arguments=${block.arguments}]`;
            case 'tool-result': {
                const result = serializeBlocks(block.content, toolNames);
                const status = block.isError ? '错误; ' : '';
                const name = toolNames.get(String(block.toolCallId));
                const label = name === undefined ? '' : `工具=${name}; `;
                return `[工具结果: ${status}${label}toolCallId=${String(block.toolCallId)}]\n${result}`;
            }
            default:
                return '';
        }
    }).filter(part => part.length > 0).join('\n');
}
/** Render system instructions and messages in conversation order. */
export function serialize(messages, system) {
    // Collect toolCallId -> tool name so tool-result blocks can name their tool.
    const toolNames = new Map();
    for (const message of messages) {
        for (const block of message.content) {
            if (block.type === 'tool-call')
                toolNames.set(String(block.id), block.name);
        }
    }
    const sections = [];
    if (system !== undefined && system.length > 0)
        sections.push(`[系统指令]\n${system}`);
    for (const message of messages) {
        const label = message.role === 'system'
            ? '系统指令'
            : message.role === 'assistant'
                ? '助手'
                : message.source.kind === 'tool'
                    ? '工具结果'
                    : '用户';
        sections.push(`${label}:\n${serializeBlocks(message.content, toolNames)}`);
    }
    return sections.join('\n\n');
}
//# sourceMappingURL=serialize.js.map