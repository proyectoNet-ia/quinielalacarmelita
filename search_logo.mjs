import fs from 'fs';

const filePath = '/Volumes/Win HD/Proyecto NET/La Carmelita/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = "const getTeamLogo";
const startIdx = content.indexOf(targetStr);
if (startIdx !== -1) {
  console.log(content.substring(startIdx - 100, startIdx + 800));
} else {
  console.log("getTeamLogo not found");
}
