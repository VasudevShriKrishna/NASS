const fs = require('fs');

const dSup = 'C:/Users/Krish Sangani/Downloads/Krish/src/components/app/views/suppliers.tsx';
const kSup = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2/src/components/app/views/suppliers.tsx';

console.log('Downloads suppliers.tsx mtime:', fs.statSync(dSup).mtime);
console.log('Krish_2 suppliers.tsx mtime:', fs.statSync(kSup).mtime);

const dSupRoute = 'C:/Users/Krish Sangani/Downloads/Krish/src/app/api/suppliers/route.ts';
const kSupRoute = 'C:/Users/Krish Sangani/Documents/Trader/Krish_2/src/app/api/suppliers/route.ts';

console.log('Downloads suppliers/route.ts mtime:', fs.statSync(dSupRoute).mtime);
console.log('Krish_2 suppliers/route.ts mtime:', fs.statSync(kSupRoute).mtime);
