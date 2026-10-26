<template>
    <div class="flex flex-col">
        <span>{{ t('turnCount') }} : {{ statistics.turnCount }}</span>
        <h2>{{ t('playersStats') }}</h2>
        <div v-for="playerStat in gameState.playersStates" style="margin-bottom: 1rem;">
            <h3>{{ getPlayer(playerStat.playerId)?.name }}</h3>
            <div style="margin-left: 0.5rem;">
                <h4>{{ t('points') }}</h4>
                {{ playerStat.points }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">

import type { Game } from 'boardgame-web-common';
import { type CarcassonneGameStatistics, type CarcassonnePublicGameState } from 'carcassonne-back';
import { type PropType } from 'vue';
import { useI18n } from 'vue-i18n';


let localization: any = {
    en: {
        turnCount: 'Turn Count',
        playersStats: 'Players Stats',
        points: 'Points'
    },
    ru: {
        turnCount: 'Количество Ходов',
        playersStats: 'Статистика игроков',
        points: 'Очки'
    }
}
const { t } = useI18n({
    locale: 'en',
    messages: localization
})

function getPlayer(playerId: string) {
    return props.game.players.find(pl => pl.userId == playerId)
}

const props = defineProps({
    statistics: {
        type: Object as PropType<CarcassonneGameStatistics>,
        required: true
    },
    gameState: {
        type: Object as PropType<CarcassonnePublicGameState>,
        required: true
    },
    game: {
        type: Object as PropType<Game>,
        required: true
    }
});
</script>

<style>
.progress {
    margin: 0.2rem;
    height: 1.5em;
    width: 100%;
    background-color: var(--oruga-control-background-color);
    position: relative;
    border-width: var(--oruga-control-border-width);
    border-style: solid;
    border-color: var(--oruga-control-border-color);
    border-radius: var(--oruga-border-radius);
}

.progress:before {
    content: attr(data-label);
    font-size: 0.8em;
    position: absolute;
    text-align: center;
    left: 0;
    right: 0;
}

.progress .value {
    background-color: var(--main-color);
    display: inline-block;
    height: 100%;
}

.resource-icon {
    width: 2rem;
    max-width: 2rem;
}
</style>
