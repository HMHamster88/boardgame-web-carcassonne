import { CarcassonneFrontService } from './frontService'

export const carcassonneGameType = "CARCASSONNE"


export function getGameFrontService() {
    return new CarcassonneFrontService()
}
