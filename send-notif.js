const { google } = require('googleapis');

const CAL_ID = process.env.GCAL_ID;
const NTFY_URL = process.env.NTFY_URL;
const SA_KEY = JSON.parse(process.env.GCAL_SA_KEY);

const WINDOW_MIN = 35;

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: SA_KEY,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  const calendar = google.calendar({ version: 'v3', auth });

  // diagnostik: siapa gw, nuju ke mana
  console.log(`robot: ${SA_KEY.client_email}`);
  console.log(`target cal: @${CAL_ID.split('@')[1] || '(bukan format email)'}`);

  try {
    const meta = await calendar.calendars.get({ calendarId: CAL_ID });
    console.log(`cal check: OK, timezone ${meta.data.timeZone}`);
  } catch (e) {
    console.log(`cal check: GAGAL, code ${e.code}`);
    console.log('artinya: GCAL_ID salah, atau kalender belum ke-share ke robot ini');
    process.exit(1);
  }

  const now = new Date();
  const timeMin = new Date(now.getTime() - WINDOW_MIN * 60 * 1000);
  const timeMax = new Date(now.getTime() + 60 * 1000);

  const res = await calendar.events.list({
    calendarId: CAL_ID,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];
  console.log(`window ${WINDOW_MIN}m, ${events.length} event in window`);
  for (const ev of events) {
    console.log(`- "${ev.summary || '(judul kesembunyiin, cuma free/busy)'}" @ ${ev.start && (ev.start.dateTime || ev.start.date)}`);
  }

  let sent = 0;
  for (const ev of events) {
    const title = ev.summary || '';
    if (!title.includes('ANTI DONGO')) continue;

    const desc = ev.description || '';
    const m = desc.match(/prio\s*=\s*(\w+)/i);
    const priority = m ? m[1].toLowerCase() : 'high';

    const r = await fetch(NTFY_URL, {
      method: 'POST',
      body: title,
      headers: { Title: 'Anti Dongo', Priority: priority, Tags: 'rotating_light' },
    });
    console.log(`sent "${title}" [${priority}] -> ntfy ${r.status}`);
    sent++;
  }

  console.log(`done. matched & sent ${sent}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
