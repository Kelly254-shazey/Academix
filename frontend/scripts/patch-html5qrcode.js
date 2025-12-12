const fs = require('fs');
const path = require('path');

function removeSourceMapComments(filePath) {
  try {
    let src = fs.readFileSync(filePath, 'utf8');
    const original = src;
    // remove lines containing sourceMappingURL references
    src = src.replace(/\/\/#[ \t]*sourceMappingURL=.*$/gm, '');
    src = src.replace(/\/\*# sourceMappingURL=.*\*\//gm, '');
    if (src !== original) {
      fs.writeFileSync(filePath, src, 'utf8');
      console.log('Patched', filePath);
    }
  } catch (err) {
    // ignore
  }
}

function walkAndPatch(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walkAndPatch(full);
    } else if (stat.isFile() && full.endsWith('.js')) {
      removeSourceMapComments(full);
    } else if (stat.isFile() && full.endsWith('.map')) {
      // remove problematic .map files entirely
      try { fs.unlinkSync(full); console.log('Removed map', full); } catch(e){}
    }
  }
}

const target = path.join(__dirname, '..', 'node_modules', 'html5-qrcode');
if (fs.existsSync(target)) {
  walkAndPatch(target);
  console.log('html5-qrcode patch complete');
} else {
  console.log('html5-qrcode not installed; skipping patch');
}
