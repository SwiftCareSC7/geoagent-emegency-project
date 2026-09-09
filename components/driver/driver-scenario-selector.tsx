'use client'

import React, { useState, useMemo } from 'react'
import {
  X,
  Search,
  Check,
  Navigation,
  AlertTriangle,
  Flame,
  Radio,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  Car
} from 'lucide-react'

export interface ScenarioDefinition {
  id: string
  code: string
  title: string
  subtitle: string
  originName: string
  originCoordinates: [number, number]
  emergencyName: string
  emergencyCoordinates: [number, number]
  destinationName: string
  destinationCoordinates: [number, number]
  vehicleId: string
  emergencyId: string
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  type: string
  expectedTimeSavedMinutes: number
  scenarioTag: string
  callerContact?: string
  hasDeviation?: boolean
  hasAutoReroute?: boolean
  hasRoadClosure?: boolean
  hasBackupAmbulance?: boolean
  requiresReroute?: boolean
  hasClearance?: boolean
}

export const CANONICAL_DEMO_SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'DEMO-001',
    code: 'DEMO_001',
    title: 'Demo 001: Koramangala to Manipal Hospital',
    subtitle: 'Heavy Traffic + Accident Ahead -> Indiranagar Reroute (Save 6 min)',
    originName: 'Koramangala 80ft Road Depot',
    originCoordinates: [77.6271, 12.9352],
    emergencyName: 'Intermediate Ring Road Flyover',
    emergencyCoordinates: [77.6410, 12.9490],
    destinationName: 'Manipal Hospital (HAL Old Airport Rd)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-01',
    emergencyId: 'E-DEMO-001',
    priority: 'CRITICAL',
    type: 'ACCIDENT',
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Flagship Reroute & V2X Clearance',
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-002',
    code: 'DEMO_002',
    title: 'Demo 002: Hebbal to Victoria Hospital',
    subtitle: 'Moderate Traffic + Road Closure -> Alternative Palace Rd Bypass',
    originName: 'Hebbal Flyover Service Lane',
    originCoordinates: [77.5925, 13.0358],
    emergencyName: 'RT Nagar Main Post Office',
    emergencyCoordinates: [77.5890, 13.0180],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-02',
    emergencyId: 'E-DEMO-002',
    priority: 'CRITICAL',
    type: 'ACCIDENT',
    expectedTimeSavedMinutes: 4,
    scenarioTag: 'Road Closure & Bypass Candidate',
    hasRoadClosure: true,
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-003',
    code: 'DEMO_003',
    title: 'Demo 003: Whitefield to Sakra World Hospital',
    subtitle: 'Severe Congestion + Ambulance Deviation -> Automatic Recalculation',
    originName: 'Whitefield ITPL Main Gate',
    originCoordinates: [77.7500, 12.9698],
    emergencyName: 'Kundalahalli Gate Tech Park',
    emergencyCoordinates: [77.7120, 12.9650],
    destinationName: 'Sakra World Hospital (Bellandur)',
    destinationCoordinates: [77.6890, 12.9288],
    vehicleId: 'AMB-03',
    emergencyId: 'E-DEMO-003',
    priority: 'HIGH',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 7,
    scenarioTag: 'Ambulance Deviation & Auto Recalculation',
    hasDeviation: true,
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-004',
    code: 'DEMO_004',
    title: 'Demo 004: Yelahanka to Bowring Hospital',
    subtitle: 'Normal Traffic -> Stable Corridor -> No Reroute Required',
    originName: 'Yelahanka Police Station',
    originCoordinates: [77.5963, 13.1007],
    emergencyName: 'Sahakar Nagar Residential Block',
    emergencyCoordinates: [77.5900, 13.0600],
    destinationName: 'Bowring & Lady Curzon Hospital',
    destinationCoordinates: [77.6033, 12.9833],
    vehicleId: 'AMB-04',
    emergencyId: 'E-DEMO-004',
    priority: 'HIGH',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Normal Traffic Baseline (No Reroute)',
    requiresReroute: false
  },
  {
    id: 'DEMO-005',
    code: 'DEMO_005',
    title: 'Demo 005: Electronic City to St John\'s Hospital',
    subtitle: 'Accident + Heavy Congestion -> Backup Ambulance Recommendation',
    originName: 'Electronic City Phase 1 Toll',
    originCoordinates: [77.6766, 12.8452],
    emergencyName: 'Bommanahalli Junction Underpass',
    emergencyCoordinates: [77.6400, 12.9050],
    destinationName: 'St John\'s Medical College Hospital',
    destinationCoordinates: [77.6200, 12.9315],
    vehicleId: 'AMB-05',
    emergencyId: 'E-DEMO-005',
    priority: 'CRITICAL',
    type: 'ACCIDENT',
    expectedTimeSavedMinutes: 8,
    scenarioTag: 'Backup Ambulance Dispatch',
    hasBackupAmbulance: true,
    hasClearance: true
  },
  {
    id: 'DEMO-006',
    code: 'DEMO_006',
    title: 'Demo 006: Indiranagar to Manipal Hospital',
    subtitle: 'Pediatric Seizure -> Old Madras Rd Bypass -> Save 5 min',
    originName: '100ft Road Indiranagar',
    originCoordinates: [77.6412, 12.9784],
    emergencyName: 'CMH Road Metro Station',
    emergencyCoordinates: [77.6440, 12.9780],
    destinationName: 'Manipal Hospital (HAL Old Airport Rd)',
    destinationCoordinates: [77.6483, 12.9582],
    vehicleId: 'AMB-07',
    emergencyId: 'E-DEMO-006',
    priority: 'HIGH',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 5,
    scenarioTag: 'Pediatric Urgency Corridor',
    hasAutoReroute: true
  },
  {
    id: 'DEMO-007',
    code: 'DEMO_007',
    title: 'Demo 007: HSR Layout to St John\'s Hospital',
    subtitle: 'Severe Asthma -> Silk Board Waterlogging -> Deviation Detected',
    originName: 'HSR Layout Sector 1 BDA Complex',
    originCoordinates: [77.6480, 12.9120],
    emergencyName: 'Agara Lake Service Road',
    emergencyCoordinates: [77.6350, 12.9210],
    destinationName: 'St John\'s Medical College Hospital',
    destinationCoordinates: [77.6200, 12.9315],
    vehicleId: 'AMB-09',
    emergencyId: 'E-DEMO-007',
    priority: 'HIGH',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Weather & Waterlogging Deviation',
    hasDeviation: true
  },
  {
    id: 'DEMO-008',
    code: 'DEMO_008',
    title: 'Demo 008: Marathahalli to Sakra World Hospital',
    subtitle: 'Industrial Burn Trauma -> Flyover Truck Breakdown -> ORR Bypass',
    originName: 'Marathahalli Bridge Bus Stop',
    originCoordinates: [77.7010, 12.9550],
    emergencyName: 'Kadubeesanahalli Signal',
    emergencyCoordinates: [77.6950, 12.9390],
    destinationName: 'Sakra World Hospital (Bellandur)',
    destinationCoordinates: [77.6890, 12.9288],
    vehicleId: 'AMB-10',
    emergencyId: 'E-DEMO-008',
    priority: 'CRITICAL',
    type: 'TRAUMA',
    expectedTimeSavedMinutes: 7,
    scenarioTag: 'Outer Ring Road Breakdown Bypass',
    hasAutoReroute: true
  },
  {
    id: 'DEMO-009',
    code: 'DEMO_009',
    title: 'Demo 009: Jayanagar to Victoria Hospital',
    subtitle: 'Diabetic Coma -> Stable Arterial Flow -> No Reroute',
    originName: 'Jayanagar 4th Block Complex',
    originCoordinates: [77.5830, 12.9290],
    emergencyName: 'Ashoka Pillar Circle',
    emergencyCoordinates: [77.5820, 12.9430],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-11',
    emergencyId: 'E-DEMO-009',
    priority: 'MEDIUM',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Stable South Bengaluru Arterial',
    requiresReroute: false
  },
  {
    id: 'DEMO-010',
    code: 'DEMO_010',
    title: 'Demo 010: JP Nagar to Fortis Hospital',
    subtitle: 'Fall with Head Trauma -> Sarakki Lake Lane Blockage -> Save 4 min',
    originName: 'JP Nagar 6th Phase Circle',
    originCoordinates: [77.5850, 12.9050],
    emergencyName: 'Sarakki Lake Gate',
    emergencyCoordinates: [77.5890, 12.9020],
    destinationName: 'Fortis Hospital (Bannerghatta Rd)',
    destinationCoordinates: [77.5990, 12.8940],
    vehicleId: 'AMB-12',
    emergencyId: 'E-DEMO-010',
    priority: 'HIGH',
    type: 'TRAUMA',
    expectedTimeSavedMinutes: 4,
    scenarioTag: 'Bannerghatta Bypass Reroute',
    hasAutoReroute: true
  },
  {
    id: 'DEMO-011',
    code: 'DEMO_011',
    title: 'Demo 011: Rajajinagar to Bangalore Baptist Hospital',
    subtitle: 'Cardiac Arrhythmia -> Clean Flyover Transit -> No Reroute',
    originName: 'Rajajinagar 1st Block Metro',
    originCoordinates: [77.5550, 12.9980],
    emergencyName: 'Navrang Theatre Circle',
    emergencyCoordinates: [77.5560, 12.9970],
    destinationName: 'Bangalore Baptist Hospital (Hebbal)',
    destinationCoordinates: [77.5890, 13.0290],
    vehicleId: 'AMB-14',
    emergencyId: 'E-DEMO-011',
    priority: 'CRITICAL',
    type: 'CARDIAC',
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Clean Flyover Green Wave',
    requiresReroute: false
  },
  {
    id: 'DEMO-012',
    code: 'DEMO_012',
    title: 'Demo 012: Malleshwaram to Ramaiah Memorial Hospital',
    subtitle: 'Obstetric Hemorrhage -> Market Blockade -> Backup Recommended',
    originName: 'Malleshwaram 8th Cross',
    originCoordinates: [77.5710, 13.0030],
    emergencyName: 'Margosa Road Circle',
    emergencyCoordinates: [77.5710, 13.0010],
    destinationName: 'Ramaiah Memorial Hospital (MSR Nagar)',
    destinationCoordinates: [77.5670, 13.0300],
    vehicleId: 'AMB-08',
    emergencyId: 'E-DEMO-012',
    priority: 'CRITICAL',
    type: 'OBSTETRIC',
    expectedTimeSavedMinutes: 9,
    scenarioTag: 'Obstetric Emergency & Standby Dispatch',
    hasBackupAmbulance: true
  },
  {
    id: 'DEMO-013',
    code: 'DEMO_013',
    title: 'Demo 013: Banashankari to Sagar Hospitals',
    subtitle: 'Aortic Dissection -> 100ft Ring Rd Bypass -> Save 5 min',
    originName: 'Banashankari BDA Complex',
    originCoordinates: [77.5560, 12.9250],
    emergencyName: 'Banashankari 2nd Stage Junction',
    emergencyCoordinates: [77.5600, 12.9300],
    destinationName: 'Sagar Hospitals (Banashankari)',
    destinationCoordinates: [77.5560, 12.9250],
    vehicleId: 'AMB-17',
    emergencyId: 'E-DEMO-013',
    priority: 'CRITICAL',
    type: 'CARDIAC',
    expectedTimeSavedMinutes: 5,
    scenarioTag: 'Aortic Dissection & Emergency Clearance',
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-014',
    code: 'DEMO_014',
    title: 'Demo 014: BTM Layout to Jayadeva Cardiology',
    subtitle: 'Gym Cardiac Arrest -> Central Silk Board Bypass -> Save 7 min',
    originName: 'BTM 2nd Stage Udupi Garden',
    originCoordinates: [77.6100, 12.9150],
    emergencyName: 'BTM 16th Main Fitness Center',
    emergencyCoordinates: [77.6120, 12.9180],
    destinationName: 'Jayadeva Institute of Cardiovascular Sciences',
    destinationCoordinates: [77.5980, 12.9180],
    vehicleId: 'AMB-18',
    emergencyId: 'E-DEMO-014',
    priority: 'CRITICAL',
    type: 'CARDIAC',
    expectedTimeSavedMinutes: 7,
    scenarioTag: 'Cardiac Arrest & Silk Board Bypass',
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-015',
    code: 'DEMO_015',
    title: 'Demo 015: Vijayanagar to Victoria Hospital',
    subtitle: 'Pedestrian Crowd Collision -> Mysore Rd Flyover Green Wave',
    originName: 'Vijayanagar Club',
    originCoordinates: [77.5380, 12.9710],
    emergencyName: 'Vijayanagar Tollgate',
    emergencyCoordinates: [77.5350, 12.9730],
    destinationName: 'Victoria Hospital (City Market)',
    destinationCoordinates: [77.5739, 12.9634],
    vehicleId: 'AMB-19',
    emergencyId: 'E-DEMO-015',
    priority: 'CRITICAL',
    type: 'ACCIDENT',
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Mass Casualty & Flyover Transit',
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-016',
    code: 'DEMO_016',
    title: 'Demo 016: Kalyan Nagar to Specialist Hospital',
    subtitle: 'Severe Pancreatitis -> Ring Road Flow -> Optimal Corridor',
    originName: 'Kalyan Nagar HRBR Layout',
    originCoordinates: [77.6480, 13.0180],
    emergencyName: 'Kammanahalli Main Road Clinic',
    emergencyCoordinates: [77.6420, 13.0120],
    destinationName: 'Specialist Hospital Kalyan Nagar',
    destinationCoordinates: [77.6480, 13.0180],
    vehicleId: 'AMB-20',
    emergencyId: 'E-DEMO-016',
    priority: 'HIGH',
    type: 'MEDICAL',
    expectedTimeSavedMinutes: 0,
    scenarioTag: 'Optimal North-East Corridor',
    requiresReroute: false
  },
  {
    id: 'DEMO-017',
    code: 'DEMO_017',
    title: 'Demo 017: Kengeri to BGS Gleneagles Global Hospital',
    subtitle: 'Metro Construction Collapse -> Mysore Rd Expressway Bypass',
    originName: 'Kengeri Satellite Town',
    originCoordinates: [77.4850, 12.9150],
    emergencyName: 'Kengeri Metro Pier Site',
    emergencyCoordinates: [77.4900, 12.9100],
    destinationName: 'BGS Gleneagles Global Hospital',
    destinationCoordinates: [77.4950, 12.8950],
    vehicleId: 'AMB-21',
    emergencyId: 'E-DEMO-017',
    priority: 'CRITICAL',
    type: 'TRAUMA',
    expectedTimeSavedMinutes: 8,
    scenarioTag: 'Industrial Collapse & Trauma Priority',
    hasAutoReroute: true,
    hasClearance: true
  },
  {
    id: 'DEMO-018',
    code: 'DEMO_018',
    title: 'Demo 018: Sarjapur Road to Columbia Asia Hospital',
    subtitle: 'Severe Asthma in Pregnancy -> Wipro Gate Congestion Bypass',
    originName: 'Sarjapur Wipro Gate',
    originCoordinates: [77.6820, 12.9080],
    emergencyName: 'Kaikondrahalli Lake Enclave',
    emergencyCoordinates: [77.6850, 12.9120],
    destinationName: 'Columbia Asia Hospital Sarjapur',
    destinationCoordinates: [77.6750, 12.9200],
    vehicleId: 'AMB-24',
    emergencyId: 'E-DEMO-018',
    priority: 'HIGH',
    type: 'OBSTETRIC',
    expectedTimeSavedMinutes: 6,
    scenarioTag: 'Pregnancy Emergency & Smart Recalculation',
    hasDeviation: true,
    hasAutoReroute: true
  }
]

