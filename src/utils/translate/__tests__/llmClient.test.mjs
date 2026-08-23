// src/utils/translate/__tests__/llmClient.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseSseLines, classifyFetchFailure } from '../llmClient.js'

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
