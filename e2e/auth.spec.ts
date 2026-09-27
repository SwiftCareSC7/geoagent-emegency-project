import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'spec.priyanshu@gmail.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'FzhexDCVDMj7AFb';

test.describe('SwiftCare GeoAgent — Comprehensive Auth & Role E2E Suite', () => {

  test.beforeEach(async ({ context }) => {
    // Start each test with clear cookies & storage
    await context.clearCookies();
  });

  // 1. Login Failure (Invalid credentials)
  test('1. Login failure with incorrect credentials displays clear error message', async ({ page }) => {
    page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('[Browser PageError]', err.message));
    page.on('requestfailed', (req) => console.log('[Request Failed]', req.url(), req.failure()?.errorText));
    page.on('response', (res) => {
      if (res.url().includes('/api/auth')) {
        console.log('[Auth Response]', res.url(), res.status());
      }
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    const alert = page.locator('#auth-error-alert');
    await expect(alert).toBeVisible({ timeout: 7000 });
    await expect(alert).toContainText('Invalid email or password');
  });

  // 2. Admin Login Success & Redirect to /admin
  test('2. Admin login success with valid credentials redirects to /admin', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASS);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
  });

  // 3. Refresh Persistence on Protected Route
  test('3. Refresh persistence retains authenticated admin session without kicking to login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    // Reload page
    await page.reload();
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
  });

  // 4. Logout Revocation
  test('4. Logout invalidates session and revokes access to protected pages', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin');

    // Click logout button
    const logoutBtn = page.getByRole('button', { name: /Log out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      const avatarBtn = page.locator('button:has(.lucide-user), button:has(.lucide-log-out)');
      await avatarBtn.first().click();
      await page.getByRole('button', { name: /Log out/i }).click();
    }

    await page.waitForURL(/.*\/login.*/, { timeout: 10000 });
    expect(page.url()).toContain('/login');

    // Try navigating back to /admin directly
    await page.goto('/admin');
    await page.waitForURL(/.*\/login\?redirect=.*/, { timeout: 10000 });
    expect(page.url()).toContain('/login?redirect=');
  });

  // 5. Protected Route Redirection with Returning Redirect
  test('5. Unauthenticated visit to protected route redirects to login, then returns after login', async ({ page }) => {
    await page.goto('/control-room');
    await page.waitForURL(/.*\/login\?redirect=%2Fcontrol-room/, { timeout: 10000 });

    // Login as dispatcher
    await page.fill('input#email', 'operator@swiftcare.local');
    await page.fill('input#password', 'Operator123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/control-room', { timeout: 10000 });
    expect(page.url()).toContain('/control-room');
  });

  // 6. Demo Role: Dispatcher
  test('6. Demo Dispatcher button logs in and redirects to /control-room', async ({ page }) => {
    await page.goto('/login');
    const dispatcherBtn = page.getByRole('button', { name: /Dispatcher/i });
    await expect(dispatcherBtn).toBeVisible();
    await dispatcherBtn.click();

    await page.waitForURL('**/control-room', { timeout: 10000 });
    expect(page.url()).toContain('/control-room');
  });

  // 7. Demo Role: Driver
  test('7. Demo Driver button logs in and redirects to /driver/dashboard', async ({ page }) => {
    await page.goto('/login');
    const driverBtn = page.getByRole('button', { name: /Driver/i });
    await expect(driverBtn).toBeVisible();
    await driverBtn.click();

    await page.waitForURL('**/driver/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/driver/dashboard');
  });

  // 8. Demo Role: Paramedic
  test('8. Demo Paramedic button logs in and redirects to /paramedic', async ({ page }) => {
    await page.goto('/login');
    const paramedicBtn = page.getByRole('button', { name: /Paramedic/i });
    await expect(paramedicBtn).toBeVisible();
    await paramedicBtn.click();

    await page.waitForURL('**/paramedic', { timeout: 10000 });
    expect(page.url()).toContain('/paramedic');
  });

  // 9. Demo Role: Admin
  test('9. Demo Admin button logs in and redirects to /admin', async ({ page }) => {
    await page.goto('/login');
    const adminBtn = page.getByRole('button', { name: /Admin/i });
    await expect(adminBtn).toBeVisible();
    await adminBtn.click();

    await page.waitForURL('**/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  // 10. Signup Client Validation Errors
  test('10. Signup form client-side validation enforces required fields and password rules', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    // Click submit with empty form
    await page.click('button[type="submit"]');

    // Error messages should be visible for required fields
    await expect(page.getByText('Full name is required')).toBeVisible();
    await expect(page.getByText('Email address is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
    await expect(page.getByText('Confirm your password')).toBeVisible();

    // Mismatched passwords
    await page.fill('input#name', 'Test Officer');
    await page.fill('input#email', 'test.officer@swiftcare.local');
    await page.fill('input#password', 'Password123!');
    await page.fill('input#confirmPassword', 'DifferentPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  // 11. Duplicate Email Signup Rejection
  test('11. Signup form rejects existing email with actionable error notification', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('input#name', 'Operator Duplicate');
    await page.fill('input#email', 'operator@swiftcare.local');
    await page.fill('input#password', 'OperatorPass123!');
    await page.fill('input#confirmPassword', 'OperatorPass123!');
    await page.click('button[type="submit"]');

    const alert = page.locator('#signup-error-alert');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('already registered');
  });

  // 12. Successful Signup & Immediate Authenticated Redirect
  test('12. Successful signup creates account, establishes session, and redirects by role', async ({ page }) => {
    const uniqueEmail = `paramedic.${Date.now()}@swiftcare.local`;

    await page.goto('/signup');
    await page.fill('input#name', 'Officer Anita Sharma');
    await page.fill('input#email', uniqueEmail);

    // Select Paramedic role
    const paramedicRoleBtn = page.getByRole('button', { name: /Paramedic/i });
    await paramedicRoleBtn.click();

    await page.fill('input#password', 'SecurePass123!');
    await page.fill('input#confirmPassword', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Should redirect to /paramedic
    await page.waitForURL('**/paramedic', { timeout: 10000 });
    expect(page.url()).toContain('/paramedic');
  });

  // 13. Role-Based Authorization Restriction
  test('13. Role authorization blocks Driver account from accessing /admin', async ({ page }) => {
    // Log in as Driver
    await page.goto('/login');
    await page.getByRole('button', { name: /Driver/i }).click();
    await page.waitForURL('**/driver/dashboard');

    // Attempt to access /admin
    await page.goto('/admin');
    await expect(page.getByText('Access Restricted')).toBeVisible();
    await expect(page.getByText('DRIVER', { exact: true })).toBeVisible();
    await expect(page.getByText('not authorized to view this screen')).toBeVisible();
  });

  // 14. Admin Role Selection on Signup
  test('14. Admin role selection on signup creates account and redirects directly to /admin', async ({ page }) => {
    const uniqueEmail = `admin.${Date.now()}@swiftcare.local`;

    await page.goto('/signup');
    await page.fill('input#name', 'Chief System Administrator');
    await page.fill('input#email', uniqueEmail);

    // Select Admin role
    const adminRoleBtn = page.getByRole('button', { name: /Admin/i });
    await expect(adminRoleBtn).toBeVisible();
    await adminRoleBtn.click();

    await page.fill('input#password', 'SecureAdminPass123!');
    await page.fill('input#confirmPassword', 'SecureAdminPass123!');
    await page.click('button[type="submit"]');

    // Should redirect to /admin
    await page.waitForURL('**/admin', { timeout: 10000 });
    expect(page.url()).toContain('/admin');
    await expect(page.getByRole('heading', { name: /Admin Console/i })).toBeVisible();
  });

});