interface DriverScenarioSelectorProps {
  isOpen: boolean
  onClose: () => void
  currentScenarioId?: string
  onSelectScenario: (scenario: ScenarioDefinition) => void
}

export function DriverScenarioSelector({
  isOpen,
  onClose,
  currentScenarioId = 'DEMO-001',
  onSelectScenario
}: DriverScenarioSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'CRITICAL' | 'REROUTE' | 'DEVIATION' | 'BACKUP' | 'STABLE'
  >('ALL')

  const filteredScenarios = useMemo(() => {
    return CANONICAL_DEMO_SCENARIOS.filter((sc) => {
      // Filter by tag/type
      if (activeFilter === 'CRITICAL' && sc.priority !== 'CRITICAL') return false
      if (activeFilter === 'REROUTE' && !sc.hasAutoReroute) return false
      if (activeFilter === 'DEVIATION' && !sc.hasDeviation) return false
      if (activeFilter === 'BACKUP' && !sc.hasBackupAmbulance) return false
      if (activeFilter === 'STABLE' && sc.requiresReroute !== false) return false

      // Search match
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return (
        sc.id.toLowerCase().includes(q) ||
        sc.title.toLowerCase().includes(q) ||
        sc.originName.toLowerCase().includes(q) ||
        sc.destinationName.toLowerCase().includes(q) ||
        sc.emergencyName.toLowerCase().includes(q) ||
        sc.vehicleId.toLowerCase().includes(q) ||
        sc.scenarioTag.toLowerCase().includes(q)
      )
    })
  }, [searchQuery, activeFilter])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-950/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Select Bengaluru Demonstration Scenario
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              12 canonical high-fidelity multi-leg emergency corridors with verified road telemetry
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            aria-label="Close Scenario Selector"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/90 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area (Koramangala, Whitefield...), hospital, ambulance ID..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All Scenarios (12)' },
              { id: 'CRITICAL', label: 'Critical Priority' },
              { id: 'REROUTE', label: 'Reroute Available' },
              { id: 'DEVIATION', label: 'Ambulance Deviation' },
              { id: 'BACKUP', label: 'Backup Recommended' },
              { id: 'STABLE', label: 'Stable (No Reroute)' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                  activeFilter === f.id
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scenario List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredScenarios.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching demonstration scenarios found.
            </div>
          ) : (
            filteredScenarios.map((sc) => {
              const isSelected = sc.id === currentScenarioId

              return (
                <div
                  key={sc.id}
                  className={`group rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500/50'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                  }`}
                  onClick={() => {
                    onSelectScenario(sc)
                    onClose()
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">
                        {sc.id}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300">
                        Ambulance: {sc.vehicleId}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          sc.priority === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {sc.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      {sc.expectedTimeSavedMinutes > 0 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px]">
                          Save ~{sc.expectedTimeSavedMinutes} min
                        </span>
                      )}
                      {isSelected && (
                        <span className="flex items-center gap-1 text-blue-400 text-xs">
                          <Check className="h-3.5 w-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                    {sc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{sc.subtitle}</p>

                  {/* Multi-Leg Route Preview */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 text-blue-400 font-semibold">
                      <Car className="h-3 w-3" />
                      {sc.originName}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <AlertTriangle className="h-3 w-3" />
                      {sc.emergencyName}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Navigation className="h-3 w-3" />
                      {sc.destinationName}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Click any scenario to instantly load its 2-leg corridor & live telemetry.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
