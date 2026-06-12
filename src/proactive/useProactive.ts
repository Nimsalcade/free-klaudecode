// Re-export the useProactive hook from the proactive module.
// The REPL imports this via require('../proactive/useProactive.js')
// as a separate entry point. The implementation lives in index.ts.
export { useProactive } from './index.js'
