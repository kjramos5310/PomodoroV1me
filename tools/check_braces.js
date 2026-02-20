
import fs from 'fs';
const content = fs.readFileSync('src/App.jsx', 'utf8');
let balance = 0;
let lines = content.split('\n');
const exportIndex = lines.findIndex(l => l.includes('export default App'));

console.log(`Checking braces up to line ${exportIndex + 1}...`);

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Remove strings and comments to avoid confusion? Simple regex:
    // This is a rough check.
    const open = (line.match(/\{/g) || []).length;
    const close = (line.match(/\}/g) || []).length;
    balance += open - close;

    if (i === exportIndex) {
        console.log(`Balance at export line (Line ${i + 1}): ${balance}`);
        if (balance > 0) console.log("ERROR: App is still open!");
    }
}
console.log(`Final balance: ${balance}`);
