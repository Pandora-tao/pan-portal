<script setup lang="ts">
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  dateZhCN,
  zhCN,
  type GlobalThemeOverrides,
} from 'naive-ui'
import AdminShell from './components/AdminShell.vue'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#002FA7',
    primaryColorHover: '#1749c7',
    primaryColorPressed: '#001f73',
    primaryColorSuppl: '#002FA7',
    borderRadius: '0px',
    borderColor: '#d9d9dc',
    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  },
  Button: { borderRadiusMedium: '0px', borderRadiusSmall: '0px', borderRadiusLarge: '0px' },
  Card: { borderRadius: '0px' },
  DataTable: { borderRadius: '0px', thColor: '#f7f7f8', thTextColor: '#111111' },
  Drawer: { borderRadius: '0px' },
  Input: { borderRadius: '0px' },
  Modal: { borderRadius: '0px' },
  Select: { peers: { InternalSelection: { borderRadius: '0px' } } },
}
</script>

<template>
  <n-config-provider :theme-overrides="themeOverrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-dialog-provider>
      <n-notification-provider>
        <n-message-provider>
          <AdminShell />
        </n-message-provider>
      </n-notification-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
