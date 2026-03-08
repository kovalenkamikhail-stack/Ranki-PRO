import sqlJsWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'

export const SQL_JS_WASM_URL = sqlJsWasmUrl

export function locateSqlJsFile(file: string) {
  return file.endsWith('.wasm') ? SQL_JS_WASM_URL : file
}
