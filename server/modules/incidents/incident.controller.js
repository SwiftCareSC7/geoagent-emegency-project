import * as incidentService from './incident.service.js';

/**
 * Handle incident creation
 */
export const createIncident = async (req, res, next) => {
  try {
    const incident = await incidentService.createIncident(req.body, req.user._id);
    
    res.status(201).json({
      success: true,
      message: 'Incident created successfully',
      data: incident.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle listing all active incidents
 */
export const getIncidents = async (req, res, next) => {
  try {
    const { status, severity, type } = req.query;
    const filters = { status, severity, type };
    
    const incidents = await incidentService.getIncidents(filters);
    
    res.status(200).json({
      success: true,
      count: incidents.length,
      data: incidents.map(i => i.toSafeObject())
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle getting a specific incident
 */
export const getIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    const incident = await incidentService.getIncidentById(incidentId);
    
    res.status(200).json({
      success: true,
      data: incident.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle updating an incident
 */
export const updateIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    const incident = await incidentService.updateIncident(incidentId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Incident updated successfully',
      data: incident.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle soft-deleting an incident
 */
export const deleteIncident = async (req, res, next) => {
  try {
    const { incidentId } = req.params;
    await incidentService.deleteIncident(incidentId);
    
    res.status(200).json({
      success: true,
      message: 'Incident deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
