/**
 * Demo access cookie — refreshed when users hit any `/demo/*` route (see middleware).
 * Tokens themselves do not expire in the database; persistence is mainly this cookie + URL.
 */
export const DEMO_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/** GET /api/demo/user — generous limit so dashboards / lessons / DevTools do not false-expire sessions */
export const DEMO_USER_API_RATE_LIMIT_PER_MINUTE = 240;
