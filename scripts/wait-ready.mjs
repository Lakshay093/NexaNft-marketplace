const urls = ['http://localhost:4000/health', 'http://localhost:8081', 'http://localhost:5173'];
for (const url of urls) {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      ready = (await fetch(url)).ok;
    } catch {
      /* Service is starting. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error(`Preview failed to start: ${url}`);
}
console.info('API, mobile export, and landing previews are ready.');
