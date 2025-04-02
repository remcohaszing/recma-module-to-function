import assert from 'node:assert/strict'
import { test } from 'node:test'

import { compile } from '@mdx-js/mdx'
import { type MDXModule } from 'mdx/types.js'
import * as runtime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import { recma } from 'recma'
import recmaModuleToFunction, { type Import } from 'recma-module-to-function'

declare module 'mdx/types.js' {
  namespace JSX {
    type Element = runtime.JSX.Element
    type ElementClass = runtime.JSX.ElementClass
    type ElementType = runtime.JSX.ElementType
    type IntrinsicElements = runtime.JSX.IntrinsicElements
  }
}

const AsyncFunction = (async () => {
  // This function is only defined to access its constructor
}).constructor as new (
  ...args: string[]
) => (customImport?: Import) => Promise<Record<string, unknown>>

test('Node.js import', async () => {
  const file = recma()
    .use({ settings: { module: true } })
    .use(recmaModuleToFunction).processSync(`
      import assert from 'node:assert/strict'

      export { assert }
    `)

  const fn = new AsyncFunction(String(file))
  const result = await fn()

  assert.equal(result.assert, assert)
})

test('Bare import', async () => {
  const file = recma()
    .use({ settings: { module: true } })
    .use(recmaModuleToFunction).processSync(`
      import { recma } from 'recma'

      export { recma }
    `)

  const fn = new AsyncFunction(String(file))
  const result = await fn()

  assert.equal(result.recma, recma)
})

test('Relative import', async () => {
  const file = recma()
    .use({ settings: { module: true } })
    .use(recmaModuleToFunction).processSync(`
      import recmaModuleToFunction from './recma-module-to-function.js'

      export { recmaModuleToFunction }
    `)

  const fn = new AsyncFunction(String(file))
  const result = await fn()

  assert.equal(result.recmaModuleToFunction, recmaModuleToFunction)
})

test('Custom import', async () => {
  const importName = '_import'
  const file = recma()
    .use({ settings: { module: true } })
    .use(recmaModuleToFunction, { importName }).processSync(`
      import { value } from 'imported'

      export { value }
    `)

  let imported: string | undefined

  const fn = new AsyncFunction(importName, String(file))
  const result = await fn((name) => {
    imported = name
    return Promise.resolve({ value: 'value' })
  })

  assert.equal(imported, 'imported')
  assert.equal(result.value, 'value')
})

test('Custom meta', async () => {
  const importName = '_import'
  const file = recma()
    .use({ settings: { module: true } })
    .use(recmaModuleToFunction, { importName }).processSync(`
      export const meta = import.meta
    `)

  const customImport: Import = () => Promise.resolve({})
  customImport.meta = { url: 'file:///path/to/file.js' }

  const fn = new AsyncFunction(importName, String(file))
  const result = await fn(customImport)

  assert.equal(result.meta, customImport.meta)
})

test('MDX', async () => {
  const file = await compile('Hello {props.name}!', {
    recmaPlugins: [recmaModuleToFunction]
  })

  const fn = new AsyncFunction(String(file))
  const { default: MDXContent } = (await fn()) as MDXModule

  const result = renderToStaticMarkup(<MDXContent name="React" />)
  assert.equal(result, '<p>Hello React!</p>')
})

test('MDX custom import', async () => {
  const importName = '_import'
  const file = await compile('Hello {props.name}!', {
    recmaPlugins: [[recmaModuleToFunction, { importName }]]
  })

  const fn = new AsyncFunction(importName, String(file))
  // eslint-disable-next-line require-await
  const { default: MDXContent } = (await fn(async (name) => {
    if (name === 'react/jsx-runtime') {
      return runtime
    }

    throw new Error(`Cannot find module ${name}`)
  })) as MDXModule

  const result = renderToStaticMarkup(<MDXContent name="React" />)
  assert.equal(result, '<p>Hello React!</p>')
})
