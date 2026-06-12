# Container for the always-on worker (role menu + quiz + autoVote).
# Works on Fly.io, Railway, Render (background worker), or any Docker host.
# Set env vars on the platform: DISCORD_TOKEN, GUILD_ID, QUIZ_SUPABASE_URL,
# QUIZ_SUPABASE_ANON_KEY. (No .env is baked in — it's gitignored.)
#
# Node 20 has no global WebSocket, so quizData.js polyfills it from `ws`.
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
# Persist the daily-quiz leaderboard/streaks across restarts by mounting a
# volume at /app/data (e.g. a Fly volume or Railway volume).
CMD ["node", "src/roleMenu.js"]
