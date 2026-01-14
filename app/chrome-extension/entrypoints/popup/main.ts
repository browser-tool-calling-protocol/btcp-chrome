import { createApp } from 'vue';
import './style.css';
// 引入AgentChat主题样式
import '../sidepanel/styles/agent-chat.css';
import { preloadAgentTheme } from '../sidepanel/composables/useAgentTheme';
import App from './App.vue';

// 在Vue挂载前预加载主题，防止主题闪烁
preloadAgentTheme().then(() => {
  // BTCP client auto-connects on startup, no need to trigger here
  createApp(App).mount('#app');
});
