// pm2 config — runs the worker (role menu + quiz + autoVote) 24/7 and restarts
// it on crash/reboot. Use on any always-on machine (home PC, Raspberry Pi, VPS).
//
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs
//   pm2 save && pm2 startup    # auto-start on boot
//   pm2 logs kpopquiz-worker   # watch logs
//
// Reads credentials from ./.env (the script does `import 'dotenv/config'`).
module.exports = {
  apps: [
    {
      name: 'kpopquiz-worker',
      script: 'src/roleMenu.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 50,
      restart_delay: 5000,
      env: { NODE_ENV: 'production' },
    },
  ],
};
