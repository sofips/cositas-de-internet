import { config } from './config.js';
console.log('OK', {
  telegram: { token: !!config.telegram.token, adminId: config.telegram.adminId },
  github: { user: config.github.user }
});
