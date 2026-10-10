import crypto from 'crypto';

const candidateFields = [
  'geometry',
  'distanceMeters',
  'durationSeconds',
  'preference',
  'provider',
  'description',
  'steps'
];

export const getRerouteCandidatePayload = candidate => {
  const payload = Object.fromEntries(candidateFields.map(field => [
    field,
    field === 'preference'
      ? candidate?.[field] || 'FASTEST'
      : field === 'provider'
        ? candidate?.[field] || 'UNKNOWN'
        : field === 'description'
          ? candidate?.[field] || ''
          : field === 'steps'
            ? Array.isArray(candidate?.[field])
              ? candidate.steps.map(step => ({
                  maneuver: step.maneuver || 'CONTINUE',
                  instruction: step.instruction,
                  distance: step.distance ?? 0,
                  duration: step.duration ?? 0,
                  startLocation: step.startLocation || [],
                  endLocation: step.endLocation || [],
                  stepPolyline: step.stepPolyline || []
                }))
              : []
            : candidate?.[field]
  ]));
  return payload;
};

export const createRerouteCandidate = candidate => {
  const payload = getRerouteCandidatePayload(candidate);
  const candidateId = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  return { ...payload, candidateId };
};

export const isRerouteCandidateUnchanged = candidate =>
  Boolean(
    candidate?.candidateId &&
      createRerouteCandidate(candidate).candidateId === candidate.candidateId
  );
