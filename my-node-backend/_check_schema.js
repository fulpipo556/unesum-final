require('dotenv').config();
const { Sequelize } = require('sequelize');
const s = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false
});

async function main() {
  try {
    // Get usuarios table columns
    const [cols] = await s.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'usuarios' ORDER BY ordinal_position");
    console.log('=== USUARIOS COLUMNS ===');
    console.log(JSON.stringify(cols, null, 2));

    // Get all usuarios with their roles
    const [users] = await s.query("SELECT * FROM usuarios LIMIT 10");
    console.log('\n=== USUARIOS DATA ===');
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}
main();
