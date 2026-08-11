import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || 'Apple@0109';
  const database = process.env.MYSQL_DATABASE || 'vault';

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true,
  });

  return pool;
}

export async function query<T extends Record<string, unknown>[] = Record<string, unknown>[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const p = getPool();
  const [rows] = await p.query(sql, params as any[]);
  return rows as T;
}

export async function execute(sql: string, params: unknown[] = []): Promise<number> {
  const p = getPool();
  const [result] = await p.execute(sql, params as any[]);
  return (result as mysql.ResultSetHeader).affectedRows;
}

export async function insert(sql: string, params: unknown[] = []): Promise<number> {
  const p = getPool();
  const [result] = await p.execute(sql, params as any[]);
  return (result as mysql.ResultSetHeader).insertId;
}
