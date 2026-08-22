const fs = require('fs');
let c = fs.readFileSync('src/app/components/OperationsDashboardPage.tsx', 'utf8');
c = c.replace(/b\.coverUrl \+ \(b\.coverUrl\.startsWith\('data:'\) \? '' : \`\?t=\$\{lastFetchedBooks\}\`\)/, "(b.coverUrl.match(/^(http|data:)/) ? b.coverUrl : (import.meta.env.VITE_API_URL || 'http://localhost:3001') + b.coverUrl) + (b.coverUrl.startsWith('data:') ? '' : `?t=${lastFetchedBooks}`)");
fs.writeFileSync('src/app/components/OperationsDashboardPage.tsx', c);
