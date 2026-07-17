const { google } = require('googleapis');

const CAL_ID = process.env.GCAL_ID;
const NTFY_URL = process.env.NTFY_URL;
const SA_KEY = JSON.parse(process.env.GCAL_SA_KEY);

const WINDOW_MIN = 35; // seberapa mundur kita cek notif yang baru due

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const timeMin = new Date(now.getTime() - WINDOW_MIN * 60 * 1000);
  const timeMax = new Date(now.getTime() + 60 * 1000);

  const res = await calendar.events.list({
    calendarId: CAL_ID,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    q: 'ANTI DONGO',
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];
  let sent = 0;

  for (const ev of events) {
    const title = ev.summary || '';
    if (!title.includes('ANTI DONGO')) continue; // skip DUMP & ✅ log

    const startStr = ev.start && (ev.start.dateTime || ev.start.date);
    if (!startStr) continue;
    const start = new Date(startStr);
    if (start < timeMin || start > timeMax) continue; // cuma yang baru due

    const desc = ev.description || '';
    const m = desc.match(/prio\s*=\s*(\w+)/i);
    const priority = m ? m[1].toLowerCase() : 'high';

    await fetch(NTFY_URL, {
      method: 'POST',
      body: title,
      headers: { Title: 'Anti Dongo', Priority: priority, Tags: 'rotating_light' },
    });
    sent++;
    console.log(`sent: ${title} [${priority}]`);
  }

  console.log(`done. window ${WINDOW_MIN}m, matched ${events.length}, sent ${sent}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
