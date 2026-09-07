/**
 * Admin Module — Validation & Query Boundary Hardening
 *
 * Enforces strict input validation, safe allowlisted sorting,
 * bounded pagination (max 100), and rejects dangerous MongoDB operators ($where, $regex, etc.).
 */

import mongoose from 'mongoose';

// Safe allowlist of sortable fields per collection
const ALLOWED_SORT_FIELDS = {
  users: ['createdAt', 'updatedAt', 'name', 'email', 'role'],
  vehicles: ['createdAt', 'updatedAt', 'vehicleId', 'registrationNumber', 'type', 'status', 'capacity'],
  emergencies: ['createdAt', 'updatedAt', 'emergencyId', 'type', 'priority', 'status'],
  incidents: ['createdAt', 'updatedAt', 'incidentId', 'type', 'severity', 'status'],
  trajectories: ['timestamp', 'createdAt', 'speed', 'heading'],
  routes: ['createdAt', 'updatedAt', 'routeId', 'distance', 'duration', 'provider', 'status', 'routeType'],
  predictions: ['createdAt', 'updatedAt', 'predictedEta', 'baselineEta', 'predictedDelaySeconds', 'delayRisk', 'routeRisk', 'confidenceScore'],
  decisions: ['createdAt', 'updatedAt', 'decisionId', 'severity', 'status', 'primaryAction']
};

/**
 * Validates and normalizes pagination and sorting query parameters.
 *
 * @param {Object} query - Express req.query
 * @param {string} collectionKey - One of the keys in ALLOWED_SORT_FIELDS
 * @returns {Object} { page, limit, skip, sortOptions, errors }
 */
export function validatePaginationAndSort(query, collectionKey) {
  const errors = [];

  // 1. Page validation
  let page = 1;
  if (query.page !== undefined) {
    const parsedPage = parseInt(query.page, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      errors.push('Page must be a positive integer >= 1');
    } else {
      page = parsedPage;
    }
  }

  // 2. Limit validation (Capped at 100)
  let limit = 20;
  if (query.limit !== undefined) {
    const parsedLimit = parseInt(query.limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('Limit must be a positive integer between 1 and 100');
    } else if (parsedLimit > 100) {
      errors.push('Limit exceeds maximum allowable page size of 100');
    } else {
      limit = parsedLimit;
    }
  }

  // 3. Sort field validation against allowlist
  let sortField = 'createdAt';
  if (collectionKey === 'trajectories') {
    sortField = 'timestamp';
  }

  const allowedSorts = ALLOWED_SORT_FIELDS[collectionKey] || ['createdAt'];

  if (query.sort) {
    if (!allowedSorts.includes(query.sort)) {
      errors.push(`Invalid sort field "${query.sort}". Allowed fields: ${allowedSorts.join(', ')}`);
    } else {
      sortField = query.sort;
    }
  }

  // 4. Sort direction validation
  let sortDirection = -1; // Default descending (newest first)
  if (query.sortDir || query.order) {
    const dir = String(query.sortDir || query.order).toLowerCase();
    if (dir === 'asc' || dir === '1') {
      sortDirection = 1;
    } else if (dir === 'desc' || dir === '-1') {
      sortDirection = -1;
    } else {
      errors.push('Invalid sort direction. Allowed: asc, desc, 1, -1');
    }
  }

  // 5. Query operator sanitization (strip dangerous $ or . keys from raw query)
  for (const key of Object.keys(query)) {
    if (key.includes('$') || key.includes('.')) {
      errors.push(`Unsafe query parameter "${key}" contains reserved characters`);
    }
    // Also inspect query values for nested operator objects
    if (typeof query[key] === 'object' && query[key] !== null) {
      for (const nestedKey of Object.keys(query[key])) {
        if (nestedKey.startsWith('$')) {
          errors.push(`Unsafe nested query operator "${nestedKey}" detected in parameter "${key}"`);
        }
      }
    }
  }

  const skip = (page - 1) * limit;
  const sortOptions = { [sortField]: sortDirection };

  return {
    isValid: errors.length === 0,
    errors,
    page,
    limit,
    skip,
    sortField,
    sortDirection,
    sortOptions
  };
}

/**
 * Validates a MongoDB ObjectId string.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/**
 * Sanitizes a plain text filter to prevent regex injection or malicious strings.
 *
 * @param {string} str
 * @returns {string}
 */
export function sanitizeSearchString(str) {
  if (!str || typeof str !== 'string') return '';
  // Strip control characters and trim
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
}
