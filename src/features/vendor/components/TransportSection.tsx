/**
 * TransportSection component
 * Handles transport mode and volumetric configuration
 */

import React from 'react';
import { UseVolumetricReturn } from '../hooks/useVolumetric';
import { TRANSPORT_MODES, VOLUMETRIC_DIVISOR_OPTIONS_CM, CFT_FACTOR_OPTIONS } from '../utils/validators';
import { TruckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

// =============================================================================
// PROPS
// =============================================================================

interface TransportSectionProps {
  volumetric: UseVolumetricReturn;
  transportMode: 'road' | 'air' | 'rail' | 'ship';
  onTransportModeChange: (mode: 'road' | 'air' | 'rail' | 'ship') => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TransportSection: React.FC<TransportSectionProps> = ({
  volumetric,
  transportMode,
  onTransportModeChange,
}) => {
  const { volumetric: volumetricConfig, setUnit, setDivisor, setCftFactor } = volumetric;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <TruckIcon className="w-5 h-5 text-blue-500" />
        Transport & Volumetric Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transport Mode */}
        <div>
          <label
            htmlFor="transportMode"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
          >
            Transport Mode <span className="text-red-500">*</span>
          </label>
          <select
            id="transportMode"
            name="transportMode"
            value={transportMode}
            onChange={(e) =>
              onTransportModeChange(e.target.value as 'road' | 'air' | 'rail' | 'ship')
            }
            className="mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       border-slate-300 focus:ring-blue-500"
            required
          >
            {TRANSPORT_MODES.map((mode) => (
              <option key={mode.value} value={mode.value} disabled={mode.disabled}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Volumetric Unit */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Volumetric Unit <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3 mt-1">
            <button
              type="button"
              onClick={() => setUnit('cm')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                         ${
                           volumetricConfig.unit === 'cm'
                             ? 'border-blue-500 bg-blue-50 text-blue-700'
                             : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                         }`}
            >
              Centimeters (cm)
            </button>
            <button
              type="button"
              onClick={() => setUnit('inch')}
              className={`flex-1 px-4 py-2 rounded-lg border-2 text-sm font-semibold transition-all
                         ${
                           volumetricConfig.unit === 'inch'
                             ? 'border-blue-500 bg-blue-50 text-blue-700'
                             : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                         }`}
            >
              Inches (in)
            </button>
          </div>
        </div>

        {/* Volumetric Divisor */}
        <div>
          <label
            htmlFor="volumetricDivisor"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1"
          >
            Volumetric Divisor <span className="text-red-500">*</span>
            <div className="group relative">
              <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                Formula for volumetric weight calculation: (L × W × H) / Divisor
                <br />
                <span className="text-slate-300 text-[10px]">
                  Higher divisor = lower volumetric weight
                </span>
              </div>
            </div>
          </label>
          <select
            id="volumetricDivisor"
            name="volumetricDivisor"
            value={volumetricConfig.divisor}
            onChange={(e) => setDivisor(Number(e.target.value))}
            className="mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       border-slate-300 focus:ring-blue-500"
            required
          >
            {VOLUMETRIC_DIVISOR_OPTIONS_CM.map((divisor) => (
              <option key={divisor} value={divisor}>
                {divisor} {volumetricConfig.unit === 'cm' ? 'cm³' : 'in³'}
              </option>
            ))}
          </select>
        </div>

        {/* CFT Factor (Optional) */}
        <div>
          <label
            htmlFor="cftFactor"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1"
          >
            CFT Factor (Optional)
            <div className="group relative">
              <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                Cubic Feet (CFT) conversion factor for freight calculation
                <br />
                <span className="text-slate-300 text-[10px]">
                  Common values: 4-10 (leave empty if not used)
                </span>
              </div>
            </div>
          </label>
          <select
            id="cftFactor"
            name="cftFactor"
            value={volumetricConfig.cftFactor || ''}
            onChange={(e) =>
              setCftFactor(e.target.value ? Number(e.target.value) : undefined)
            }
            className="mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
                       focus:outline-none focus:ring-1 focus:border-blue-500 transition bg-slate-50/70
                       border-slate-300 focus:ring-blue-500"
          >
            <option value="">Not Used</option>
            {CFT_FACTOR_OPTIONS.map((factor) => (
              <option key={factor} value={factor}>
                {factor}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Note:</strong> Volumetric weight is calculated as (Length × Width × Height) / Divisor.
          The divisor determines how much space is considered per unit of weight.
          {volumetricConfig.cftFactor && (
            <span className="block mt-1">
              CFT Factor of {volumetricConfig.cftFactor} will be used for freight calculations.
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
