/**
 * SwiftCare GeoAgent — Accessible Map Popup Content Generators
 *
 * Generates styled, high-contrast HTML content for Leaflet popups.
 * Strictly formatted with accessible tags, units, timestamps, and epistemic indicators.
 */

import type { MapEmergency, MapIncident, MapRoute, MapVehicle, MapDeviation } from './types'

export function escapeHtml(str?: string | null): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/** Vehicle Popup */
export function createVehiclePopupHtml(vehicle: MapVehicle, predictionDelay?: number | null): string {
  const statusColor =
    vehicle.status === 'EN_ROUTE'
      ? '#3b82f6'
      : vehicle.status === 'DISPATCHED'
      ? '#f59e0b'
      : vehicle.status === 'AT_SCENE'
      ? '#10b981'
      : '#64748b'

  const freshnessBadge =
    vehicle.freshness === 'LIVE'
      ? '<span style="background:rgba(16,185,129,0.2);color:#10b981;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">LIVE</span>'
      : vehicle.freshness === 'STALE'
      ? '<span style="background:rgba(245,158,11,0.2);color:#f59e0b;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">STALE</span>'
      : '<span style="background:rgba(100,116,139,0.2);color:#94a3b8;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">OFFLINE</span>'

  const speedStr = typeof vehicle.speed === 'number' ? `${Math.round(vehicle.speed)} km/h` : '0 km/h'
  const headingStr = typeof vehicle.heading === 'number' ? `${Math.round(vehicle.heading)}°` : 'N/A'
  const timeStr = vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleTimeString() : 'N/A'

  return `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;min-width:200px;font-size:12px;line-height:1.4;color:#0f172a;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;">
          <span>🚑</span>
          <span>${escapeHtml(vehicle.vehicleId)}</span>
        </div>
        <div>${freshnessBadge}</div>
      </div>
      <div style="margin-bottom:4px;">
        <span style="color:#64748b;font-size:11px;">Status:</span>
        <strong style="color:${statusColor};">${escapeHtml(vehicle.status)}</strong>
      </div>
      <div style="margin-bottom:4px;">
        <span style="color:#64748b;font-size:11px;">Driver:</span>
        <strong>${escapeHtml(vehicle.driverName)}</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;background:#f8fafc;padding:6px;border-radius:6px;font-family:monospace;font-size:11px;">
        <div>Speed: <b>${speedStr}</b></div>
        <div>Heading: <b>${headingStr}</b></div>
      </div>
      ${
        vehicle.assignedEmergencyId
          ? `<div style="margin-bottom:4px;font-size:11px;">
               <span style="color:#64748b;">Emergency:</span>
               <a href="/emergencies/${encodeURIComponent(vehicle.assignedEmergencyId)}" style="color:#2563eb;font-weight:700;text-decoration:underline;">${escapeHtml(vehicle.assignedEmergencyId)}</a>
             </div>`
          : '<div style="color:#64748b;font-size:11px;font-style:italic;">No active emergency assigned</div>'
      }
      ${
        typeof predictionDelay === 'number'
          ? `<div style="margin-top:6px;padding:4px 8px;border-radius:4px;background:${
              predictionDelay > 5 ? '#fef2f2;color:#ef4444' : '#f0fdf4;color:#15803d'
            };font-weight:700;font-size:11px;">
               Corridor Delay: ${predictionDelay > 0 ? `+${predictionDelay.toFixed(1)}m` : 'On Schedule'}
             </div>`
          : ''
      }
      <div style="margin-top:6px;text-align:right;color:#94a3b8;font-size:10px;">
        Last Fix: ${timeStr}
      </div>
    </div>
  `
}

