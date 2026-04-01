import mysql from "mysql2/promise";
const conn = await mysql.createConnection(process.env.DATABASE_URL!);
const [cols] = await conn.execute("DESCRIBE solaris_questions");
console.log(JSON.stringify(cols, null, 2));
await conn.end();
