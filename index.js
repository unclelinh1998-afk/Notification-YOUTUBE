require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");
const cron = require("node-cron");
const fs = require("fs");

const streamers = JSON.parse(fs.readFileSync("./streamers.json"));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let liveStatus = {};
let lastVideo = {};

function createEmbed(type, streamer, video) {
  return {
    title: video.snippet.title,
    url: `https://youtube.com/watch?v=${video.id.videoId}`,
    color: type === "live" ? 16711680 : 3447003,
    image: { url: video.snippet.thumbnails.high.url },
    author: { name: streamer.name },
    footer: {
      text: type === "live" ? "LIVE NOW" : "NEW VIDEO"
    }
  };
}

client.on("ready", async () => {
  console.log("BOT RUNNING (SIMPLE MODE)");

  const channel = await client.channels.fetch(process.env.CHANNEL_ID);

  cron.schedule("* * * * *", async () => {
    for (const streamer of streamers) {
      try {
        // LIVE
        const liveRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${streamer.channelId}&eventType=live&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );

        if (liveRes.data.items.length > 0) {
          if (!liveStatus[streamer.channelId]) {
            liveStatus[streamer.channelId] = true;

            const video = liveRes.data.items[0];

            await channel.send({
              content: `🔴 ${streamer.name} đang LIVE!`,
              embeds: [createEmbed("live", streamer, video)]
            });
          }
        } else {
          liveStatus[streamer.channelId] = false;
        }

        // UPLOAD
        const uploadRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${streamer.channelId}&order=date&maxResults=1&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );

        if (uploadRes.data.items.length > 0) {
          const video = uploadRes.data.items[0];

          if (!lastVideo[streamer.channelId]) {
            lastVideo[streamer.channelId] = video.id.videoId;
          } else if (lastVideo[streamer.channelId] !== video.id.videoId) {
            lastVideo[streamer.channelId] = video.id.videoId;

            await channel.send({
              content: `🎬 ${streamer.name} vừa ra video mới!`,
              embeds: [createEmbed("upload", streamer, video)]
            });
          }
        }

      } catch (err) {
        console.log(`Error (${streamer.name}):`, err.message);
      }
    }
  });
});

client.login(process.env.DISCORD_TOKEN);
