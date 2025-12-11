const db = require('../backend/database');
const table = process.argv[2];
if (!table) { console.error('Usage: node scripts/describe_table.js <table>'); process.exit(2); }
(async()=>{
  try{
    const [cols]=await db.query('DESCRIBE ??',[table]);
    console.log(JSON.stringify(cols,null,2));
    process.exit(0);
  }catch(err){console.error('ERROR',err.message||err);process.exit(3)}
})()