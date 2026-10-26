<template>
    <div style="text-align: center;">{{ t('points') }} {{ playerPublicState?.points }}</div>
</template>

<script setup lang="ts">
import type { Player } from 'boardgame-web-common';
import type { CarcassonnePublicGameState } from 'carcassonne-back';
import { computed, type PropType } from 'vue';
import { useI18n } from 'vue-i18n';

let localization: any = {
    en: {
        points: 'Points:'
    },
    ru: {
        points: 'Очки:'
    }
}
const { t } = useI18n({
    locale: 'en',
    messages: localization
})

const playerPublicState = computed(() => {
    return props.gameState.playersStates?.find(pl => pl.playerId == props.player.userId)
})

const props = defineProps({
    player: {
        type: Object as PropType<Player>,
        required: true
    },
    gameState: {
        type: Object as PropType<CarcassonnePublicGameState>,
        required: true
    }
})
</script>
