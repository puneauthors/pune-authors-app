const fs = require('fs');
const path = require('path');

const filesToReplace = [
  'about-group',
  'bhubaneshwar_airport_flybrary',
  'bridge_bg',
  'buy-books-emoji',
  'chennai_airport_flybrary',
  'crumbled-paper',
  'crumpled-paper',
  'floral-pattern',
  'founder_shiv',
  'goal_author_signing',
  'goal_community',
  'goal_creativity',
  'goal_indian_lit',
  'goal_mentoring',
  'goal_reading',
  'hero-bg',
  'kolkata_airport_flybrary',
  'landing-bg-new',
  'library-bg',
  'logo',
  'mangalore_airport_flybrary',
  'panel-discussion',
  'pune_airport_flybrary',
  'pune_authors_hcl_event',
  'reading_under_tree_bg',
  'trivandrum_airport_flybrary'
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const name of filesToReplace) {
    content = content.replace(new RegExp(`${name}\\.png`, 'g'), `${name}.webp`);
    content = content.replace(new RegExp(`${name}\\.jpg`, 'g'), `${name}.webp`);
    content = content.replace(new RegExp(`${name}\\.jpeg`, 'g'), `${name}.webp`);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'src'));
console.log('Done replacing extensions!');
