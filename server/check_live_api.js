const https = require('https');
https.get('https://api.puneauthorsassociation.com/api/books', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const books = JSON.parse(data);
    const found = books.filter(b => b.author && (b.author.name.includes('Siddharth') || b.author.name.includes('Sritapa')));
    console.log("Found in API:", found.length);
  });
});
