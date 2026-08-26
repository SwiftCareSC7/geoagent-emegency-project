import { body } from 'express-validator';
import { validateCoordinates } from '../../shared/services/geospatial.service.js';

export const validateRouteCreation = [
  body('emergencyId')
    .notEmpty()
    .withMessage('Emergency ID is required')
    .isMongoId()
    .withMessage('Invalid Emergency ID format'),
  
  body('vehicleId')
    .notEmpty()
    .withMessage('Vehicle ID is required')
    .isMongoId()
    .withMessage('Invalid Vehicle ID format'),

  body('routeType')
    .optional()
    .isIn(['PLANNED', 'ALTERNATIVE'])
    .withMessage('Invalid routeType'),

  body('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isObject()
    .withMessage('Origin must be a GeoJSON object')
    .custom((value) => {
      if (value.type !== 'Point') throw new Error('Origin must be a GeoJSON Point');
      if (!validateCoordinates(value.coordinates)) throw new Error('Invalid origin coordinates. Must be [longitude, latitude] within valid ranges');
      return true;
    }),

  body('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isObject()
    .withMessage('Destination must be a GeoJSON object')
    .custom((value) => {
      if (value.type !== 'Point') throw new Error('Destination must be a GeoJSON Point');
      if (!validateCoordinates(value.coordinates)) throw new Error('Invalid destination coordinates. Must be [longitude, latitude] within valid ranges');
      return true;
    })
];
