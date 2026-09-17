// src/utils/translate/__tests__/llmClient.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSseLines,
  classifyFetchFailure,
  helperRequest,
  chatCompletionStream,
  createThinkTagSplitter,
  LlmApiError,
} from '../llmClient.js'

test('parseSseLines 解析标准 SSE 数据行', () => {
  const raw = 'data: {"choices":[{"delta":{"content":"你好"}}]}\ndata: [DONE]\n'
  const arr = parseSseLines(raw)
  assert.equal(arr.length, 1)
  assert.equal(arr[0].choices[0].delta.content, '你好')
})

test('parseSseLines 跳过空行与坏 JSON', () => {
  const raw = '\n\ndata: not-json\ndata: {"ok":1}\n'
  const arr = parseSseLines(raw)
  assert.deepEqual(arr, [{ ok: 1 }])
})

test('parseSseLines 容忍无 data: 前缀的 JSON 行', () => {
  const arr = parseSseLines('{"choices":[]}')
  assert.equal(arr.length, 1)
})

test('classifyFetchFailure: TypeError 归为 network', () => {
  assert.equal(classifyFetchFailure(new TypeError('Failed to fetch')), 'network')
})

test('classifyFetchFailure: 普通 Error 归为 api', () => {
  assert.equal(classifyFetchFailure(new Error('HTTP 401')), 'api')
})

test('createThinkTagSplitter 无标签内容原样透传', () => {
  const s = createThinkTagSplitter()
  assert.deepEqual(s.push('你好，世界'), { reasoning: '', content: '你好，世界' })
  assert.deepEqual(s.push(''), { reasoning: '', content: '' })
  assert.deepEqual(s.flush(), { reasoning: '', content: '' })
})

test('createThinkTagSplitter 完整 <think> 段落归类为推理', () => {
  const s = createThinkTagSplitter()
  assert.deepEqual(s.push('前文<think>思考中</think>后文'), { reasoning: '思考中', content: '前文后文' })
})

test('createThinkTagSplitter 标签跨 chunk 断裂', () => {
  const s = createThinkTagSplitter()
  assert.deepEqual(s.push('<th'), { reasoning: '', content: '' }) // 疑似标签扣留
  assert.deepEqual(s.push('ink>思考'), { reasoning: '思考', content: '' })
  assert.deepEqual(s.push('</th'), { reasoning: '', content: '' }) // 疑似闭合扣留
  assert.deepEqual(s.push('ink>答案'), { reasoning: '', content: '答案' })
})

test('createThinkTagSplitter flush 兜底未闭合/残余部分标签', () => {
  // <think> 未闭合：扣留的疑似闭合标签也按推理输出
  const s = createThinkTagSplitter()
  s.push('<think>abc</th')
  assert.deepEqual(s.flush(), { reasoning: '</th', content: '' })
  // 正文中残留未拼齐的疑似开标签：按正文输出
  const s2 = createThinkTagSplitter()
  assert.deepEqual(s2.push('abc<thi'), { reasoning: '', content: 'abc' })
  assert.deepEqual(s2.flush(), { reasoning: '', content: '<thi' })
})

