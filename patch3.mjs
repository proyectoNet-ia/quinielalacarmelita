import fs from 'fs';

const filePath = '/Volumes/Win HD/Proyecto NET/La Carmelita/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const regex1 = /const exportAdminLeaderboardToPDF = async \(\) => \{[\s\S]*?doc\.save\(`Leaderboard/g;
const matches1 = content.match(regex1);
if (matches1) console.log("Found exportAdminLeaderboardToPDF");

const regex2 = /const exportLeaderboardToPDF = async \(\) => \{[\s\S]*?doc\.save\(`Leaderboard/g;
const matches2 = content.match(regex2);
if (matches2) console.log("Found exportLeaderboardToPDF");
