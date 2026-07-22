import pgPromise from "pg-promise";
const pgp = pgPromise();


const connectionString = process.env.DATABASE_URL || {
    host: 'dpg-d9g293ok1i2s739o6gcg-a.virginia-postgres.render.com',
    port: 5432,
    database: 'construccion_y8a4',
    user: 'construccion_y8a4_user',
    password: 'quy5W898i33xG7qwVuCxmw5CVD9XoHr9',
    ssl: { rejectUnauthorized: false } // Requerido por Render para conexiones externas
};

const db = pgp(connectionString);
//module export
export { db };
export default db;