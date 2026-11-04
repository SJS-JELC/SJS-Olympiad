import { expect, type Page } from './fixtures';

/** Use the actual access form: a fresh document always revokes its old session. */
export async function signInTeacher(page: Page) {
  const code = page.getByLabel('Teacher code', { exact: true });
  await expect(code).toBeVisible();
  await code.fill('5678');
  await page.locator('form').filter({ has: code }).getByRole('button', { name: 'GO', exact: true }).click();
  await expect(page.locator('.teacher-settings')).toBeVisible();
}

/** Navigate within the signed-in page so local preview working remains in memory. */
export async function openTeacher(page: Page, path = '/?settings') {
  if (page.url() === 'about:blank') {
    await page.goto('/');
    await signInTeacher(page);
  }
  const target = new URL(path, page.url());
  if (target.searchParams.has('theory') && !target.searchParams.has('eventId') && target.searchParams.has('question')) {
    if (!target.searchParams.has('year')) target.searchParams.set('year', 'L6');
    target.searchParams.set('catalogue', '');
  }
  await page.evaluate(path => {
    history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, target.pathname + target.search);
}

export async function openEvents(page: Page, path = '/?settings') {
  await openTeacher(page, path);
  const toggle = page.getByRole('button', { name: 'Events', exact: true });
  await expect(toggle).toBeVisible();
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  await expect(page.getByLabel('Selected event')).toBeVisible();
}

export async function reloadTeacher(page: Page, path = page.url()) {
  await page.reload();
  await signInTeacher(page);
  await openTeacher(page, path);
}
