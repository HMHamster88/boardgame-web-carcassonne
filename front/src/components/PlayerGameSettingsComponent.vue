<template>
    <div>
        <o-field>
            <o-switch :label="t('showCoordinates')" v-model="settings.showCoordinates" />
        </o-field>
        <o-field>
            <o-switch :label="t('showFeatures')" v-model="settings.showFeatures" />
        </o-field>
    </div>
</template>

<script setup lang="ts">
import { OField, OSwitch } from '@oruga-ui/oruga-next';
import { type PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { type CarcassonnePlayerGameSettings } from './types'

const { t } = useI18n({
    locale: 'en',
    messages: {
        en: {
            showCoordinates: 'Show Tile Coordinates',
            showFeatures: 'Show Feature Names'
        },
        ru: {
            showCoordinates: 'Показывать Координаты Плиток',
            showFeatures: 'Показывать Названия Объектов'
        }
    }
})

defineProps({
    settings: {
        type: Object as PropType<CarcassonnePlayerGameSettings>,
        required: true
    },
})
</script>
