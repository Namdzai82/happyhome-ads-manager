const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const USER_TOKEN = process.env.META_USER_TOKEN;
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const PAGE_ID = '518267108710194';
const AD_ACCOUNT_ID = 'act_2200185813869842';

if (!USER_TOKEN || !PAGE_TOKEN) {
  console.log('Missing META_USER_TOKEN or META_PAGE_TOKEN environment variables. Skipping live sync.');
  process.exit(0);
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function run() {
  console.log('Starting 24/7 automated data sync from Meta Graph API...');

  try {
    // 1. Fetch conversations from Fanpage
    console.log('Fetching Fanpage conversations...');
    const convUrl = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=id,updated_time,message_count,unread_count,senders,messages.limit(15){id,message,created_time,from}&limit=100&access_token=${PAGE_TOKEN}`;
    const convRes = await fetchJson(convUrl);

    // 2. Fetch daily insights
    console.log('Fetching daily ads insights...');
    const dailyUrl = `https://graph.facebook.com/v19.0/${AD_ACCOUNT_ID}/insights?fields=date_start,date_stop,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,cost_per_action_type&time_increment=1&date_preset=maximum&access_token=${USER_TOKEN}`;
    const dailyRes = await fetchJson(dailyUrl);

    // Process & update if valid data returned
    if (convRes.data && dailyRes.data) {
      console.log(`Fetched ${convRes.data.length} conversations and ${dailyRes.data.length} days of ads data.`);

      // Read existing processed data to keep structure
      const processedPath = path.join(__dirname, 'processed_data.json');
      let processed = fs.existsSync(processedPath) ? JSON.parse(fs.readFileSync(processedPath, 'utf8')) : {};

      // Update daily records
      processed.daily = dailyRes.data.map(d => {
        const msgAction = d.actions?.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || '0';
        const costPerMsg = d.cost_per_action_type?.find(a => a.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value || '0';
        return {
          date: d.date_start,
          spend: Number(d.spend),
          impressions: Number(d.impressions),
          reach: Number(d.reach),
          clicks: Number(d.clicks),
          cpc: Math.round(Number(d.cpc || 0)),
          cpm: Math.round(Number(d.cpm || 0)),
          ctr: Number(d.ctr || 0).toFixed(2),
          messages: Number(msgAction),
          cost_per_message: Math.round(Number(costPerMsg))
        };
      });

      // Update conversations
      processed.conversations = convRes.data.map(c => {
        const senderObj = c.senders?.data?.find(s => s.id !== PAGE_ID) || { name: 'Khách Fanpage', id: 'unknown' };
        const msgs = (c.messages?.data || []).reverse();
        const textAll = msgs.map(m => m.message || '').join(' \n ');
        const phoneMatch = textAll.match(/(?:\+?84|0)(?:[\s.\-]?\d){9}/);

        return {
          id: c.id,
          customer_name: senderObj.name,
          customer_id: senderObj.id,
          updated_time: c.updated_time,
          message_count: c.message_count,
          unread_count: c.unread_count,
          phone: phoneMatch ? phoneMatch[0] : null,
          messages: msgs.map(m => ({
            from: m.from.name,
            is_page: m.from.id === PAGE_ID,
            time: m.created_time,
            text: m.message || ''
          }))
        };
      });

      fs.writeFileSync(processedPath, JSON.stringify(processed, null, 2));
      console.log('Saved updated processed_data.json.');

      // Rebuild index.html
      console.log('Rebuilding index.html...');
      require('./build.js');
      console.log('Automated 24/7 sync completed successfully!');
    } else {
      console.log('Meta API did not return new data (check token validity):', { convRes, dailyRes });
    }
  } catch (err) {
    console.error('Error during 24/7 automated sync:', err);
  }
}

run();
