import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
const mobileURL = process.env.E2E_MOBILE_URL ?? 'http://localhost:8081';
const landingURL = process.env.E2E_LANDING_URL ?? 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(mobileURL).hostname))
  throw new Error('Browser write tests only run against localhost development deployments.');
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const errors = [];
const sensitiveValues = new Set();
let page;
function redact(value) {
  let result = String(value).replace(/([?&]token=)[^\s"'&]+/g, '$1[redacted]');
  for (const secret of sensitiveValues) result = result.split(secret).join('[redacted]');
  return result;
}
async function waitImages(page) {
  await page.evaluate(() => {
    document.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
    });
  });
  await page.waitForFunction(
    () => [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    {},
    { timeout: 20000 },
  );
  await page.waitForTimeout(350);
}
try {
  await mkdir('docs/screenshots', { recursive: true });
  await mkdir('landing/public/screenshots', { recursive: true });
  page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    if (!['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)) {
      errors.push('Browser write tests refuse a remote API, even when the preview is local.');
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });
  await page.goto(mobileURL);
  await page.getByRole('button', { name: 'Start exploring' }).click();
  await page.getByRole('button', { name: /View / }).first().waitFor();
  await waitImages(page);
  await page.screenshot({ path: 'docs/screenshots/home.png' });
  await page.getByRole('tab', { name: /Explore/ }).click();
  const firstArtwork = page.getByRole('button', { name: /^View / }).first();
  await firstArtwork.waitFor();
  const artworkLabel = await firstArtwork.getAttribute('aria-label');
  assert.ok(artworkLabel?.startsWith('View '), 'A listed artwork is available to exercise search');
  const artworkName = artworkLabel.slice(5);
  await waitImages(page);
  await page.screenshot({ path: 'docs/screenshots/explore.png' });
  const response = page.waitForResponse(
    (r) =>
      r.url().includes('/api/search') && new URL(r.url()).searchParams.get('q') === artworkName,
  );
  await page.getByLabel('Search NFTs').fill(artworkName);
  assert.equal((await response).status(), 200);
  await page.getByRole('button', { name: artworkLabel, exact: true }).click();
  await page.getByRole('button', { name: 'Share artwork' }).waitFor();
  await page.waitForURL(/\/nft\/[a-f0-9-]+$/);
  await page.getByText('Artwork', { exact: true }).waitFor();
  await waitImages(page);
  await page.screenshot({ path: 'docs/screenshots/detail.png' });
  const nftId = new URL(page.url()).pathname.split('/').pop();
  await page.getByRole('button', { name: '♡ Save to favorites' }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  await page.getByText('New here? Create an account').click();
  const suffix = Date.now().toString(36);
  const username = `qa_${suffix}`;
  const email = `${username}@example.test`;
  await page.getByLabel('Full name', { exact: true }).fill('Browser QA Artist');
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Email', { exact: true }).filter({ visible: true }).fill(email);
  const password = `Browser-Test1!${randomUUID().slice(0, 8)}`;
  sensitiveValues.add(password);
  await page.getByLabel('Password', { exact: true }).filter({ visible: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('tab', { name: /Profile/ }).waitFor();
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  const avatarUpload = page.waitForResponse(
    (r) => r.url().includes('/api/uploads') && r.request().method() === 'POST',
  );
  const avatarChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Change profile picture' }).click();
  await (await avatarChooser).setFiles('mobile/assets/icon.png');
  assert.equal((await avatarUpload).status(), 201);
  await page
    .getByLabel('Bio', { exact: true })
    .fill('Verified through the browser against the real API.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page
    .getByText('Verified through the browser against the real API.', { exact: true })
    .waitFor();
  await page.goto(`${mobileURL}/nft/${nftId}`);
  await page.getByRole('button', { name: '♡ Save to favorites' }).waitFor();
  await page.getByRole('button', { name: '♡ Save to favorites' }).click();
  await page.getByRole('button', { name: '♥ Saved to favorites' }).waitFor();
  await page.goto(`${mobileURL}/favorites`);
  await page.getByRole('button', { name: artworkLabel, exact: true }).waitFor();
  await page.getByRole('button', { name: artworkLabel, exact: true }).click();
  await page.getByRole('button', { name: '♥ Saved to favorites' }).click();
  await page.getByRole('button', { name: '♡ Save to favorites' }).waitFor();
  await page.getByRole('button', { name: 'Collect · demo transfer' }).click();
  await page.getByText('A demo, with real platform records.', { exact: true }).waitFor();
  const transfer = page.waitForResponse((r) =>
    r.url().endsWith(`/api/nfts/${nftId}/demo-transfer`),
  );
  await page.getByRole('button', { name: 'Confirm demo transfer' }).click();
  assert.equal((await transfer).status(), 200);
  await page.getByRole('button', { name: 'Edit listing', exact: true }).waitFor();
  await page.goto(`${mobileURL}/my-nfts`);
  await page.getByRole('button', { name: artworkLabel, exact: true }).waitFor();
  const notificationResponse = page.waitForResponse(
    (r) => r.url().includes('/api/notifications') && r.request().method() === 'GET',
  );
  await page.goto(`${mobileURL}/notifications`);
  const notifications = await (await notificationResponse).json();
  assert.ok(
    notifications.data.some((n) => !n.readAt),
    'Demo transfer creates an unread notification',
  );
  const markRead = page.waitForResponse(
    (r) => r.url().endsWith('/api/notifications/read-all') && r.request().method() === 'PATCH',
  );
  const readNotifications = page.waitForResponse(
    (r) => r.url().includes('/api/notifications') && r.request().method() === 'GET',
  );
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  assert.equal((await markRead).status(), 200);
  assert.ok((await (await readNotifications).json()).data.every((n) => n.readAt));
  const collectionName = `Browser QA Collection ${suffix}`;
  await page.goto(`${mobileURL}/create-collection`);
  const coverUpload = page.waitForResponse(
    (r) => r.url().includes('/api/uploads') && r.request().method() === 'POST',
  );
  const coverChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload cover image' }).click();
  await (await coverChooser).setFiles('mobile/assets/icon.png');
  assert.equal((await coverUpload).status(), 201);
  await page.getByLabel('Collection name', { exact: true }).fill(collectionName);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A collection with a real uploaded cover.');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await page.waitForURL(/\/collection\/[a-f0-9-]+$/);
  const collectionURL = page.url();
  await page.getByText(collectionName, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'By Browser QA Artist ↗' }).click();
  await page.waitForURL(/\/creator\/[a-f0-9-]+$/);
  await page.getByText(`@${username} · Joined`, { exact: false }).waitFor();
  await page.goto(`${mobileURL}/create`);
  await page.getByRole('button', { name: 'Select artwork' }).waitFor();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select artwork' }).click();
  await (await chooser).setFiles('mobile/assets/icon.png');
  await page.getByRole('button', { name: 'Choose another image' }).waitFor();
  await page.getByLabel('Artwork name', { exact: true }).fill(`Browser QA ${suffix}`);
  await page
    .getByLabel('Description', { exact: true })
    .fill('A real artwork uploaded through the Expo web application during browser verification.');
  await page.getByLabel('Price (ETH denomination)', { exact: true }).fill('1.75');
  await page.getByRole('button', { name: collectionName, exact: true }).click();
  await page.getByRole('button', { name: 'Publish listing' }).click();
  await page.getByRole('button', { name: 'Edit listing', exact: true }).waitFor();
  await page.waitForURL(/\/nft\/[a-f0-9-]+$/);
  const createdNFTURL = page.url();
  await page.getByRole('button', { name: 'Edit listing', exact: true }).click();
  const editedArtworkName = `Browser QA Edited ${suffix}`;
  await page.getByLabel('Artwork name', { exact: true }).fill(editedArtworkName);
  await page.getByLabel('Price (ETH denomination)', { exact: true }).fill('2.25');
  await page.getByRole('button', { name: `✓ ${collectionName}`, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page
    .getByText(editedArtworkName, { exact: true })
    .filter({ visible: true })
    .first()
    .waitFor();
  await page
    .getByRole('button', { name: `Collection: ${collectionName} ↗`, exact: true })
    .waitFor();
  await page.goto(collectionURL);
  await page.getByRole('button', { name: `View ${editedArtworkName}`, exact: true }).waitFor();
  await page.goto(`${mobileURL}/my-nfts?mode=created`);
  await page.getByRole('button', { name: `View ${editedArtworkName}`, exact: true }).waitFor();
  await page.goto(`${mobileURL}/activity`);
  await page.getByText('Around the marketplace', { exact: true }).waitFor();
  await page.getByText(editedArtworkName, { exact: true }).first().waitFor();
  await page.goto(createdNFTURL);
  await page.getByRole('button', { name: 'Unlist artwork' }).click();
  await page.getByRole('button', { name: 'Relist artwork' }).waitFor();
  await page.getByRole('button', { name: 'Relist artwork' }).click();
  await page.getByRole('button', { name: 'Unlist artwork' }).waitFor();
  await page.getByRole('button', { name: 'Remove listing', exact: true }).click();
  await page.getByRole('button', { name: 'Remove listing', exact: true }).last().click();
  await page.getByLabel('Search NFTs').waitFor();
  await page.goto(`${mobileURL}/settings`);
  await page.getByText('Made by Lakshay Dhiman', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Enable device notifications' }).click();
  await page
    .getByText('Device notifications are available in the Android and iOS app.', { exact: true })
    .waitFor();
  await page.goto(`${mobileURL}/profile`);
  const logout = page.waitForResponse((r) => r.url().endsWith('/api/auth/logout'));
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  assert.equal((await logout).status(), 200);
  await page.waitForURL((url) => url.pathname === '/');
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
  if (process.env.E2E_MAIL_DIR) {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByText('Forgot password?', { exact: true }).click();
    await page.getByLabel('Email', { exact: true }).filter({ visible: true }).fill(email);
    const recovery = page.waitForResponse((r) => r.url().endsWith('/api/auth/forgot-password'));
    await page.getByRole('button', { name: 'Send recovery link' }).click();
    assert.equal((await recovery).status(), 200);
    await page
      .getByText('If that email is registered, a recovery link has been sent.', { exact: true })
      .waitFor();
    let resetToken;
    for (const file of await readdir(process.env.E2E_MAIL_DIR)) {
      if (!file.endsWith('.eml')) continue;
      const message = await readFile(path.join(process.env.E2E_MAIL_DIR, file), 'utf8');
      if (!message.startsWith(`To: ${email}\n`)) continue;
      const resetURL = message.match(/Reset your NexaNFT password: (\S+)/)?.[1];
      if (resetURL) resetToken = new URL(resetURL).searchParams.get('token');
    }
    assert.ok(
      resetToken,
      'Recovery mail for the isolated QA account is written to the local outbox',
    );
    sensitiveValues.add(resetToken);
    const resetURL = new URL('/reset-password', mobileURL);
    resetURL.searchParams.set('token', resetToken);
    await page.goto(resetURL.toString());
    const newPassword = `Browser-New1!${randomUUID().slice(0, 8)}`;
    sensitiveValues.add(newPassword);
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm password', { exact: true }).fill(newPassword);
    const reset = page.waitForResponse((r) => r.url().endsWith('/api/auth/reset-password'));
    await page.getByRole('button', { name: 'Reset password', exact: true }).click();
    assert.equal((await reset).status(), 200);
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor();
    await page.getByLabel('Email', { exact: true }).filter({ visible: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).filter({ visible: true }).fill(password);
    const rejectedLogin = page.waitForResponse((r) => r.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    assert.equal((await rejectedLogin).status(), 401, 'Previous password is revoked');
    await page.getByRole('alert').waitFor();
    await page.getByLabel('Password', { exact: true }).filter({ visible: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('tab', { name: /Profile/ }).waitFor();
    await page.getByRole('tab', { name: /Profile/ }).click();
    await page
      .getByText('Verified through the browser against the real API.', { exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  }
  for (const name of ['home', 'explore', 'detail'])
    await copyFile(`docs/screenshots/${name}.png`, `landing/public/screenshots/${name}.png`);
  const landing = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  landing.on('pageerror', (error) => errors.push(error.message));
  await landing.goto(landingURL);
  await landing.locator('.art-grid .art-card').first().waitFor();
  await waitImages(landing);
  assert.equal(
    await landing.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await landing.screenshot({ path: 'docs/screenshots/landing.png', fullPage: true });
  await landing.screenshot({ path: 'docs/screenshots/landing-hero.png' });
  await landing.locator('.art-grid .art-card').first().click();
  await landing.getByRole('dialog').waitFor();
  await landing.getByRole('button', { name: 'Close dialog' }).click();
  await landing.getByRole('button', { name: 'Android app' }).click();
  await landing.getByRole('dialog').waitFor();
  assert.match(await landing.getByRole('dialog').innerText(), /has not been published/);
  await landing.keyboard.press('Escape');
  await landing.setViewportSize({ width: 390, height: 844 });
  await landing.screenshot({ path: 'docs/screenshots/landing-mobile.png', fullPage: true });
  assert.equal(
    await landing.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  assert.deepEqual(errors, [], 'No runtime JavaScript errors are allowed');
  console.info(
    'Browser verification passed: browsing, search, registration, avatar/profile editing, session restoration, favorites, acknowledged demo transfer, notifications/read-all, collection cover/creation, creator/collection links, listing create/edit/collection retention/unlist/relist/remove, activity, My works, settings, logout, landing dialogs, and responsive layouts.' +
      (process.env.E2E_MAIL_DIR
        ? ' Local password recovery and sign-in with the replacement password passed.'
        : ''),
  );
} catch (error) {
  if (page) {
    await mkdir('.test-artifacts', { recursive: true });
    await page.screenshot({ path: '.test-artifacts/browser-failure.png' });
    console.error(
      'Browser failure:',
      redact(page.url()),
      redact((await page.locator('body').innerText()).slice(0, 2000)),
    );
  }
  throw new Error(redact(error.stack ?? error));
} finally {
  await browser.close();
}
