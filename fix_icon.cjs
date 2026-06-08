const fs = require('fs');
const fname = 'd:\\_DEV\\_fintech_project\\Oferta\\app\\src\\App.jsx';
let c = fs.readFileSync(fname, 'utf8');
// u{1F3EA} is the broken text — replace it with the actual store emoji 🏪
const old = "icon: fetchedStore.icon || 'u{1F3EA}',";
const newStr = "icon: fetchedStore.icon || '\u{1F3EA}',";
const count = c.split(old).length - 1;
console.log('Found:', count, 'occurrence(s)');
if (count === 1) {
  c = c.replace(old, newStr);
  fs.writeFileSync(fname, c, 'utf8');
  console.log('Fixed!');
} else {
  console.log('Not found or multiple matches, skipping.');
}
