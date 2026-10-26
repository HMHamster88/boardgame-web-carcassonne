<template>
    <div>
        <div class="settings-header">
            <o-field>
                <o-select id="mode" v-model="settings.mode" :options="gameModes" />
            </o-field>
        </div>
    </div>
</template>

<script setup lang="ts">

import { OField, OSelect } from '@oruga-ui/oruga-next';

import type { GameAction } from 'boardgame-web-common';
import type { CarcassonneGameSettings } from 'carcassonne-back';
import { type PropType } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n({
    locale: 'en',
    messages: {
        en: {
            gameModes: {
                base: 'Base Game',
                river: 'River Expansion'
            },
            mode: 'Game Mode:'
        },
        ru: {
            gameModes: {
                base: 'Базовая игра',
                river: 'Расширение с рекой'
            },
            mode: 'Режим игры:'
        }
    }
})

const gameModes = [
    { value: 'base', label: t('gameModes.base') },
    { value: 'river', label: t('gameModes.river') }
]

const props = defineProps({
    settings: {
        type: Object as PropType<CarcassonneGameSettings>,
        required: true
    },
    canEdit: {
        type: Boolean,
        default: true
    }
})

const emit = defineEmits<{
    (e: 'performAction', action: GameAction): void
}>()

</script>

<style>
.settings-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

</style>
