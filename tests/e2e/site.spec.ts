import { test, expect } from '@playwright/test';
import { manga, chapters } from '../fixtures';

test.beforeEach(async ({ page }) => {
  // Every network request is deterministic. No real account, manga pages or Firebase writes.
  await page.route('**/api/catalog/**', async route => {
    const url = new URL(route.request().url());
    let body: any = { data: [manga] };
    if (url.pathname.includes('/at-home/server/')) body = { result: 'ok', baseUrl: 'https://node.mangadex.network', chapter: { hash: 'h', dataSaver: ['1.jpg', '2.jpg'] } };
    else if (url.pathname.endsWith('/feed')) body = { data: chapters };
    else if (url.pathname.includes('/chapter/')) body = { data: chapters.find(c => url.pathname.endsWith(c.id)) || chapters[0] };
    else if (url.pathname.endsWith('/manga/manga-1')) body = { data: manga };
    else if (url.pathname.includes('/manga/') && !url.pathname.endsWith('/manga')) body = { data: null };
    else if (url.searchParams.get('title') === 'missing') body = { data: [] };
    await route.fulfill({ json: body });
  });
  await page.route('**/api/image-proxy?**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#222"/></svg>' }));
  await page.route(/https:\/\/(?!127\.0\.0\.1|localhost).*/, route => route.abort());
});
test('home renders feed and links to manga details', async ({ page }) => {
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Popular New Titles' })).toBeVisible();
  await page.getByRole('link').filter({ hasText: 'Roots Manga' }).first().click();
  await expect(page).toHaveURL(/\/manga\/manga-1$/); await expect(page.getByRole('heading', { name: 'Roots Manga' })).toBeVisible();
});
test('search reads URL and shows results', async ({ page }) => {
  await page.goto('/search?q=roots'); await expect(page.getByText('1 found')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Roots Manga' })).toBeVisible();
});
test('navbar submits and encodes search', async ({ page }) => {
  await page.goto('/'); await page.getByPlaceholder('Search mangas...').fill('ação & roots'); await page.getByPlaceholder('Search mangas...').press('Enter');
  await expect(page).toHaveURL(/\/search\?q=/); expect(new URL(page.url()).searchParams.get('q')).toBe('ação & roots');
});
test('search handles empty results', async ({ page }) => {
  await page.goto('/search?q=missing'); await expect(page.getByText('No mangas found. Try another search.')).toBeVisible();
});
test('search displays API failure', async ({ page }) => {
  await page.route('**/api/catalog/manga?**', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.goto('/search?q=roots'); await expect(page.getByText('Failed to fetch mangas')).toBeVisible();
});
test('manga detail opens chapter reader', async ({ page }) => {
  await page.goto('/manga/manga-1'); await page.getByRole('link').filter({ hasText: 'Capítulo 1' }).click();
  await expect(page).toHaveURL(/\/reader\/chapter-1$/); await expect(page.getByAltText('Page 1', { exact: true })).toBeVisible();
});
test('reader moves pages and chapters in ascending order', async ({ page }) => {
  await page.goto('/reader/chapter-2'); await expect(page.getByAltText('Page 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Prev Chapter' }).click(); await expect(page).toHaveURL(/chapter-1$/);
  await page.getByRole('button', { name: 'Next Page' }).click(); await expect(page.getByAltText('Page 2', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next Chapter' }).click(); await expect(page).toHaveURL(/chapter-2$/);
  await expect(page.getByAltText('Page 1', { exact: true })).toBeVisible();
});
test('last chapter has finish overlay', async ({ page }) => {
  await page.goto('/reader/chapter-3'); await page.getByRole('button', { name: 'Next Page' }).click();
  await page.getByRole('button', { name: 'Finish' }).click(); await expect(page.getByRole('heading', { name: "You've caught up!" })).toBeVisible();
});
test('legacy chapter route remains readable', async ({ page }) => {
  await page.goto('/chapter/chapter-1'); await expect(page.getByAltText('Page 1', { exact: true })).toBeVisible();
});
test('reader reports missing pages', async ({ page }) => {
  await page.route('**/api/catalog/at-home/server/**', route => route.fulfill({ json: { result: 'error' } }));
  await page.goto('/reader/chapter-1'); await expect(page.getByText('Failed to load chapter pages.')).toBeVisible();
});
test('unknown manga displays not found', async ({ page }) => {
  await page.goto('/manga/missing'); await expect(page.getByText('Manga not found.')).toBeVisible();
});
test('profile requires authentication', async ({ page }) => {
  await page.goto('/profile'); await expect(page.getByRole('heading', { name: 'Sign in to view your profile' })).toBeVisible();
});
test('catalog-only mode does not contact Firebase', async ({ page }) => {
  const firebaseRequests: string[] = [];
  page.on('request', req => { if (/firestore\.googleapis\.com|identitytoolkit\.googleapis\.com/.test(req.url())) firebaseRequests.push(req.url()); });
  await page.goto('/manga/manga-1'); await page.getByRole('button', { name: 'Reviews', exact: true }).click();
  await expect(page.getByText('No reviews yet. Be the first to share your thoughts!')).toBeVisible();
  expect(firebaseRequests).toEqual([]);
});
test('home fits viewport without horizontal overflow', async ({ page }, testInfo) => {
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Recommended' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });
});
