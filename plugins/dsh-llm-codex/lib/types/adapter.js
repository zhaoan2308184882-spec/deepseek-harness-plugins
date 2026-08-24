/** Local Codex CLI transport for the DSH LLM seam. */
import { spawn } from 'node:child_process';
import { constants, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { expandHomePath } from '@deepseek-ai/dsh-home-paths';
import { LlmAdapter, LlmError } from '@deepseek-ai/dsh-llm';
import { serialize } from "./serialize.js";
function modelInfo(provider, model) {
    return { provider, id: model.id, name: model.name ?? model.id, inputModalities: ['text'] };
}
/** Codex subscription reasoning levels (~/.codex/models_cache.json supported_reasoning_levels). */
const CODEX_REASONING_LEVELS = [
    { id: 'low', name: '低' },
    { id: 'medium', name: '中' },
    { id: 'high', name: '高' },
    { id: 'xhigh', name: '超高' },
    { id: 'max', name: '最高' },
    { id: 'ultra', name: '极致' },
];
async function isExecutable(path) {
    try {
        await access(path, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
async function resolveCodexBinary(configured) {
    if (configured !== undefined) {
        const candidate = resolve(expandHomePath(configured));
        return await isExecutable(candidate) ? candidate : undefined;
    }
    const extensions = process.platform === 'win32'
        ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM').split(';')
        : [''];
    for (const directory of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
        for (const extension of extensions) {
            const candidate = join(directory, `codex${extension.toLowerCase()}`);
            if (await isExecutable(candidate))
                return candidate;
            const upperCandidate = join(directory, `codex${extension.toUpperCase()}`);
            if (upperCandidate !== candidate && await isExecutable(upperCandidate))
                return upperCandidate;
        }
    }
    return undefined;
}
function estimateTokens(text) {
    return Math.ceil(text.length / 4);
}
function stderrSummary(stderr, stdout) {
    const detail = (stderr.trim() || stdout.trim()).replace(/\s+/g, ' ');
    return detail.length === 0 ? 'codex CLI exited without an error message' : detail.slice(0, 1_000);
}
function killProcessTree(child, timeoutMs = 3_000) {
    return new Promise((resolveKill) => {
        if (child.pid === undefined || child.exitCode !== null || child.signalCode !== null) {
            resolveKill();
            return;
        }
        if (process.platform !== 'win32') {
            try {
                process.kill(-child.pid, 'SIGTERM');
            }
            catch {
                child.kill('SIGTERM');
            }
            resolveKill();
            return;
        }
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            stdio: 'ignore',
            windowsHide: true,
        });
        const fallback = () => {
            try {
                if (child.exitCode === null && child.signalCode === null)
                    child.kill('SIGKILL');
            }
            catch {
                // already gone
            }
        };
        const timer = setTimeout(fallback, timeoutMs);
        killer.once('error', () => { clearTimeout(timer); fallback(); resolveKill(); });
        killer.once('exit', () => { clearTimeout(timer); resolveKill(); });
    });
}
function record(value) {
    return typeof value === 'object' && value !== null ? value : undefined;
}
function stringField(value, key) {
    const field = value[key];
    return typeof field === 'string' ? field : undefined;
}
function numberField(value, key) {
    const field = value[key];
    return typeof field === 'number' && Number.isFinite(field) && field >= 0 ? field : undefined;
}
function parseUsage(event) {
    const usage = record(event.usage);
    if (usage === undefined)
        return undefined;
    const totalInput = numberField(usage, 'input_tokens');
    const outputTokens = numberField(usage, 'output_tokens');
    if (totalInput === undefined || outputTokens === undefined)
        return undefined;
    const cacheReadTokens = numberField(usage, 'cached_input_tokens') ?? 0;
    const cacheWriteTokens = numberField(usage, 'cache_write_input_tokens') ?? 0;
    const reasoningTokens = numberField(usage, 'reasoning_output_tokens');
    return {
        inputTokens: Math.max(0, totalInput - cacheReadTokens - cacheWriteTokens),
        outputTokens,
        ...(cacheReadTokens === 0 ? {} : { cacheReadTokens }),
        ...(cacheWriteTokens === 0 ? {} : { cacheWriteTokens }),
        ...(reasoningTokens === undefined ? {} : { reasoningTokens }),
    };
}
function describeItem(eventType, item) {
    const itemType = stringField(item, 'type');
    if (itemType === 'reasoning')
        return stringField(item, 'text');
    if (itemType === 'command_execution') {
        const command = stringField(item, 'command');
        if (eventType === 'item.started')
            return command === undefined ? '正在执行命令\n' : `正在执行命令：${command}\n`;
        const exitCode = numberField(item, 'exit_code');
        return exitCode === undefined ? '命令执行结束\n' : `命令执行结束（退出码 ${exitCode}）\n`;
    }
    if (itemType === 'web_search') {
        const query = stringField(item, 'query');
        return query === undefined ? '正在搜索网页\n' : `正在搜索网页：${query}\n`;
    }
    if (itemType === 'mcp_tool_call') {
        const tool = stringField(item, 'tool') ?? stringField(item, 'name');
        return tool === undefined ? '正在调用 MCP 工具\n' : `正在调用 MCP 工具：${tool}\n`;
    }
    if (itemType === 'file_change')
        return '正在修改文件\n';
    if (itemType === 'todo_list')
        return '正在更新任务计划\n';
    if (itemType === 'error') {
        const message = stringField(item, 'message') ?? stringField(item, 'text');
        return message === undefined ? 'Codex 报告了执行错误\n' : `Codex 执行错误：${message}\n`;
    }
    return undefined;
}
function waitForProcess(child, signal) {
    return new Promise((resolvePromise, reject) => {
        let stdout = '';
        let stderr = '';
        let settled = false;
        let settleTimer;
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stderr.on('data', (chunk) => { stderr += chunk; });
        const finish = (code, exitSignal) => {
            if (settled)
                return;
            settled = true;
            if (settleTimer !== undefined)
                clearTimeout(settleTimer);
            signal?.removeEventListener('abort', abort);
            resolvePromise({ code, signal: exitSignal, stdout, stderr });
        };
        const abort = () => {
            // Bound the wait: kill the tree, then settle within a short window even
            // if the process never dies (taskkill failure / permission edge).
            settleTimer = setTimeout(() => { finish(null, null); }, 5_000);
            void killProcessTree(child).then(() => {
                if (child.exitCode === null && child.signalCode === null) {
                    try {
                        child.kill('SIGKILL');
                    }
                    catch { /* already gone */ }
                }
            });
        };
        child.once('error', reject);
        child.once('close', (code, exitSignal) => { finish(code, exitSignal); });
        signal?.addEventListener('abort', abort, { once: true });
        // Race guard: abort may have fired between the caller's pre-check and this
        // listener registration — re-check and act immediately.
        if (signal?.aborted)
            abort();
    });
}
export class CodexAdapter extends LlmAdapter {
    config;
    constructor(config) {
        super();
        this.config = config;
    }
    providerInfo(provider) {
        return { id: provider, name: 'Codex' };
    }
    listModels(provider) {
        return Promise.resolve(this.config.options().models.map(model => modelInfo(provider, model)));
    }
    resolveModel(provider, model, _signal) {
        const configured = this.config.options().models.find(entry => entry.id === model);
        return Promise.resolve({
            ...(configured === undefined
                ? { provider, id: model, name: model, inputModalities: ['text'] }
                : modelInfo(provider, configured)),
            ...(configured?.contextWindow === undefined ? {} : { context: { contextWindow: configured.contextWindow } }),
            ...(configured?.maxTokens === undefined ? {} : { defaultMaxTokens: configured.maxTokens }),
            reasoning: {
                efforts: CODEX_REASONING_LEVELS,
                defaultEffort: (this.config.options().defaultReasoningEffort ?? 'low'),
            },
        });
    }
    /**
     * Bind one generation's model metadata and dispatch to the same config
     * snapshot. The base LlmAdapter gained `prepareCall` in the 0.1.1-rc.2
     * series; a plugin bundled against an earlier dsh-llm re-implements the
     * delegation (no `override`, since the older base class does not declare it).
     */
    async prepareCall(provider, model, signal) {
        return {
            model: await this.resolveModel(provider, model, signal),
            stream: options => this.stream(options),
        };
    }
    async *stream(options) {
        const connection = this.config.options();
        const bin = await resolveCodexBinary(connection.codexPath);
        if (bin === undefined) {
            throw new LlmError('codex CLI 未找到:请在 llm-codex 设置配置 codexPath 或安装 codex 并加入 PATH', 'UNAVAILABLE');
        }
        const codexHome = resolve(expandHomePath(connection.codexHome ?? '~/.codex'));
        if (!existsSync(join(codexHome, 'auth.json'))) {
            throw new LlmError('请先运行 codex login 完成 ChatGPT 登录', 'UNAVAILABLE');
        }
        if (options.signal?.aborted) {
            yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'Codex request aborted by caller', code: 'ABORTED' } } };
            return;
        }
        const prompt = serialize(options.messages, options.system);
        const outputFile = join(tmpdir(), `dsh-codex-${randomUUID()}.txt`);
        // Codex is an autonomous agent. It owns tool use, temperature, maxTokens,
        // and stop (intentionally ignored); reasoningEffort is honored via -c.
        // The prompt is NOT a command-line arg (spawn ENAMETOOLONG on long
        // conversations) — it is streamed on stdin.
        const baseArgs = [
            'exec', '--ephemeral', '--skip-git-repo-check',
            '-m', options.model,
            '-s', connection.sandboxMode,
            ...(options.reasoningEffort === undefined
                ? []
                : ['-c', `model_reasoning_effort="${options.reasoningEffort}"`]),
            '-o', outputFile,
        ];
        const startCodex = (args) => {
            const child = spawn(bin, args, {
                cwd: connection.cwd === undefined ? process.cwd() : resolve(expandHomePath(connection.cwd)),
                env: connection.codexHome === undefined
                    ? process.env
                    : { ...process.env, CODEX_HOME: codexHome },
                stdio: ['pipe', 'pipe', 'pipe'],
                windowsHide: true,
                detached: process.platform !== 'win32',
            });
            // Feed the prompt on stdin (codex exec reads it when not given as an arg).
            try {
                child.stdin.end(prompt);
            }
            catch {
                // child may already be gone; the process wait surfaces the failure.
            }
            return child;
        };
        let child = startCodex([...baseArgs.slice(0, 3), '--json', ...baseArgs.slice(3)]);
        try {
            let result;
            const processResult = waitForProcess(child, options.signal);
            const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
            let nextBlockIndex = 0;
            let reasoningIndex;
            let reasoningText = '';
            let pendingAgentMessage;
            let actualUsage;
            try {
                for await (const line of lines) {
                    if (options.signal?.aborted)
                        break;
                    const trimmed = line.trim();
                    if (trimmed.length === 0)
                        continue;
                    let event;
                    try {
                        event = record(JSON.parse(trimmed));
                    }
                    catch {
                        continue;
                    }
                    if (event === undefined) {
                        continue;
                    }
                    const eventType = stringField(event, 'type');
                    const item = record(event.item);
                    if (item !== undefined && stringField(item, 'type') === 'agent_message') {
                        const message = stringField(item, 'text');
                        if (message !== undefined && message.length > 0) {
                            if (pendingAgentMessage !== undefined) {
                                if (reasoningIndex === undefined) {
                                    reasoningIndex = nextBlockIndex++;
                                    yield { type: 'block-start', index: reasoningIndex, blockType: 'reasoning' };
                                }
                                const delta = `${pendingAgentMessage}\n`;
                                reasoningText += delta;
                                yield { type: 'reasoning-delta', index: reasoningIndex, text: delta };
                            }
                            pendingAgentMessage = message;
                        }
                        continue;
                    }
                    if (eventType === 'turn.completed') {
                        actualUsage = parseUsage(event) ?? actualUsage;
                        continue;
                    }
                    if (eventType !== undefined && item !== undefined) {
                        const activity = describeItem(eventType, item);
                        if (activity !== undefined) {
                            if (pendingAgentMessage !== undefined) {
                                const delta = `${pendingAgentMessage}\n`;
                                if (reasoningIndex === undefined) {
                                    reasoningIndex = nextBlockIndex++;
                                    yield { type: 'block-start', index: reasoningIndex, blockType: 'reasoning' };
                                }
                                reasoningText += delta;
                                yield { type: 'reasoning-delta', index: reasoningIndex, text: delta };
                                pendingAgentMessage = undefined;
                            }
                            if (reasoningIndex === undefined) {
                                reasoningIndex = nextBlockIndex++;
                                yield { type: 'block-start', index: reasoningIndex, blockType: 'reasoning' };
                            }
                            reasoningText += activity;
                            yield { type: 'reasoning-delta', index: reasoningIndex, text: activity };
                        }
                    }
                }
                result = await processResult;
            }
            catch (error) {
                if (options.signal?.aborted) {
                    if (reasoningIndex !== undefined) {
                        yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoningText } };
                        reasoningIndex = undefined;
                    }
                    yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'Codex request aborted by caller', code: 'ABORTED' } } };
                    return;
                }
                throw new LlmError('codex CLI 启动失败', 'UNAVAILABLE', { cause: error });
            }
            const jsonFailure = `${result.stderr}\n${result.stdout}`;
            const jsonOptionRejected = result.code !== 0
                && /--json/i.test(jsonFailure)
                && /unexpected|unknown|unrecognized|invalid/i.test(jsonFailure);
            if (jsonOptionRejected && !options.signal?.aborted) {
                child = startCodex(baseArgs);
                try {
                    result = await waitForProcess(child, options.signal);
                }
                catch (error) {
                    if (!options.signal?.aborted) {
                        throw new LlmError('codex CLI 启动失败', 'UNAVAILABLE', { cause: error });
                    }
                }
            }
            if (options.signal?.aborted) {
                if (reasoningIndex !== undefined) {
                    yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoningText } };
                    reasoningIndex = undefined;
                }
                yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'Codex request aborted by caller', code: 'ABORTED' } } };
                return;
            }
            if (reasoningIndex !== undefined) {
                yield { type: 'block-end', index: reasoningIndex, block: { type: 'reasoning', text: reasoningText } };
                reasoningIndex = undefined;
            }
            if (result.code !== 0) {
                // Narrow-map stable auth failures (expired / invalid ChatGPT login) to
                // AUTH so retry and diagnostics can tell auth from server trouble.
                const detail = stderrSummary(result.stderr, result.stdout);
                const auth = /(?:not signed in|sign in|please login|unauthori[sz]ed|authentication|401|403)/i.test(result.stderr);
                yield {
                    type: 'finish',
                    reason: { kind: 'error', failure: { message: detail, code: auth ? 'AUTH' : 'SERVER' } },
                };
                return;
            }
            const answer = existsSync(outputFile) ? readFileSync(outputFile, 'utf8').trim() : '';
            if (answer.length === 0) {
                yield {
                    type: 'finish',
                    reason: { kind: 'error', failure: { message: 'codex CLI returned an empty response', code: 'EMPTY_RESPONSE' } },
                };
                return;
            }
            const textIndex = nextBlockIndex++;
            yield { type: 'block-start', index: textIndex, blockType: 'text' };
            yield { type: 'text-delta', index: textIndex, text: answer };
            yield { type: 'block-end', index: textIndex, block: { type: 'text', text: answer } };
            yield {
                type: 'usage',
                usage: actualUsage ?? { inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(answer) },
            };
            yield { type: 'finish', reason: { kind: 'stop' } };
        }
        finally {
            if (child.exitCode === null)
                await killProcessTree(child);
            if (existsSync(outputFile))
                unlinkSync(outputFile);
        }
    }
}
//# sourceMappingURL=adapter.js.map