# Changelog

All notable changes to the GeoAgentic Emergency Response System Backend will be documented in this file.

## [Unreleased] - Part 4
### Added
- Added Emergency model
- Added Incident model
- Added emergency APIs (`/api/emergencies`)
- Added incident APIs (`/api/incidents`)
- Added vehicle assignment workflow with MongoDB transaction structure
- Added `2dsphere` geospatial indexes for locations and destinations
- Added strict GeoJSON Point validation
- Added soft-delete strategy for operational records
- Added emergency and incident role-based authorization
- Updated `README.md` with new endpoints and feature checklist
- Updated `WALKTHROUGH.md` with detailed architecture and security breakdown

### Changed
- Refactored architecture into a modular layout (`modules/auth`, `modules/vehicles`, `modules/emergencies`, `modules/incidents`, `shared/middleware`)
