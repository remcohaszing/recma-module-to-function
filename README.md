# recma-module-to-function

[![github actions](https://github.com/remcohaszing/recma-module-to-function/actions/workflows/ci.yaml/badge.svg)](https://github.com/remcohaszing/recma-module-to-function/actions/workflows/ci.yaml)
[![codecov](https://codecov.io/gh/remcohaszing/recma-module-to-function/branch/main/graph/badge.svg)](https://codecov.io/gh/remcohaszing/recma-module-to-function)
[![npm version](https://img.shields.io/npm/v/recma-module-to-function)](https://www.npmjs.com/package/recma-module-to-function)
[![npm downloads](https://img.shields.io/npm/dm/recma-module-to-function)](https://www.npmjs.com/package/recma-module-to-function)

A [recma](https://github.com/mdx-js/recma) plugin to convert an ESTree module into a function body.
It’s compatible with [MDX](https://mdxjs.com).

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
  - [`recma().use(recmaModuleToFunction, options?)`](#recmauserecmamoduletofunction-options)
- [Examples](#examples)
  - [Evaluate JavaScript](#evaluate-javascript)
  - [Module map](#module-map)
  - [Dynamic import](#dynamic-import)
  - [CDN](#cdn)
  - [MDX with React](#mdx-with-react)
- [Security](#security)
- [Compatibility](#compatibility)
- [License](#license)

## Installation

```sh
npm install recma-module-to-function
```

## Usage

You can use this with [recma](https://github.com/mdx-js/recma) to convert a module to a function
body.

```typescript
import { recma } from 'recma'
import recmaModuleToFunction from 'recma-module-to-function'

const source = `
import assert from 'node:assert/strict'

export { assert }
`

const file = recma()
  .use({ settings: { module: true } })
  .use(recmaModuleToFunction)
  .processSync(source)

console.log(String(file))
```

## API

This module exports a single function named `recmaModuleToFunction`.

### `recma().use(recmaModuleToFunction, options?)`

Convert an estree module into a function body. This modifies the input AST.

#### Options

- `importName`: A custom name for the import. By default, `import()` expressions are used. If this
  option is given, import expressions and import meta properties are transformed into identifiers
  using this name. (type: `string`)

## Examples

### Evaluate JavaScript

You can use [recma](https://github.com/mdx-js/recma) to transform a JavaScript module, then use the
[`AsyncFunction`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction)
constructor to evaluate the result. Note that imports will be resolved relative to the module that
invokes the `AsyncFunction` constructor.

```js
import { recma } from 'recma'
import recmaModuleToFunction from 'recma-module-to-function'

const source = `
import os from 'node:os'
import recmaModuleToFunction from 'recma-module-to-function'

export const home = os.homedir()
export { recmaModuleToFunction }
`

const file = recma()
  .use({ settings: { module: true } })
  .use(recmaModuleToFunction)
  .processSync(source)

const AsyncFunction = (async () => {
  // We only define this function to get its constructor.
}).constructor

const fn = new AsyncFunction(String(file))
const result = await fn()

console.log(result)
```

### Module map

It’s often desirable to explicitly define which modules may be imported. One strategy to do this is
to define map of imports that can be imported. Then define a custom import function.

```js
import { recma } from 'recma'
import recmaModuleToFunction from 'recma-module-to-function'

import * as b from './b.js'

const a = { A: 1 }

const modules = new Map([
  ['a', a],
  ['b', b]
])

async function customImport(name) {
  const module = modules.get(name)
  if (module) {
    return module
  }

  throw new Error(`Cannot find module '${name}'`)
}

const importName = '_import'
const source = `
import { A } from 'a'
import { B } from 'b'

console.log(A)
console.log(B)
`

const file = recma()
  .use({ settings: { module: true } })
  .use(recmaModuleToFunction, { importName })
  .processSync(source)

const AsyncFunction = customImport.constructor

const fn = new AsyncFunction(importName, String(file))
const result = await fn()
```

### Dynamic import

If you use a bundler, it may interpret support relative dynamic imports. For example, you may have a
file structure like this:

```
├── lib
│   └── eval.js
└── modules
    ├── a.js
    └── b.js
```

Then `eval.js` could look something like this:

```js
import { recma } from 'recma'
import recmaModuleToFunction from 'recma-module-to-function'

async function customImport(name) {
  return import(`../modules/${name}.js`)
}

const importName = '_import'
const source = `
import { A } from 'a'
import { B } from 'b'

console.log(A)
console.log(B)
`

const file = recma()
  .use({ settings: { module: true } })
  .use(recmaModuleToFunction, { importName })
  .processSync(source)

const AsyncFunction = customImport.constructor

const fn = new AsyncFunction(importName, String(file))
const result = await fn()
```

### CDN

You can define a custom import to resolve imports code to a CDN such as [esm.sh](https://esm.sh).
You can even allow import attributes to let the user decide on the CDN.

```ts
import { recma } from 'recma'
import recmaModuleToFunction from 'recma-module-to-function'

async function customImport(name, options) {
  return import(`https://esm.sh/${name}`, options)
}

const importName = '_import'
const source = `
import confetti from 'canvas-confetti'

confetti()
`

const file = recma()
  .use({ settings: { module: true } })
  .use(recmaModuleToFunction, { importName })
  .processSync(source)

const AsyncFunction = customImport.constructor

const fn = new AsyncFunction(importName, String(file))
const result = await fn()
```

### MDX with React

This project is compatible with MDX. One of the main goals is to be an alternative strategy to
implement [MDX on demand](https://mdxjs.com/guides/mdx-on-demand/).

On the server, you can compile the MDX content with
[`compile()`](https://mdxjs.com/packages/mdx/#compilefile-options). Then pass the compiled code to a
client component.

```tsx
// app/page.tsx
import { compileSync } from '@mdx-js/mdx'
import { type ReactNode } from 'react'
import recmaModuleToFunction from 'recma-module-to-function'

import { Eval } from '../components/Eval.tsx'

const mdx = `
import { Button } from 'components'

Hello {props.name}!

<Button>Click me!</Button>
`

const code = compileSync(mdx, {
  recmaPlugins: [[recmaModuleToFunction, { importName: '_import' }]]
})

export default function Page(): ReactNode {
  return <Eval code={String(code)} importName={importName} />
}
```

In the client component, evaluate the code with the
[`AsyncFunction`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction)
constructor. Use a custom import implementation to explicitly define which modules the code is
allowed to access.

```tsx
// components/Eval.tsx
'use client'

import { type ComponentProps, type ReactNode, useEffect, useState } from 'react'
import * as runtime from 'react/jsx-runtime'
import { type Import } from 'recma-module-to-function'

// Define some components
function Button(props: ComponentProps<'button'>): ReactNode {
  return <button type="button" {...props} />
}

const modules = new Map([
  // Define the `components` module
  ['components', { Button }],
  // Make sure the JSX automatic runtime can be imported.
  ['react/jsx-runtime', runtime]
])

// A custom import implementation which allows importing modules define by our map.
const customImport: Import = async (name) => {
  const module = modules.get(name)
  if (module) {
    return module
  }

  throw new Error(`Module not found '${name}'`)
}

// Grab the AsyncFunction constructor from any async function.
const AsyncFunction = customImport.constructor

interface EvalProps {
  code: string
  importName: string
}

// The client component which can asynchronously render code.
export function Eval({ code, importName }: EvalProps): ReactNode {
  const [content, setContent] = useState<ReactNode>()
  const [error, setError] = useState<unknown>()

  useEffect(() => {
    let cancelled = false

    const fn = new AsyncFunction(importName, code)
    fn(customImport).then(
      ({ default: MDXContent }) => {
        if (!cancelled) {
          setContent(<MDXContent name="User" />)
          setError()
        }
      },
      (err) => {
        if (!cancelled) {
          setContent(null)
          setError(err)
        }
      }
    )

    return () => {
      cancelled = true
    }
  }, [code, importName])

  if (error !== undefined) {
    throw error
  }

  return content
}
```

## Security

This package only transforms the AST input, which is safe to use on its own. However, it was created
with the use case in mind to evaluate a JavaScript module. Evaluating user input is dangerous and
should be avoided.

If you use MDX, consider using a build tool integration such as
[`@mdx-js/loader`](https://mdxjs.com/packages/loader/) or
[`@mdx-js/rollup`](https://mdxjs.com/packages/rollup/) instead.

## Compatibility

This project is compatible with Node.js 20 or greater.

## License

[MIT](LICENSE.md) © [Remco Haszing](https://github.com/remcohaszing)
