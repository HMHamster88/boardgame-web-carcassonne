
import type { GameBackService } from 'boardgame-web-common/back'
import { CarcassonneGameBackService } from './carcassonneBackService'
export * from './carcassonneBackService'
export * from './tiles'
export * from './scoring'
export * from './types/actions'
export * from './types/types'
export * from './utils'


export function getGameBackService(): GameBackService {
    return new CarcassonneGameBackService()
}
