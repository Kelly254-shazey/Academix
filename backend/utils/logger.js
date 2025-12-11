const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);

exports.error = (message, meta = {}) => {
  const log = `[ERROR] ${new Date().toISOString()} - ${message} ${JSON.stringify(meta)}\n`;
  fs.appendFileSync(logFile, log);
  console.error(log);
};

exports.info = (message, meta = {}) => {
  const log = `[INFO] ${new Date().toISOString()} - ${message} ${JSON.stringify(meta)}\n`;
  fs.appendFileSync(logFile, log);
  console.log(log);
};

exports.warn = (message, meta = {}) => {
  const log = `[WARN] ${new Date().toISOString()} - ${message} ${JSON.stringify(meta)}\n`;
  fs.appendFileSync(logFile, log);
  console.warn(log);
};
