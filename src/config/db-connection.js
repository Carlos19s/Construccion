import pgPromise from "pg-promise";
const pgp = pgPromise();


const connectionString = process.env.DATABASE_URL || {
    host: 'localhost',
    port: 5432,
    database: 'ProyectoConstruccion',
    user: 'postgres',
    password: '123'
};

const db = pgp(connectionString);
//module export
export { db };
export default db;