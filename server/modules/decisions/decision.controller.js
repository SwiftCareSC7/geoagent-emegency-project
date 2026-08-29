import decisionService from './decision.service.js';

/**
 * @desc    Generate a deterministic operational decision for an emergency.
 *          Loads all operational truth server-side and reconciles against the
 *          GeoAgent advisory recommendation. Decision is persisted in
 *          PENDING_OPERATOR_ACTION and is NOT auto-executed.
 * @route   POST /api/decisions/analyze
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const analyzeDecision = async (req, res, next) => {
  try {
    const { emergencyId } = req.body;
    const decision = await decisionService.analyzeEmergency(emergencyId);

    res.status(200).json({
      success: true,
      message: 'Decision generated and pending operator action',
      data: decision.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve a single decision by ID (with populated audit fields).
 * @route   GET /api/decisions/:decisionId
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const decision = await decisionService.getDecisionById(decisionId);

    res.status(200).json({
      success: true,
      data: decision.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List decisions for a specific emergency (paginated).
 * @route   GET /api/emergencies/:emergencyId/decisions
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const getEmergencyDecisions = async (req, res, next) => {
  try {
    const { emergencyId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await decisionService.getDecisionsForEmergency(emergencyId, page, limit);

    res.status(200).json({
      success: true,
      data: result.data.map((d) => d.toSafeObject()),
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a pending decision. Only ADMIN or CONTROL_ROOM may approve.
 * @route   PATCH /api/decisions/:decisionId/approve
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const approveDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const decision = await decisionService.approveDecision(decisionId, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Decision approved',
      data: decision.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject a pending decision with an optional reason.
 * @route   PATCH /api/decisions/:decisionId/reject
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const rejectDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const { reason } = req.body || {};
    const decision = await decisionService.rejectDecision(decisionId, req.user._id, reason);

    res.status(200).json({
      success: true,
      message: 'Decision rejected',
      data: decision.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Execute an APPROVED decision through the controlled action service.
 *          No autonomous dispatch. Each action is explicitly recorded in the
 *          decision audit trail.
 * @route   PATCH /api/decisions/:decisionId/execute
 * @access  Private (CONTROL_ROOM, ADMIN)
 */
export const executeDecision = async (req, res, next) => {
  try {
    const { decisionId } = req.params;
    const decision = await decisionService.executeDecision(decisionId, req.user._id);

    res.status(200).json({
      success: true,
      message: 'Decision executed',
      data: decision.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};