// 以下三个测试共享 globalThis 上的 window/fetch 桩，作为顺序子测试执行以避免并发污染
test('兜底与流式降级（C-1/I-1/I-2）', async (t) => {
  await t.test('C-1 helperRequest 归一化 header 键为 Content-Type/Authorization', async () => {
    const captured = {}
    globalThis.window = {
      __httpRequest__: async (url, configStr) => {
        captured.config = JSON.parse(configStr)
        return { data: {} }
      },
    }
    try {
      await helperRequest('http://x', {
        method: 'POST',
        headers: { 'authorization': 'Bearer k', 'content-type': 'application/json' },
        data: { a: 1 },
      })
      assert.equal(captured.config.headers['Content-Type'], 'application/json')
      assert.equal(captured.config.headers['Authorization'], 'Bearer k')
    } finally {
      delete globalThis.window
    }
  })

  await t.test('I-1 chatCompletionStream 跨 chunk 断行不丢字', async () => {
    const full = 'data: {"choices":[{"delta":{"content":"你好"}}]}\ndata: {"choices":[{"delta":{"content":"世界"}}]}\ndata: [DONE]\n'
    const mid = full.indexOf('世界')
    const c1 = full.slice(0, mid) // 在事件中间切断
    const c2 = full.slice(mid)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(c1))
        controller.enqueue(new TextEncoder().encode(c2))
        controller.close()
      },
    })
    globalThis.fetch = async () => ({ ok: true, body: stream })
    try {
      const received = []
      await chatCompletionStream({
        baseUrl: 'http://x',
        apiKey: 'k',
        body: {},
        onRead: ({ content, done }) => { if (!done) received.push(content) },
      })
      assert.equal(received.join(''), '你好世界')
    } finally {
      delete globalThis.fetch
    }
  })

  await t.test('I-2 兜底错误包装为 LlmApiError 且 kind 映射 auth', async () => {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
    globalThis.window = {
      __httpRequest__: async () => { throw new Error('HTTP 401 Unauthorized') },
    }
    let thrown
    try {
      await chatCompletionStream({
        baseUrl: 'http://x',
        apiKey: 'k',
        body: {},
        onRead: () => {},
      })
    } catch (e) {
      thrown = e
    } finally {
      delete globalThis.fetch
      delete globalThis.window
    }
    assert.ok(thrown instanceof LlmApiError)
    assert.equal(thrown.kind, 'auth')
  })
})

// R 系列推理展示（小说 AI 翻译）：同样以顺序子测试共享 fetch 桩，避免并发污染
test('流式推理事件（R-1/R-2/R-3）', async (t) => {
  const sseStream = chunks => new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(new TextEncoder().encode(c))
      controller.close()
    },
  })
  const collect = async (chunks) => {
    globalThis.fetch = async () => ({ ok: true, body: sseStream(chunks) })
    try {
      const events = []
      await chatCompletionStream({
        baseUrl: 'http://x',
        apiKey: 'k',
        body: {},
        onRead: e => { if (!e.done) events.push(e) },
      })
      return events
    } finally {
      delete globalThis.fetch
    }
  }

  await t.test('R-1 reasoning_content 以独立事件旁路发出且 content 为空串', async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"reasoning_content":"思考A"}}]}\n',
      'data: {"choices":[{"delta":{"reasoning_content":"思考B","content":"答"}}]}\n',
      'data: [DONE]\n',
    ])
    assert.deepEqual(events, [
      { reasoning: '思考A', content: '', done: false },
      { reasoning: '思考B', content: '', done: false },
      { content: '答', done: false },
    ])
  })

  await t.test('R-2 兼容 reasoning 字段且 reasoning_content 优先', async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"reasoning":"R1思考"}}]}\n',
      'data: {"choices":[{"delta":{"reasoning_content":"R2思考","reasoning":"ignored"}}]}\n',
      'data: {"choices":[{"delta":{"reasoning":null,"content":"ok"}}]}\n',
      'data: [DONE]\n',
    ])
    assert.deepEqual(events, [
      { reasoning: 'R1思考', content: '', done: false },
      { reasoning: 'R2思考', content: '', done: false },
      { content: 'ok', done: false },
    ])
  })

  await t.test('R-3 内联 <think> 跨 chunk 断裂归类为推理', async () => {
    const events = await collect([
      'data: {"choices":[{"delta":{"content":"<thi"}}]}\n',
      'data: {"choices":[{"delta":{"content":"nk>思考"}}]}\n',
      'data: {"choices":[{"delta":{"content":"过程</th"}}]}\n',
      'data: {"choices":[{"delta":{"content":"ink>译文A"}}]}\n',
      'data: [DONE]\n',
    ])
    // 事件按 chunk 逐段发出（消费端负责累加 reasoning）
    assert.deepEqual(events, [
      { reasoning: '思考', content: '', done: false },
      { reasoning: '过程', content: '', done: false },
      { content: '译文A', done: false },
    ])
    const reasoning = events.filter(e => e.reasoning).map(e => e.reasoning).join('')
    const content = events.filter(e => e.content).map(e => e.content).join('')
    assert.equal(reasoning, '思考过程')
    assert.equal(content, '译文A')
  })
})