/** Emergency Pickup & Destination Popup */
export function createEmergencyPopupHtml(emergency: MapEmergency, isDestination = false): string {
  const priorityColor =
    emergency.priority === 'CRITICAL'
      ? '#ef4444'
      : emergency.priority === 'HIGH'
      ? '#f97316'
      : emergency.priority === 'MEDIUM'
      ? '#f59e0b'
      : '#3b82f6'

  if (isDestination) {
    return `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:200px;font-size:12px;color:#0f172a;">
        <div style="font-weight:700;font-size:13px;color:#10b981;margin-bottom:4px;display:flex;align-items:center;gap:4px;">
          <span>🏥</span>
          <span>Emergency Destination</span>
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:6px;">
          Corridor target for <strong>${escapeHtml(emergency.emergencyId)}</strong>
        </div>
        <div style="margin-bottom:6px;">
          <a href="/emergencies/${encodeURIComponent(emergency.emergencyId)}" style="color:#2563eb;font-weight:700;text-decoration:underline;font-size:11px;">
            Open Emergency Mission View →
          </a>
        </div>
      </div>
    `
  }

  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:220px;font-size:12px;line-height:1.4;color:#0f172a;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;">
          <span>🚨</span>
          <span>${escapeHtml(emergency.emergencyId)}</span>
        </div>
        <span style="background:${priorityColor};color:#ffffff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">
          ${escapeHtml(emergency.priority)}
        </span>
      </div>
      <div style="margin-bottom:4px;">
        <span style="color:#64748b;font-size:11px;">Type:</span>
        <strong>${escapeHtml(emergency.type)}</strong>
      </div>
      <div style="margin-bottom:4px;">
        <span style="color:#64748b;font-size:11px;">Status:</span>
        <strong style="color:#2563eb;">${escapeHtml(emergency.status)}</strong>
      </div>
      ${
        emergency.description
          ? `<p style="margin:6px 0;font-size:11px;color:#334155;background:#f8fafc;padding:6px;border-radius:6px;">
               ${escapeHtml(emergency.description)}
             </p>`
          : ''
      }
      <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;">
        <a href="/emergencies/${encodeURIComponent(emergency.emergencyId)}" style="color:#2563eb;font-weight:700;font-size:11px;text-decoration:underline;">
          View Mission Details →
        </a>
      </div>
    </div>
  `
}

/** Route Polyline Popup */
export function createRoutePopupHtml(route: MapRoute): string {
  const distKm = (route.distanceMeters / 1000).toFixed(2)
  const durMin = Math.round(route.durationSeconds / 60)
  const typeLabel =
    route.routeType === 'CURRENT'
      ? 'Active Traversed Route'
      : route.routeType === 'ALTERNATIVE'
      ? 'Alternative Candidate Route'
      : 'Planned Primary Route'

  const typeColor =
    route.routeType === 'CURRENT' ? '#10b981' : route.routeType === 'ALTERNATIVE' ? '#f59e0b' : '#3b82f6'

  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:210px;font-size:12px;color:#0f172a;line-height:1.4;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <strong style="color:${typeColor};font-size:13px;">${typeLabel}</strong>
        ${
          route.isRecommended
            ? '<span style="background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">RECOMMENDED</span>'
            : ''
        }
      </div>
      <div style="margin-bottom:4px;font-size:11px;">
        <span style="color:#64748b;">Route ID:</span>
        <code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;">${escapeHtml(route.routeId)}</code>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0;background:#f8fafc;padding:6px;border-radius:6px;font-size:11px;">
        <div>Distance: <b>${distKm} km</b></div>
        <div>ETA: <b>${durMin} min</b></div>
      </div>
      <div style="font-size:10px;color:#64748b;">
        Provider: <strong>${escapeHtml(route.provider || 'GOOGLE')}</strong> | Status: <strong>${escapeHtml(route.status)}</strong>
      </div>
    </div>
  `
}

/** Road Incident Popup */
export function createIncidentPopupHtml(incident: MapIncident): string {
  const sevColor =
    incident.severity === 'CRITICAL'
      ? '#ef4444'
      : incident.severity === 'HIGH'
      ? '#f97316'
      : incident.severity === 'MEDIUM'
      ? '#f59e0b'
      : '#64748b'

  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:210px;font-size:12px;color:#0f172a;line-height:1.4;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <div style="font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;">
          <span>⚠️</span>
          <span>${escapeHtml(incident.incidentId)}</span>
        </div>
        <span style="background:${sevColor};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">
          ${escapeHtml(incident.severity)}
        </span>
      </div>
      <div style="margin-bottom:4px;font-size:11px;">
        <span style="color:#64748b;">Type:</span>
        <strong>${escapeHtml(incident.type)}</strong>
      </div>
      ${
        incident.description
          ? `<p style="margin:6px 0;font-size:11px;color:#334155;background:#fef2f2;padding:6px;border-radius:6px;border-left:3px solid ${sevColor};">
               ${escapeHtml(incident.description)}
             </p>`
          : ''
      }
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
        Source: ${escapeHtml(incident.source || 'AUTOMATED_SYSTEM')} | Status: ${escapeHtml(incident.status)}
      </div>
    </div>
  `
}

/** Route Deviation Popup */
export function createDeviationPopupHtml(dev: MapDeviation): string {
  return `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;min-width:220px;font-size:12px;color:#0f172a;line-height:1.4;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-bottom:6px;">
        <strong style="color:#ef4444;font-size:13px;display:flex;align-items:center;gap:4px;">
          <span>⚠️</span>
          <span>ROUTE DEVIATION</span>
        </strong>
        <span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">
          ${escapeHtml(dev.status)}
        </span>
      </div>
      <div style="background:#fef2f2;padding:6px;border-radius:6px;margin-bottom:6px;font-size:11px;color:#991b1b;">
        <div>Cross-track: <b>${Math.round(dev.crossTrackDistanceMeters)} m off route</b></div>
        ${
          typeof dev.bearingDifferenceDegrees === 'number'
            ? `<div>Bearing Divergence: <b>${Math.round(dev.bearingDifferenceDegrees)}°</b></div>`
            : ''
        }
        <div>GPS Stability: <b>${escapeHtml(dev.stability || 'STABLE')}</b></div>
      </div>
      <div style="font-size:10px;color:#64748b;display:flex;justify-content:space-between;">
        <span>Epistemic Tier: <strong>${escapeHtml(dev.epistemicType || 'OBSERVED')}</strong></span>
        <span>${new Date(dev.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  `
}
