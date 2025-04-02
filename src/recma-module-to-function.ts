import { type Program } from 'estree'
import { type Import, moduleToFunction } from 'estree-util-module-to-function'
import { type Plugin } from 'unified'

export { type Import }

namespace recmaModuleToFunction {
  /**
   * Options for {@link recmaModuleToFunction}.
   */
  export type Options = moduleToFunction.Options
}

/**
 * A recma plugin to turn a module into a function body.
 */
const recmaModuleToFunction: Plugin<[recmaModuleToFunction.Options?], Program> =
  (options) => (ast) => {
    moduleToFunction(ast, options)
  }

export default recmaModuleToFunction
