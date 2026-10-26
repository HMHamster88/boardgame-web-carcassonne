import { configDotenv } from 'dotenv';
import { cp } from 'node:fs/promises';
import path from 'node:path';
import packageInfo from './package.json' with { type: 'json' };
configDotenv()

const gamesModulesPath = process.env.GAMES_MODULES_PATH || '../boardgame-web-ts/back/dev-data/games-modules'

async function copyFolder(source, destination) {
    try {
        await cp(source, destination, { recursive: true });
        console.log('Folder copied successfully! to ' + destination);
    } catch (err) {
        console.error('Error copying folder:', err);
    }
}

if (!gamesModulesPath) {
    console.log('\x1b[31m%s\x1b[0m', 'Set GAMES_MODULES_PATH variable')
} else {

    const gameFolderName = 'carcassonne-' + packageInfo.version.replaceAll('.', '_')

    if (process.argv.includes('-back')) {
        copyFolder('./back/dist', path.join(gamesModulesPath, gameFolderName, 'back'))
    }
    if (process.argv.includes('-front')) {
        copyFolder('./front/dist', path.join(gamesModulesPath, gameFolderName, 'front'))
    }
}
