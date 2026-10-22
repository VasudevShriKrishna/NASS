async function testUA(name, ua) {
  try {
    const r = await fetch('https://mycorps.vercel.app/', { headers: { 'User-Agent': ua } });
    const html = await r.text();
    console.log('=== ' + name + ' ===');
    console.log('Status:', r.status);
    const ogMatches = html.match(/<meta[^>]+(property|name)=["'](og:|twitter:)[^>]+>/gi) || [];
    console.log('og/twitter tags found:', ogMatches.length);
    ogMatches.forEach(m => console.log('  ', m));
  } catch (e) {
    console.error('Error for ' + name, e);
  }
}

async function run() {
  await testUA('WhatsApp', 'WhatsApp/2.21.12.21 i');
  await testUA('FacebookExternalHit', 'facebookexternalhit/1.1');
  await testUA('LinkedIn', 'LinkedInBot/1.0');
}
run();
