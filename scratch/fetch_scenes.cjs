const URL = 'https://fzqjakcgknoumzvjjfvq.supabase.co/rest/v1/scenes?select=*';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6cWpha2Nna25vdW16dmpqZnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzcxNjEsImV4cCI6MjA5MTc1MzE2MX0.aOFzkefT7RO7neZ2LEqiJI51mZoizno27aXZY1gtcn8';

async function run() {
  try {
    const response = await fetch(URL, {
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`
      }
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
run();
