import fs from 'node:fs';
import {menuBoardSVG} from '../dist/cafe-menu.js';
fs.writeFileSync(new URL('../dist/assets/ristobar-menu.svg',import.meta.url),menuBoardSVG());
console.log('Updated ristobar-menu.svg');
