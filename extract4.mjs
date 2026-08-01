import fs from 'fs';

const filePath = '/Volumes/Win HD/Proyecto NET/La Carmelita/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = "const getBase64ImageFromUrl = ";
const startIdx = content.indexOf(targetStr);
console.log(content.substring(startIdx - 100, startIdx + 800));
