declare module 'sql.js' {
  export interface SqlJsQueryResult {
    columns: string[]
    values: unknown[][]
  }

  export interface SqlJsDatabase {
    exec(sql: string): SqlJsQueryResult[]
    close(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => SqlJsDatabase
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string
  }

  export default function initSqlJs(
    config?: InitSqlJsConfig,
  ): Promise<SqlJsStatic>
}
