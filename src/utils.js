/**
 * Shared utility functions for Rotation Reminder & Habit Engine
 * Includes XSS prevention, timezone-safe date strings, and safe JSON parsing.
 */

/**
 * Escapes unsafe HTML characters to prevent XSS attacks when interpolating dynamic strings into innerHTML.
 * @param {string|number|null|undefined} str
 * @returns {string} Safe HTML string
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates local date string in YYYY-MM-DD format using the device's local timezone.
 * Avoids the UTC offset bug of toISOString().split('T')[0] which rolls over prematurely in evening hours.
 * @param {Date|number|string} date
 * @returns {string} "YYYY-MM-DD"
 */
export function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = String(fallback.getMonth() + 1).padStart(2, '0');
    const day = String(fallback.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Safely parses JSON strings with error boundaries and fallback defaults.
 * Prevents corrupted storage values from crashing the application.
 * @param {string} raw
 * @param {*} defaultValue
 * @returns {*}
 */
export function safeJsonParse(raw, defaultValue = null) {
  if (raw === null || raw === undefined) return defaultValue;
  if (typeof raw !== 'string') {
    // Already parsed object/array
    return raw;
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed !== undefined ? parsed : defaultValue;
  } catch (err) {
    console.warn('Storage JSON parse corrupted, falling back safely:', err.message);
    return defaultValue;
  }
}

/**
 * Redacts any potential secrets, GitHub PATs, or Authorization headers from log strings.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeLogString(text) {
  if (!text) return '';
  return String(text)
    .replace(/github_pat_[a-zA-Z0-9_]+/g, 'github_pat_***')
    .replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_***')
    .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer ***');
}
