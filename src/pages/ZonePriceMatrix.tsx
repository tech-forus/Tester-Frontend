// src/pages/ZonePriceMatrix.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  MapPin,
  Sparkles,
  X,
  Info,
} from "lucide-react";
import DecimalInput from "../components/DecimalInput";

/* =========================================================
   Types
   ======================================================= */
type PincodeEntry = {
  pincode: string;
  state: string;
  city: string;
  zone?: string; // e.g., "N1", "S2", "NE1" (used only to infer Region)
};

type RegionGroup = "North" | "South" | "East" | "West" | "Northeast" | "Central";

type ZoneConfig = {
  zoneCode: string; // e.g., "N1"
  zoneName: string;
  region: RegionGroup;
  /** Derived — always recomputed from selectedCities. */
  selectedStates: string[];
  /** City keys stored as `${city}||${state}` */
  selectedCities: string[];
  isComplete: boolean;
};

type ActiveStateByZone = Record<string, string | null>;

type PriceMatrixEntry = {
  fromZone: string;
  toZone: string;
  price: number | null;
};

/** Tracks leftover (yellow) cities per region with their SOURCE sub-zone(s). */
type YellowPool = Record<
  RegionGroup,
  Record<
    string, // cityKey
    { sources: string[] } // list of zone codes that freed this city (e.g., ["N1"])
  >
>;

// New types for state/city lookup functionality
type StateAssignment = {
  stateCode: string;
  stateName: string;
  totalCities: number;
  assignments: {
    [zoneCode: string]: {
      cityKeys: string[];
      isComplete: boolean;
      percentage: number;
    };
  };
};

type CityAssignment = {
  cityKey: string;
  cityName: string;
  stateName: string;
  assignedZone: string | null;
  isAssigned: boolean;
};

type SearchResult = {
  type: 'state' | 'city';
  name: string;
  state?: string;
  status: string;
  zones?: string[];
  details: string;
  zoneCode?: string;
  isAssigned?: boolean;
};

// New data structures for proper state tracking
type ZoneStateOwnership = {
  [zoneCode: string]: {
    [stateName: string]: {
      isComplete: boolean;
      citiesSelected: number;
      totalCities: number;
      percentage: number;
    }
  }
};

type ZoneCompletionMap = {
  [zoneCode: string]: {
    isComplete: boolean;
    totalCities: number;
    completedStates: string[];
  }
};

/* =========================================================
   Constants
   ======================================================= */
const MAX_ZONES = 28;
const CACHE_KEY = "zonePriceMatrix_v6_state_checkbox_selects_all";

// ZONE ORDERING ENFORCEMENT - Canonical order for consistent zone display
// Zones are grouped by region to keep related zones together
const ZONE_ORDER = [
  'N1', 'N2', 'N3', 'N4', 'N5', 'N6', // North zones
  'W1', 'W2', 'W3', 'W4', // West zones  
  'C1', 'C2', 'C3', 'C4', // Centre zones
  'S1', 'S2', 'S3', 'S4', 'S5', 'S6', // South zones
  'E1', 'E2', 'E3', 'E4', // East zones
  'NE1', 'NE2', 'NE3', 'NE4' // North-East zones
];

// BULLETPROOF ZONE ORDERING - Function to sort zones by canonical order
const sortZonesByRegionGroups = (zones: string[]): string[] => {
  return zones.sort((a, b) => {
    // Use the ZONE_ORDER constant for strict canonical ordering
    const indexA = ZONE_ORDER.indexOf(a);
    const indexB = ZONE_ORDER.indexOf(b);
    
    // If both zones are in ZONE_ORDER, use their positions
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Fallback to region-based sorting for any zones not in ZONE_ORDER
    const regionA = codeToRegion(a);
    const regionB = codeToRegion(b);
    
    const regionOrder = ['North', 'West', 'Central', 'South', 'East', 'Northeast'];
    const regionIndexA = regionOrder.indexOf(regionA);
    const regionIndexB = regionOrder.indexOf(regionB);
    
    if (regionIndexA !== regionIndexB) {
      return regionIndexA - regionIndexB;
    }
    
    // Within same region, sort by zone number
    const zoneNumberA = parseInt(a.replace(/\D/g, ''));
    const zoneNumberB = parseInt(b.replace(/\D/g, ''));
    return zoneNumberA - zoneNumberB;
  });
};

const regionGroups: Record<RegionGroup, string[]> = {
  North: ["N1", "N2", "N3", "N4", "N5", "N6"],
  South: ["S1", "S2", "S3", "S4", "S5", "S6"],
  East: ["E1", "E2", "E3", "E4"],
  West: ["W1", "W2", "W3", "W4"],
  Northeast: ["NE1", "NE2", "NE3", "NE4"],
  Central: ["C1", "C2", "C3", "C4"],
};

/* =========================================================
   Helpers
   ======================================================= */
const csKey = (city: string, state: string) => `${city}||${state}`;
const parseCsKey = (key: string) => {
  const i = key.lastIndexOf("||");
  return { city: key.slice(0, i), state: key.slice(i + 2) };
};


// BULLETPROOF ZONE COMPLETION CHECK - Enhanced validation
const isZoneComplete = (zone: ZoneConfig): boolean => {
  if (!zone) return false;
  
  // Check if zone has selected cities
  if (!zone.selectedCities || zone.selectedCities.length === 0) return false;
  
  // Check if zone is marked as complete
  return zone.isComplete;
};

// ENHANCED ZONE VALIDATION - Check if zone has sufficient data
const isZoneValid = (zone: ZoneConfig): boolean => {
  if (!zone) return false;
  
  // Must have at least one city selected
  if (!zone.selectedCities || zone.selectedCities.length === 0) return false;
  
  // Must have at least one state
  if (!zone.selectedStates || zone.selectedStates.length === 0) return false;
  
  return true;
};

// BULLETPROOF TAB NAVIGATION LOCK - Enhanced zone navigation validation
const canNavigateToZone = (targetIndex: number, currentIndex: number, zones: ZoneConfig[]): boolean => {
  // Can always go back to previous zones
  if (targetIndex <= currentIndex) return true;
  
  // Can only go to next zone if current is complete and valid
  if (targetIndex === currentIndex + 1) {
    const currentZone = zones[currentIndex];
    return isZoneComplete(currentZone) && isZoneValid(currentZone);
  }
  
  // Cannot skip ahead - must complete zones in sequence
  return false;
};


// SEQUENTIAL ZONE SELECTION - Get next expected zone in sequence
const getNextExpectedZone = (region: RegionGroup, selectedZones: string[]): string | null => {
  const currentRegionSelected = selectedZones.filter(zone => regionGroups[region].includes(zone));
  const currentRegionOrdered = sortZonesByRegionGroups(currentRegionSelected);
  return regionGroups[region].find(zone => !currentRegionOrdered.includes(zone)) || null;
};

const codeToRegion = (code: string): RegionGroup => {
  if (code.startsWith("NE")) return "Northeast";
  const c = code[0];
  if (c === "N") return "North";
  if (c === "S") return "South";
  if (c === "E") return "East";
  if (c === "W") return "West";
  if (c === "C") return "Central";
  return "North";
};

const emptyYellowPool = (): YellowPool => ({
  North: {},
  South: {},
  East: {},
  West: {},
  Northeast: {},
  Central: {},
});

const addToYellow = (
  pool: YellowPool,
  region: RegionGroup,
  cityKey: string,
  sourceZone: string
): YellowPool => {
  const next: YellowPool = { ...pool, [region]: { ...pool[region] } };
  const existing = next[region][cityKey];
  if (!existing) next[region][cityKey] = { sources: [sourceZone] };
  else if (!existing.sources.includes(sourceZone))
    next[region][cityKey] = { sources: [...existing.sources, sourceZone] };
  return next;
};

const removeFromYellow = (
  pool: YellowPool,
  region: RegionGroup,
  cityKey: string
): YellowPool => {
  const next: YellowPool = { ...pool, [region]: { ...pool[region] } };
  if (next[region][cityKey]) delete next[region][cityKey];
  return next;
};

/** Derive unique state list from selectedCities for a given config. */
const deriveStatesFromCities = (selectedCities: string[]): string[] => {
  const set = new Set<string>();
  selectedCities.forEach((k) => set.add(parseCsKey(k).state));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
};

/** Utility to immutably update a specific zone and re-derive states from its cities. */
const updateOneZone = (
  zones: ZoneConfig[],
  index: number,
  mutator: (z: ZoneConfig) => ZoneConfig
): ZoneConfig[] => {
  const next = [...zones];
  const mutated = mutator({ ...next[index] });
  mutated.selectedStates = deriveStatesFromCities(mutated.selectedCities);
  next[index] = mutated;
  return next;
};

/* =========================================================
   Component
   ======================================================= */
const ZonePriceMatrix: React.FC = () => {
  // dataset
  const [pincodeData, setPincodeData] = useState<PincodeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // steps
  const [currentStep, setCurrentStep] =
    useState<"select-zones" | "configure-zones" | "price-matrix">("select-zones");

  // step 1
  const [selectedZoneCodes, setSelectedZoneCodes] = useState<string[]>([]);

  // progressive visibility per region
  const [visibleZonesPerRegion, setVisibleZonesPerRegion] = useState<Record<RegionGroup, number>>({
    North: 4,
    South: 4,
    East: 2,
    West: 2,
    Northeast: 2,
    Central: 2,
  });

  // step 2
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);

  /** Yellow pool per region with sources */
  const [yellowByRegion, setYellowByRegion] = useState<YellowPool>(emptyYellowPool());

  // UI: right pane focuses on one state for each zone
  const [activeStateByZone, setActiveStateByZone] = useState<ActiveStateByZone>({});

  // region switching housekeeping
  const prevRegionRef = useRef<RegionGroup | null>(null);
  
  // Alert prevention ref to avoid duplicate popups
  const alertShownRef = useRef<boolean>(false);

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // State ownership tracking
  const [stateOwnership, setStateOwnership] = useState<ZoneStateOwnership>({});
  const [zoneCompletionMap, setZoneCompletionMap] = useState<ZoneCompletionMap>({});

  // step 3: price matrix
  const [priceMatrix, setPriceMatrix] = useState<PriceMatrixEntry[]>([]);

  /* -------------------- Load dataset -------------------- */
  useEffect(() => {
    const url = `${import.meta.env.BASE_URL || "/"}pincodes.json`;
    fetch(url)
      .then((res) => res.json())
      .then((data: PincodeEntry[]) => {
        const filtered = (Array.isArray(data) ? data : []).filter(
          (e) =>
            e.state &&
            e.city &&
            e.state !== "NAN" &&
            e.state !== "NaN" &&
            e.city !== "NAN" &&
            e.city !== "NaN" &&
            e.state.trim() !== "" &&
            e.city.trim() !== "" &&
            e.pincode &&
            /^\d{6}$/.test(String(e.pincode))
        );
        setPincodeData(filtered);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  /* -------------------- Cache (load) -------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;

      setSelectedZoneCodes(parsed.selectedZoneCodes || []);
      // Re-derive states on load and ensure canonical ordering
      const loadedZones: ZoneConfig[] = (parsed.zoneConfigs || []).map((z: ZoneConfig) => ({
        ...z,
        selectedStates: deriveStatesFromCities(z.selectedCities || []),
      }));
      
      // BULLETPROOF: Sort loaded zones by canonical order
      const sortedLoadedZones = loadedZones.sort((a, b) => {
        const indexA = ZONE_ORDER.indexOf(a.zoneCode);
        const indexB = ZONE_ORDER.indexOf(b.zoneCode);
        return indexA - indexB;
      });
      
      setZoneConfigs(sortedLoadedZones);
      setCurrentStep(parsed.currentStep || "select-zones");
      setCurrentZoneIndex(parsed.currentZoneIndex || 0);
      parsed.yellowByRegion && setYellowByRegion(parsed.yellowByRegion);
      parsed.activeStateByZone && setActiveStateByZone(parsed.activeStateByZone);
      parsed.priceMatrix && setPriceMatrix(parsed.priceMatrix);
      parsed.stateOwnership && setStateOwnership(parsed.stateOwnership);
      parsed.zoneCompletionMap && setZoneCompletionMap(parsed.zoneCompletionMap);
    } catch {}
  }, []);

  /* -------------------- Cache (save) -------------------- */
  useEffect(() => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          selectedZoneCodes,
          zoneConfigs,
          currentStep,
          currentZoneIndex,
          yellowByRegion,
          activeStateByZone,
          priceMatrix,
          stateOwnership,
          zoneCompletionMap,
        })
      );
    } catch {}
  }, [
    selectedZoneCodes,
    zoneConfigs,
    currentStep,
    currentZoneIndex,
    yellowByRegion,
    activeStateByZone,
    priceMatrix,
    stateOwnership,
    zoneCompletionMap,
  ]);

  /* -------------------- Derived indices -------------------- */

  // region -> state -> Set(city)
  const byStateByRegion = useMemo(() => {
    const map = new Map<RegionGroup, Map<string, Set<string>>>();
    (["North", "South", "East", "West", "Northeast", "Central"] as RegionGroup[]).forEach(
      (r) => map.set(r, new Map())
    );
    for (const e of pincodeData) {
      const region = codeToRegion(e.zone || "");
      const stateMap = map.get(region)!;
      if (!stateMap.has(e.state)) stateMap.set(e.state, new Set());
      stateMap.get(e.state)!.add(e.city);
    }
    return map;
  }, [pincodeData]);

  /* -------------------- Helper Functions -------------------- */
  
  const getAllCityKeysForStateInRegion = (state: string, region: RegionGroup): string[] => {
    const stateMap = byStateByRegion.get(region);
    if (!stateMap) return [];
    const cities = stateMap.get(state);
    if (!cities || cities.size === 0) return [];
    return Array.from(cities).map((c) => csKey(c, state));
  };

  // Compute state ownership across all zones
  const computeStateOwnership = useMemo((): ZoneStateOwnership => {
    const ownership: ZoneStateOwnership = {};
    
    zoneConfigs.forEach(zone => {
      ownership[zone.zoneCode] = {};
      
      // Get all states in this zone's region
      const stateMap = byStateByRegion.get(zone.region);
      if (!stateMap) return;
      
      stateMap.forEach((_, stateName) => {
        const allKeys = getAllCityKeysForStateInRegion(stateName, zone.region);
        const selectedInZone = zone.selectedCities.filter(k => parseCsKey(k).state === stateName);
        const percentage = allKeys.length > 0 ? (selectedInZone.length / allKeys.length) * 100 : 0;
        
        ownership[zone.zoneCode][stateName] = {
          isComplete: selectedInZone.length === allKeys.length && allKeys.length > 0,
          citiesSelected: selectedInZone.length,
          totalCities: allKeys.length,
          percentage: Math.round(percentage)
        };
      });
    });
    
    return ownership;
  }, [zoneConfigs, byStateByRegion]);

  // Update state ownership when zone configs change
  useEffect(() => {
    setStateOwnership(computeStateOwnership);
  }, [computeStateOwnership]);

  // Check if state is visible in a specific zone
  const isStateVisibleInZone = (state: string, zoneIndex: number): boolean => {
    const zone = zoneConfigs[zoneIndex];
    if (!zone) return false;
    
    // Show if state has cities selected in THIS zone (current)
    const hasCitiesInCurrentZone = zone.selectedCities.some(k => parseCsKey(k).state === state);
    
    // Check if state is 100% complete in ANY previous zone of same region
    const completedInPreviousZone = zoneConfigs.some((prevZone, idx) => {
      if (idx >= zoneIndex) return false; // Only check previous zones
      if (prevZone.region !== zone.region) return false; // Same region only
      
      const allKeys = getAllCityKeysForStateInRegion(state, prevZone.region);
      const selectedInPrevZone = prevZone.selectedCities.filter(k => parseCsKey(k).state === state);
      
      return selectedInPrevZone.length === allKeys.length && allKeys.length > 0;
    });
    
    // CRITICAL FIX: Check if there are actually available cities to select
    const availableCities = getAvailableCityKeysForState(state);
    const hasAvailableCities = availableCities.length > 0;
    
    // Show if: 
    // 1. Has cities in current zone (for editing) OR
    // 2. Not completed in previous zones AND has available cities to select
    return hasCitiesInCurrentZone || (!completedInPreviousZone && hasAvailableCities);
  };

  // Get state card color and styling based on completion status
  const getStateCardColor = (state: string, zoneIndex: number) => {
    const zone = zoneConfigs[zoneIndex];
    if (!zone) return "bg-white border-slate-300";
    
    const selectedInZone = zone.selectedCities.filter(k => parseCsKey(k).state === state).length;
    
    // Get available cities for this zone (same logic as UI display)
    const availableForThisZone = new Set(getAvailableCityKeysForState(state));
    const totalAvailableForThisZone = availableForThisZone.size;
    
    // Check if completed in previous zone
    const completedInPreviousZone = zoneConfigs.some((prevZone, idx) => {
      if (idx >= zoneIndex) return false;
      if (prevZone.region !== zone.region) return false;
      
      const prevAllKeys = getAllCityKeysForStateInRegion(state, prevZone.region);
      const prevSelected = prevZone.selectedCities.filter(k => parseCsKey(k).state === state).length;
      
      return prevSelected === prevAllKeys.length && prevAllKeys.length > 0;
    });
    
    if (completedInPreviousZone && selectedInZone === 0) {
      return "bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed";
    }
    
    // FIXED: Check if state is 100% complete based on available cities for this zone
    const isFullyCompleteInCurrentZone = selectedInZone === totalAvailableForThisZone && totalAvailableForThisZone > 0;
    
    if (isFullyCompleteInCurrentZone) {
      return "bg-green-50 border-green-500";
    }
    
    if (selectedInZone > 0) {
      return "bg-yellow-50 border-yellow-500";
    }
    
    return "bg-white border-slate-300";
  };

  // Get state status icon and label
  const getStateStatusInfo = (state: string, zoneIndex: number) => {
    const zone = zoneConfigs[zoneIndex];
    if (!zone) return { icon: '○', color: 'text-slate-400', label: 'Not selected' };
    
    const selectedInZone = zone.selectedCities.filter(k => parseCsKey(k).state === state).length;
    
    // Get available cities for this zone (same logic as UI display)
    const availableForThisZone = new Set(getAvailableCityKeysForState(state));
    const totalAvailableForThisZone = availableForThisZone.size;
    
    // Check if completed in previous zone
    const completedInPreviousZone = zoneConfigs.some((prevZone, idx) => {
      if (idx >= zoneIndex) return false;
      if (prevZone.region !== zone.region) return false;
      
      const prevAllKeys = getAllCityKeysForStateInRegion(state, prevZone.region);
      const prevSelected = prevZone.selectedCities.filter(k => parseCsKey(k).state === state).length;
      
      return prevSelected === prevAllKeys.length && prevAllKeys.length > 0;
    });
    
    if (completedInPreviousZone && selectedInZone === 0) {
      return { icon: '✓', color: 'text-green-600', label: 'Completed in previous zone' };
    }
    
    // FIXED: Check if state is 100% complete based on available cities for this zone
    const isFullyCompleteInCurrentZone = selectedInZone === totalAvailableForThisZone && totalAvailableForThisZone > 0;
    
    if (isFullyCompleteInCurrentZone) {
      return { icon: '●', color: 'text-green-600', label: 'Fully selected' };
    }
    
    if (selectedInZone > 0) {
      return { icon: '◐', color: 'text-yellow-600', label: 'Partially selected' };
    }
    
    return { icon: '○', color: 'text-slate-400', label: 'Not selected' };
  };


  /* -------------------- State/City Lookup Functions -------------------- */
  
  // Compute complete state assignment map
  const computeStateAssignments = useMemo((): StateAssignment[] => {
    const assignments: StateAssignment[] = [];
    
    // Get all states across all regions
    const allStates = new Set<string>();
    byStateByRegion.forEach((stateMap) => {
      stateMap.forEach((_, state) => allStates.add(state));
    });
    
    allStates.forEach(stateName => {
      const assignmentsForState: { [zoneCode: string]: { cityKeys: string[]; isComplete: boolean; percentage: number } } = {};
      let totalCities = 0;
      
      // Find all regions that have this state
      const regionsWithState: RegionGroup[] = [];
      byStateByRegion.forEach((stateMap, region) => {
        if (stateMap.has(stateName)) {
          regionsWithState.push(region);
          totalCities += stateMap.get(stateName)!.size;
        }
      });
      
      // Check assignments in each zone
      zoneConfigs.forEach(zone => {
        if (regionsWithState.includes(zone.region)) {
          const allKeys = getAllCityKeysForStateInRegion(stateName, zone.region);
          const selectedInZone = zone.selectedCities.filter(k => parseCsKey(k).state === stateName);
          const percentage = allKeys.length > 0 ? (selectedInZone.length / allKeys.length) * 100 : 0;
          
          assignmentsForState[zone.zoneCode] = {
            cityKeys: selectedInZone,
            isComplete: selectedInZone.length === allKeys.length && allKeys.length > 0,
            percentage: Math.round(percentage)
          };
        }
      });
      
      assignments.push({
        stateCode: stateName,
        stateName,
        totalCities,
        assignments: assignmentsForState
      });
    });
    
    return assignments;
  }, [byStateByRegion, zoneConfigs]);

  // Get city assignment info
  const getCityAssignment = (cityKey: string): CityAssignment | null => {
    const { city, state } = parseCsKey(cityKey);
    
    // Find which zone this city is assigned to
    let assignedZone: string | null = null;
    zoneConfigs.forEach(zone => {
      if (zone.selectedCities.includes(cityKey)) {
        assignedZone = zone.zoneCode;
      }
    });
    
    return {
      cityKey,
      cityName: city,
      stateName: state,
      assignedZone,
      isAssigned: assignedZone !== null
    };
  };

  // Search states and cities
  const searchStatesAndCities = (query: string): SearchResult[] => {
    if (!query.trim()) return [];
    
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Search states
    computeStateAssignments.forEach(stateAssignment => {
      if (stateAssignment.stateName.toLowerCase().includes(lowerQuery)) {
        const zones = Object.keys(stateAssignment.assignments);
        const completedZones = zones.filter(zone => stateAssignment.assignments[zone].isComplete);
        const inProgressZones = zones.filter(zone => 
          stateAssignment.assignments[zone].percentage > 0 && !stateAssignment.assignments[zone].isComplete
        );
        
        let status = "Not Started";
        let details = `Total: ${stateAssignment.totalCities} cities`;
        
        if (completedZones.length > 0) {
          status = completedZones.length === zones.length ? "Fully Assigned" : "Partially Assigned";
          details += `\nCompleted: ${completedZones.join(", ")}`;
        }
        if (inProgressZones.length > 0) {
          details += `\nIn Progress: ${inProgressZones.join(", ")}`;
        }
        
        results.push({
          type: 'state',
          name: stateAssignment.stateName,
          status,
          zones: zones,
          details
        });
      }
    });
    
    // Search cities
    pincodeData.forEach(entry => {
      if (entry.city.toLowerCase().includes(lowerQuery) || entry.state.toLowerCase().includes(lowerQuery)) {
        const cityKey = csKey(entry.city, entry.state);
        const assignment = getCityAssignment(cityKey);
        
        if (assignment) {
          results.push({
            type: 'city',
            name: entry.city,
            state: entry.state,
            status: assignment.isAssigned ? "Assigned" : "Available",
            zoneCode: assignment.assignedZone || undefined,
            isAssigned: assignment.isAssigned,
            details: assignment.isAssigned 
              ? `Assigned to: ${assignment.assignedZone}` 
              : "Available for selection"
          });
        }
      }
    });
    
    return results.slice(0, 10); // Limit to 10 results
  };


  const currentConfig = zoneConfigs[currentZoneIndex];
  const currentRegion = currentConfig?.region;
  const currentZoneCode = currentConfig?.zoneCode || "";

  /** Yellow set & lookup for CURRENT region only */
  const yellowSetForRegion = useMemo(() => {
    if (!currentRegion) return new Set<string>();
    return new Set(Object.keys(yellowByRegion[currentRegion] || {}));
  }, [currentRegion, yellowByRegion]);

  const yellowMetaFor = (key: string) =>
    currentRegion ? yellowByRegion[currentRegion][key] : undefined;

  /** union set of cityKeys selected across all zones in a region (for full-state + exhaustion) */
  const selectedCitySetAcrossRegion = (region: RegionGroup): Set<string> => {
    const set = new Set<string>();
    zoneConfigs.forEach((z) => {
      if (z.region !== region) return;
      z.selectedCities.forEach((k) => set.add(k));
    });
    return set;
  };

  // cities available to pick (not already selected in OTHER zones)
  const getAvailableCityKeysForState = (state: string): string[] => {
    if (!currentRegion) return [];
    const all = getAllCityKeysForStateInRegion(state, currentRegion);

    // cities already taken by others (other zones)
    const usedElsewhere = new Set<string>();
    zoneConfigs.forEach((z, idx) => {
      if (idx === currentZoneIndex) return;
      z.selectedCities.forEach((k) => usedElsewhere.add(k));
    });

    return all.filter((k) => !usedElsewhere.has(k));
  };

  /** All states in region (raw) */
  const allStatesForCurrentRegion = useMemo(() => {
    if (!currentRegion) return [];
    const stateMap = byStateByRegion.get(currentRegion);
    if (!stateMap) return [];
    return Array.from(stateMap.keys()).sort((a, b) => a.localeCompare(b));
  }, [byStateByRegion, currentRegion]);

  /** Filtered state list for the CURRENT zone per rules */
  const availableStatesForCurrent = useMemo(() => {
    if (!currentRegion || !currentConfig) return [];

    const stateMap = byStateByRegion.get(currentRegion);
    if (!stateMap) return [];

    const result: string[] = [];
    for (const state of allStatesForCurrentRegion) {
      // Use the new state visibility logic
      if (isStateVisibleInZone(state, currentZoneIndex)) {
        result.push(state);
      }
    }

    return result.sort((a, b) => a.localeCompare(b));
  }, [
    currentRegion,
    currentConfig,
    allStatesForCurrentRegion,
    currentZoneIndex,
    zoneConfigs,
    isStateVisibleInZone,
  ]);

  /* -------------------- Active state handling -------------------- */
  const ensureActiveState = (zoneCode: string, preferred?: string | null) => {
    setActiveStateByZone((prev) => {
      if (preferred !== undefined) return { ...prev, [zoneCode]: preferred };
      if (prev[zoneCode] === undefined) return { ...prev, [zoneCode]: null };
      return prev;
    });
  };

  useEffect(() => {
    if (!currentConfig) return;
    const act = activeStateByZone[currentZoneCode];
    if (!act) {
      const pick =
        currentConfig.selectedStates[0] ||
        availableStatesForCurrent.find((s) => {
          const allKeys = getAllCityKeysForStateInRegion(s, currentConfig.region);
          const selectedInState = currentConfig.selectedCities.filter(
            (k) => parseCsKey(k).state === s
          ).length;
          const yellowCount = allKeys.filter((k) => yellowSetForRegion.has(k)).length;
          return yellowCount > 0 || (selectedInState > 0 && selectedInState < allKeys.length);
        }) ||
        availableStatesForCurrent[0] ||
        null;
      setActiveStateByZone((prev) => ({ ...prev, [currentZoneCode]: pick ?? null }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentZoneIndex, currentConfig, availableStatesForCurrent.length]);

  /** Auto-clear finished region yellow pool when switching regions and the previous region’s selected zones are all complete. */
  useEffect(() => {
    if (!currentConfig) return;
    const thisRegion = currentConfig.region;
    const prevRegion = prevRegionRef.current;

    if (prevRegion && prevRegion !== thisRegion) {
      const prevRegionZoneCodes = regionGroups[prevRegion].filter((zc) =>
        selectedZoneCodes.includes(zc)
      );
      const allPrevComplete =
        prevRegionZoneCodes.length === 0 ||
        zoneConfigs
          .filter((z) => z.region === prevRegion && prevRegionZoneCodes.includes(z.zoneCode))
          .every((z) => z.isComplete);

      if (allPrevComplete) {
        setYellowByRegion((prev) => ({ ...prev, [prevRegion]: {} }));
      }
    }
    prevRegionRef.current = thisRegion;
  }, [currentZoneIndex, currentConfig, selectedZoneCodes, zoneConfigs]);

  const setActiveState = (state: string | null) => {
    setActiveStateByZone((prev) => ({ ...prev, [currentZoneCode]: state }));
  };

  const getActiveState = (): string | null => {
    const s = activeStateByZone[currentZoneCode];
    return s ?? null;
  };

  /* -------------------- Search functionality -------------------- */
  
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      const results = searchStatesAndCities(query);
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'state') {
      // Find the zone that has this state and navigate to it
      const zoneWithState = zoneConfigs.find(zone => 
        zone.selectedStates.includes(result.name)
      );
      
      if (zoneWithState) {
        const zoneIndex = zoneConfigs.findIndex(z => z.zoneCode === zoneWithState.zoneCode);
        if (zoneIndex !== -1) {
          setCurrentZoneIndex(zoneIndex);
          setActiveStateByZone(prev => ({ ...prev, [zoneWithState.zoneCode]: result.name }));
        }
      }
    } else if (result.type === 'city' && result.zoneCode) {
      // Navigate to the zone where this city is assigned
      const zoneIndex = zoneConfigs.findIndex(z => z.zoneCode === result.zoneCode);
      if (zoneIndex !== -1) {
        setCurrentZoneIndex(zoneIndex);
        setActiveStateByZone(prev => ({ ...prev, [result.zoneCode!]: result.state || null }));
      }
    }
    
    // Clear search
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  /* =========================================================
     Step 1: Zone selection
     ======================================================= */
  const addZoneToRegion = (region: RegionGroup) => {
    setVisibleZonesPerRegion((prev) => {
      const currentVisible = prev[region];
      const maxZones = regionGroups[region].length;
      if (currentVisible < maxZones) {
        return { ...prev, [region]: currentVisible + 1 };
      }
      return prev;
    });
  };

  const toggleZoneSelection = (code: string) => {
    setSelectedZoneCodes((prev) => {
      // BULLETPROOF SEQUENTIAL ZONE SELECTION - Enforce strict ordering
      const region = codeToRegion(code);
      const nextExpectedZone = getNextExpectedZone(region, prev);
      
      // If trying to select a zone that's not the next in sequence, show warning
      if (!prev.includes(code) && nextExpectedZone && code !== nextExpectedZone) {
        alert(`⚠ Please select ${nextExpectedZone} first before selecting ${code}`);
        return prev;
      }

      // Additional validation: Check if any previous zones in the same region are missing
      const regionZones = regionGroups[region];
      const currentRegionSelected = prev.filter(zone => regionZones.includes(zone));
      const currentRegionOrdered = sortZonesByRegionGroups(currentRegionSelected);
      
      // Find the first missing zone in the sequence
      const firstMissingZone = regionZones.find(zone => !currentRegionOrdered.includes(zone));
      
      // If trying to select a zone that's not the first missing one, prevent it
      if (!prev.includes(code) && firstMissingZone && code !== firstMissingZone) {
        alert(`⚠ Please select ${firstMissingZone} first before selecting ${code}`);
        return prev;
      }

      // FIXED ZONE DESELECTION - Only allow deselection of the last selected zone in the SAME region
      if (prev.includes(code)) {
        // Get all selected zones in the same region as the zone being deselected
        const regionZones = regionGroups[region];
        const selectedZonesInRegion = prev.filter(zone => regionZones.includes(zone));
        const sortedZonesInRegion = sortZonesByRegionGroups(selectedZonesInRegion);
        const lastSelectedZoneInRegion = sortedZonesInRegion[sortedZonesInRegion.length - 1];
        
        if (code !== lastSelectedZoneInRegion) {
          // Prevent duplicate alerts
          if (!alertShownRef.current) {
            alertShownRef.current = true;
            alert(`⚠ You can only deselect the last selected zone in ${region} (${lastSelectedZoneInRegion}). Please deselect zones in reverse order within each region.`);
            setTimeout(() => {
              alertShownRef.current = false;
            }, 1000);
          }
          return prev;
        }
      }

      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      if (next.length > MAX_ZONES) return prev;

      // REGION GROUPING - Sort zones by region groups to keep related zones together
      const sortedNext = sortZonesByRegionGroups(next);

      setZoneConfigs((old) => {
        const keep = old.filter((z) => sortedNext.includes(z.zoneCode));
        const missing = sortedNext
          .filter((c) => !keep.some((k) => k.zoneCode === c))
          .map(
            (c) =>
              ({
                zoneCode: c,
                zoneName: c,
                region: codeToRegion(c),
                selectedStates: [],
                selectedCities: [],
                isComplete: false,
              }) as ZoneConfig
          );
        
        // BULLETPROOF: Ensure zoneConfigs are always in canonical order
        const allZones = [...keep, ...missing];
        return allZones.sort((a, b) => {
          const indexA = ZONE_ORDER.indexOf(a.zoneCode);
          const indexB = ZONE_ORDER.indexOf(b.zoneCode);
          return indexA - indexB;
        });
      });

      ensureActiveState(code, null);
      return sortedNext;
    });
  };

  const toggleRegionSelection = (region: RegionGroup) => {
    const visibleZones = regionGroups[region].slice(0, visibleZonesPerRegion[region]);
    setSelectedZoneCodes((prev) => {
      const allSelected = visibleZones.every((z) => prev.includes(z));
      
      if (allSelected) {
        // If all are selected, deselect them
        const next = prev.filter((z) => !visibleZones.includes(z));
        const sortedNext = sortZonesByRegionGroups(next);
        
        setZoneConfigs((old) => {
          const keep = old.filter((z) => sortedNext.includes(z.zoneCode));
          return keep;
        });
        
        return sortedNext;
      } else {
        // SEQUENTIAL ZONE SELECTION - Only select zones in proper order
        const nextExpectedZone = getNextExpectedZone(region, prev);
        
        if (nextExpectedZone && visibleZones.includes(nextExpectedZone)) {
          // Select only the next zone in sequence
          const next = [...prev, nextExpectedZone].slice(0, MAX_ZONES);
          const sortedNext = sortZonesByRegionGroups(next);
          
          setZoneConfigs((old) => {
            const keep = old.filter((z) => sortedNext.includes(z.zoneCode));
            const missing = sortedNext
              .filter((c) => !keep.some((k) => k.zoneCode === c))
              .map(
                (c) =>
                  ({
                    zoneCode: c,
                    zoneName: c,
                    region: codeToRegion(c),
                    selectedStates: [],
                    selectedCities: [],
                    isComplete: false,
                  }) as ZoneConfig
              );
            
            // BULLETPROOF: Ensure zoneConfigs are always in canonical order
            const allZones = [...keep, ...missing];
            return allZones.sort((a, b) => {
              const indexA = ZONE_ORDER.indexOf(a.zoneCode);
              const indexB = ZONE_ORDER.indexOf(b.zoneCode);
              return indexA - indexB;
            });
          });
          
          ensureActiveState(nextExpectedZone, null);
          return sortedNext;
        } else {
          // If no next zone available or not in visible zones, show message
          alert(`⚠ Please select zones in order: ${regionGroups[region].join(' → ')}`);
          return prev;
        }
      }
    });
  };

  const proceedToConfiguration = () => {
    if (selectedZoneCodes.length === 0) {
      alert("Please select at least one zone.");
      return;
    }
    setCurrentStep("configure-zones");
    setCurrentZoneIndex(0);
  };

  /* =========================================================
     Step 2: Zone configuration
     ======================================================= */

  // Clicking the state row sets focus
  const onStateRowClick = (state: string) => setActiveState(state);

  /** Select ALL including leftovers (yellow) for a state (by name). */
  const selectAllIncludingYellowForState = (state: string) => {
    if (!currentRegion || !currentConfig) return;

    const available = new Set(getAvailableCityKeysForState(state)); // includes yellow if not used elsewhere
    const toAdd = Array.from(available);
    if (toAdd.length === 0) return;

    setZoneConfigs((prev) =>
      updateOneZone(prev, currentZoneIndex, (z) => ({
        ...z,
        selectedCities: Array.from(new Set([...z.selectedCities, ...toAdd])),
      }))
    );

    // remove those from yellow pool
    setYellowByRegion((prev) => {
      let updated = { ...prev };
      toAdd.forEach((k) => (updated = removeFromYellow(updated, currentRegion, k)));
      return updated;
    });

    setActiveState(state);
  };


  /** Select ALL including leftovers (yellow) for the active state. */
  const selectAllIncludingYellowInActiveState = () => {
    const state = getActiveState();
    if (!state) return;
    selectAllIncludingYellowForState(state);
  };

  /** Clear all selected in the active state -> mark those as yellow (explicit deselects). */
  const clearAllCitiesInActiveState = () => {
    const state = getActiveState();
    if (!state || !currentRegion || !currentConfig) return;

    const keys = getAllCityKeysForStateInRegion(state, currentRegion);
    const wasOn = new Set(currentConfig.selectedCities.filter((k) => keys.includes(k)));
    if (wasOn.size === 0) return;

    setZoneConfigs((prev) =>
      updateOneZone(prev, currentZoneIndex, (z) => ({
        ...z,
        selectedCities: z.selectedCities.filter((k) => !keys.includes(k)),
      }))
    );

    // mark the ones that were ON as yellow (explicit deselects from this zone)
    setYellowByRegion((prevPool) => {
      let updated = { ...prevPool };
      wasOn.forEach((k) => {
        updated = addToYellow(updated, currentRegion, k, currentZoneCode);
      });
      return updated;
    });
  };

  /** toggle an individual city checkbox */
  const toggleCity = (cityKey: string) => {
    if (!currentConfig || !currentRegion) return;

    const wasOn = currentConfig.selectedCities.includes(cityKey);

    setZoneConfigs((prev) =>
      updateOneZone(prev, currentZoneIndex, (z) => {
        const set = new Set(z.selectedCities);
        if (set.has(cityKey)) set.delete(cityKey);
        else set.add(cityKey);
        return { ...z, selectedCities: Array.from(set) };
      })
    );

    setYellowByRegion((prevPool) => {
      let updated = { ...prevPool };
      if (wasOn) {
        updated = addToYellow(updated, currentRegion, cityKey, currentZoneCode);
      } else {
        updated = removeFromYellow(updated, currentRegion, cityKey);
      }
      return updated;
    });
  };

  /** Compute badges & flags for a given state in UI */
  const computeStateStats = (state: string) => {
    if (!currentRegion || !currentConfig) {
      return {
        total: 0,
        selectedHere: 0,
        yellowCount: 0,
        nonYellowRemaining: 0,
        totalAvailableForThisZone: 0,
      };
    }
    const allKeys = getAllCityKeysForStateInRegion(state, currentRegion);

    // selected in *this* zone
    const selectedHere = currentConfig.selectedCities.filter(
      (k) => parseCsKey(k).state === state
    ).length;

    // keys not used in other zones (includes our selected ones)
    const availableForThisZone = new Set(getAvailableCityKeysForState(state));
    const totalAvailableForThisZone = availableForThisZone.size;

    const yellowCount = allKeys.filter((k) => yellowSetForRegion.has(k)).length;
    
    // FIXED: Calculate non-yellow remaining correctly by excluding already selected cities
    const nonYellowRemaining = Array.from(availableForThisZone).filter(
      (k) => !yellowSetForRegion.has(k) && !currentConfig.selectedCities.includes(k)
    ).length;

    return {
      total: allKeys.length,
      selectedHere,
      yellowCount,
      nonYellowRemaining,
      totalAvailableForThisZone,
    };
  };


  /** Check if ALL states in the current zone are fully selected (all cities selected) */
  const areAllStatesFullySelectedInCurrentZone = (): boolean => {
    if (!currentConfig) return false;
    
    // Get all states in the current region
    const stateMap = byStateByRegion.get(currentConfig.region);
    if (!stateMap) return false;
    
    // Check if every state in the region is fully selected in the current zone
    for (const [stateName] of stateMap) {
      const allKeys = getAllCityKeysForStateInRegion(stateName, currentConfig.region);
      const selectedInCurrentZone = currentConfig.selectedCities.filter(k => parseCsKey(k).state === stateName).length;
      
      // If this state is not fully selected in the current zone, return false
      if (selectedInCurrentZone < allKeys.length) {
        return false;
      }
    }
    
    return true;
  };

  // Validate zone before saving
  const validateZoneSave = (): boolean => {
    if (!currentConfig) return false;

    // Check if at least one city is selected
    if (currentConfig.selectedCities.length === 0) {
      // Check if ANY cities are available
      const hasAvailableCities = availableStatesForCurrent.some(state => {
        const allKeys = getAllCityKeysForStateInRegion(state, currentConfig.region);
        const availableNotUsed = allKeys.filter((k) => {
          const unionSelectedAcrossRegion = selectedCitySetAcrossRegion(currentConfig.region);
          return !unionSelectedAcrossRegion.has(k);
        });
        return availableNotUsed.length > 0;
      });
      
      if (!hasAvailableCities) {
        // Offer to delete zone
        const confirmed = window.confirm(
          `⚠️ No cities are available for selection in ${currentConfig.zoneName}.\n\n` +
          `All cities in this region have been selected in previous zones.\n\n` +
          `This subzone will be DELETED and you can proceed to the next zone.\n\n` +
          `Do you want to delete this subzone and continue?`
        );
        
        if (confirmed) {
          // DELETE the current zone completely
          setZoneConfigs((prev) => {
            const updatedZones = prev.filter((_, index) => index !== currentZoneIndex);
            return updatedZones;
          });
          
          // Remove from selectedZoneCodes
          setSelectedZoneCodes((prev) => {
            return prev.filter(code => code !== currentConfig.zoneCode);
          });
          
          // Navigate to next available zone
          setZoneConfigs((prev) => {
            if (prev.length === 0) {
              // No more zones, go to finalization
              setCurrentStep("price-matrix");
              return prev;
            }
            
            // Find next incomplete zone
            const nextIndex = prev.findIndex((z) => !z.isComplete);
            if (nextIndex !== -1) {
              setCurrentZoneIndex(nextIndex);
            } else {
              // All zones complete, go to price matrix
              setCurrentStep("price-matrix");
            }
            return prev;
          });
        }
        return false;
      } else {
        alert("❌ Cannot save empty zone. Please select at least one city.");
        return false;
      }
    }

    return true;
  };

  /** BULLETPROOF ZONE SAVE - Enhanced validation and error handling */
  const saveCurrentZone = () => {
    if (!currentConfig) return;

    // Validate zone before saving
    if (!validateZoneSave()) {
      return;
    }

    if (currentConfig.selectedStates.length === 0) {
      alert("❌ Cannot save zone without states. Please select at least one state.");
      return;
    }

    // Validate that zone has meaningful data
    if (!isZoneValid(currentConfig)) {
      alert("❌ Zone configuration is incomplete. Please ensure all required data is selected.");
      return;
    }

    // mark this zone complete
    let nextZones: ZoneConfig[] = [];
    setZoneConfigs((prev) => {
      nextZones = prev.map((z, i) => (i === currentZoneIndex ? { ...z, isComplete: true } : z));
      return nextZones;
    });

    // FIXED: Only delete remaining subzones when ALL states in current zone are fully selected
    const region = currentConfig.region;
    const remainingZoneCodes = zoneConfigs
      .filter((z, i) => z.region === region && i !== currentZoneIndex && !z.isComplete)
      .map((z) => z.zoneCode);

    // Check if ALL states in the current zone are fully selected (all cities selected)
    if (areAllStatesFullySelectedInCurrentZone() && remainingZoneCodes.length > 0) {
      const confirmed = window.confirm(
        `You have selected ALL cities in ALL states in the ${region} region.\n` +
          `Saving this will remove these unused sub-zones: ${remainingZoneCodes.join(", ")}.\n\n` +
          `Continue?`
      );
      if (!confirmed) {
        setZoneConfigs((prev) =>
          prev.map((z, i) => (i === currentZoneIndex ? { ...z, isComplete: false } : z))
        );
        return;
      }

      setZoneConfigs((prev) =>
        prev.filter(
          (z, i) => z.region !== region || i === currentZoneIndex || z.isComplete
        )
      );
      setSelectedZoneCodes((prev) => prev.filter((code) => !remainingZoneCodes.includes(code)));
      setYellowByRegion((prev) => ({ ...prev, [region]: {} }));
    }

    // navigate to next incomplete zone
        setZoneConfigs((prev) => {
          const after = prev.findIndex((z, index) => index > currentZoneIndex && !z.isComplete);
          if (after !== -1) {
            setCurrentZoneIndex(after);
            // Scroll to top when navigating to next zone
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            return prev;
          }
          const before = prev.findIndex((z, index) => index < currentZoneIndex && !z.isComplete);
          if (before !== -1) {
            setCurrentZoneIndex(before);
            // Scroll to top when navigating to previous zone
            setTimeout(() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            return prev;
          }
          return prev;
        });
  };


  const finalizeAll = () => {
    const valid = zoneConfigs.filter((z) => z.selectedCities.length > 0);
    if (valid.length === 0) {
      alert("Please configure at least one zone with cities.");
      return;
    }
    localStorage.setItem("zoneMatrixData", JSON.stringify(valid));

    // Initialize price matrix for all selected zones
    const matrix: PriceMatrixEntry[] = [];
    valid.forEach((fromZone) => {
      valid.forEach((toZone) => {
        matrix.push({ fromZone: fromZone.zoneCode, toZone: toZone.zoneCode, price: null });
      });
    });
    setPriceMatrix(matrix);
    setCurrentStep("price-matrix");
  };

  const completedZones = zoneConfigs.filter((z) => z.isComplete).length;
  const progress =
    zoneConfigs.length === 0 ? 0 : (completedZones / zoneConfigs.length) * 100;

  /* =========================================================
     Step 3: Price Matrix
     ======================================================= */
  const validZones = zoneConfigs.filter((z) => z.selectedCities.length > 0);

  const updatePrice = (fromZone: string, toZone: string, price: number | null) => {
    setPriceMatrix((prev) =>
      prev.map((entry) =>
        entry.fromZone === fromZone && entry.toZone === toZone ? { ...entry, price } : entry
      )
    );
  };

  const getPrice = (fromZone: string, toZone: string): number | null => {
    const entry = priceMatrix.find((e) => e.fromZone === fromZone && e.toZone === toZone);
    return entry?.price ?? null;
  };

  const savePriceMatrix = () => {
    const matrixData = {
      zones: validZones,
      priceMatrix: priceMatrix,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("zonePriceMatrixData", JSON.stringify(matrixData));
    alert("Price matrix saved successfully!");
  };

  const exportPriceMatrix = () => {
    const zones = validZones.map((z) => z.zoneCode);
    const csvData = [
      ["", ...zones],
      ...zones.map((fromZone) => [
        fromZone,
        ...zones.map((toZone) => {
          const price = getPrice(fromZone, toZone);
          return price?.toString() || "";
        }),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zone_price_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const lines = text.split("\n").filter((line) => line.trim());
        if (lines.length < 2) {
          alert("Invalid CSV format. Please ensure the file has headers and data rows.");
          return;
        }

        const headerLine = lines[0].split(",");
        const uploadedZones = headerLine
          .slice(1)
          .map((zone) => zone.trim())
          .filter((zone) => zone);

        const currentZones = validZones.map((z) => z.zoneCode);
        const zonesMatch =
          uploadedZones.length === currentZones.length &&
          uploadedZones.every((zone) => currentZones.includes(zone));

        if (!zonesMatch) {
          alert(
            `Zone mismatch. Current zones: ${currentZones.join(", ")}. Uploaded zones: ${uploadedZones.join(", ")}`
          );
          return;
        }

        const newPriceMatrix: PriceMatrixEntry[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",");
          const fromZone = row[0].trim();
          if (!currentZones.includes(fromZone)) continue;

          for (let j = 1; j < row.length; j++) {
            const toZone = uploadedZones[j - 1];
            const priceValue = row[j].trim();
            if (priceValue && !isNaN(parseFloat(priceValue))) {
              const price = parseFloat(priceValue);
              if (price >= 0 && price <= 999) {
                newPriceMatrix.push({ fromZone, toZone, price });
              }
            }
          }
        }

        setPriceMatrix(newPriceMatrix);
        alert(`Successfully imported ${newPriceMatrix.length} price entries from CSV file.`);
      } catch (error) {
        alert("Error parsing CSV file. Please check the format and try again.");
        console.error("CSV parsing error:", error);
      }
    };

    reader.readAsText(file);
  };

  /* =========================================================
     Render
     ======================================================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-slate-600">Loading Zone Price Matrix…</p>
        </div>
      </div>
    );
  }

  /* ---------- Step 1: Select Zones ---------- */
  if (currentStep === "select-zones") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => (window.location.href = "/addvendor")}
              className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Add Vendor
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
              Select Your Zones
            </h1>
            <p className="mt-1 text-slate-600">
              Pick up to {MAX_ZONES} zones. Use region quick-selects.
            </p>

            <div className="mt-6 space-y-6">
              {(Object.keys(regionGroups) as RegionGroup[]).map((region) => {
                const allZones = regionGroups[region];
                const visibleZones = allZones.slice(0, visibleZonesPerRegion[region]);
                const allSelected = visibleZones.every((z) => selectedZoneCodes.includes(z));
                const someSelected =
                  !allSelected && visibleZones.some((z) => selectedZoneCodes.includes(z));
                const canAddMore = visibleZonesPerRegion[region] < allZones.length;

                return (
                  <div
                    key={region}
                    className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-6 w-6 text-blue-600" />
                        <h3 className="text-xl font-semibold text-slate-900">{region}</h3>
                      </div>
                      <div className="flex gap-2">
                        {someSelected && (
                          <button
                            onClick={() => {
                              // Deselect all zones in this region
                              const visibleZones = regionGroups[region].slice(0, visibleZonesPerRegion[region]);
                              setSelectedZoneCodes((prev) => {
                                const next = prev.filter((z) => !visibleZones.includes(z));
                                const sortedNext = sortZonesByRegionGroups(next);
                                
                                setZoneConfigs((old) => {
                                  const keep = old.filter((z) => sortedNext.includes(z.zoneCode));
                                  return keep;
                                });
                                
                                return sortedNext;
                              });
                            }}
                            className="px-4 py-2 rounded-lg font-medium transition-all bg-red-100 text-red-700 hover:bg-red-200"
                            title="Deselect all zones in this region"
                          >
                            Deselect All
                          </button>
                        )}
                        <button
                          onClick={() => toggleRegionSelection(region)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            allSelected
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : someSelected
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          title={allSelected ? "Deselect all zones in this region" : "Select next zone in sequence"}
                        >
                          {allSelected ? "Deselect All" : "Select Next"}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {visibleZones.map((code) => {
                        const selected = selectedZoneCodes.includes(code);
                        const disabled = !selected && selectedZoneCodes.length >= MAX_ZONES;
                        
                        // SEQUENTIAL ZONE SELECTION - Check if this is the next zone to select
                        const nextExpectedZone = getNextExpectedZone(region, selectedZoneCodes);
                        const isNextInSequence = code === nextExpectedZone && !selected;
                        
                        return (
                          <button
                            key={code}
                            onClick={() => !disabled && toggleZoneSelection(code)}
                            className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                              selected
                                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md scale-105"
                                : disabled
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                            }`}
                            title={isNextInSequence ? `Next: Select ${code} first` : selected ? `Selected: ${code}` : `Select ${code}`}
                          >
                            {code}
                            {isNextInSequence && <span className="ml-1">→</span>}
                          </button>
                        );
                      })}
                      {canAddMore && (
                        <button
                          onClick={() => addZoneToRegion(region)}
                          className="px-5 py-3 rounded-xl font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-all border-2 border-dashed border-green-300"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedZoneCodes.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h4 className="font-semibold text-blue-900">
                  Selected Zones ({selectedZoneCodes.length})
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedZoneCodes.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm"
                    >
                      {code}
                      <button
                        onClick={() => toggleZoneSelection(code)}
                        className="p-0.5 rounded-full hover:bg-blue-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-center">
              <button
                onClick={proceedToConfiguration}
                disabled={selectedZoneCodes.length === 0}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <Sparkles className="h-6 w-6" />
                Configure Zones
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Step 2: Configure Zones ---------- */
  if (currentStep === "configure-zones" && currentConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Box */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search states and cities..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-slate-300 rounded-xl shadow-lg max-h-80 overflow-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearchResultClick(result)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-slate-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 truncate">
                              {result.name}
                            </span>
                            {result.type === 'city' && result.state && (
                              <span className="text-sm text-slate-500">({result.state})</span>
                            )}
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'Assigned' || result.status === 'Fully Assigned' 
                                ? 'bg-green-100 text-green-800'
                                : result.status === 'Partially Assigned' || result.status === 'In Progress'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {result.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 mt-1 whitespace-pre-line">
                            {result.details}
                          </div>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {result.type === 'state' ? (
                            <span className="text-slate-400">🏛️</span>
                          ) : (
                            <span className="text-slate-400">🏙️</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-slate-900">Configure Zones</h1>
              <p className="text-slate-600 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-slate-500" />
                <span className="block">
                  <b>Rules:</b> States can repeat across sub-zones in the same region. Cities are
                  exclusive across zones. <span className="text-yellow-700 font-semibold">Yellow</span> =
                  leftover cities explicitly deselected by the user in this regional basket (e.g., "Leftover from
                  N1"). Yellow persists until assigned to any sub-zone in the same region.
                </span>
              </p>
              
              {/* State Status Legend */}
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-white border border-slate-300 rounded"></span>
                  Available
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-yellow-50 border border-yellow-500 rounded"></span>
                  Partial
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-green-50 border border-green-500 rounded"></span>
                  Complete
                </span>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-slate-100 border border-slate-300 rounded"></span>
                  Assigned
                </span>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <div className="text-xs text-slate-600 mb-1">Progress</div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-blue-600 to-green-600 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1 text-right text-sm font-semibold text-blue-700">
                {completedZones}/{zoneConfigs.length}
              </div>
            </div>
          </div>

          {/* Tabs with Progressive Disclosure */}
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {zoneConfigs.map((z, idx) => {
              const canNavigate = canNavigateToZone(idx, currentZoneIndex, zoneConfigs);
              const isLocked = !canNavigate && idx > currentZoneIndex;
              
              return (
                <button
                  key={z.zoneCode}
                    onClick={() => {
                      if (isLocked) {
                        // BULLETPROOF TAB NAVIGATION LOCK - Show specific warning for locked tabs
                        const currentZone = zoneConfigs[currentZoneIndex];
                        const targetZone = zoneConfigs[idx];
                        
                        if (currentZone && !currentZone.isComplete) {
                          alert(`⚠ Please complete ${currentZone.zoneName} first before proceeding to ${targetZone.zoneName}`);
                        } else {
                          const nextIncompleteZone = zoneConfigs.find((zone, index) => index > currentZoneIndex && !zone.isComplete);
                          if (nextIncompleteZone) {
                            alert(`⚠ Please complete ${nextIncompleteZone.zoneName} first before proceeding to ${targetZone.zoneName}`);
                          }
                        }
                        return;
                      }
                      setCurrentZoneIndex(idx);
                      // Scroll to top when manually switching zones
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 100);
                    }}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    idx === currentZoneIndex
                      ? "bg-blue-600 text-white shadow-lg scale-105"
                      : z.isComplete
                      ? "bg-green-100 text-green-700"
                      : isLocked
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                  title={isLocked ? `Complete ${zoneConfigs[currentZoneIndex]?.zoneName || 'current zone'} first` : z.region}
                  disabled={isLocked}
                >
                  <span className="mr-1">{z.zoneName}</span>
                  {z.isComplete && <span>✓</span>}
                  {isLocked && <span>🔒</span>}
                </button>
              );
            })}
          </div>

          {/* Placard */}
          <div className="mt-4 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-slate-900">
                  Zone {currentConfig.zoneName}{" "}
                  <span className="text-slate-500">({currentConfig.region})</span>
                </h2>
                <p className="text-slate-600 text-sm">
                  Click a state row to focus it. The right-side checkbox now works:
                  <b> click to select all remaining cities</b> (including yellow leftovers) for that state.
                  It is disabled if nothing is available to select.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveCurrentZone}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 ${
                    availableStatesForCurrent.length === 0 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <CheckCircle className="h-5 w-5" /> 
                  {availableStatesForCurrent.length === 0 
                    ? 'Delete this zone → Next' 
                    : 'Save this zone → Next'
                  }
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentConfig.zoneCode}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Left: States with Status Icons */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Available States</h3>
                  <div className="max-h-[480px] overflow-y-auto pr-1 space-y-2">
                    {availableStatesForCurrent.length === 0 && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-600">🚫</span>
                          <span className="font-semibold text-red-800">No states available</span>
                        </div>
                        <p className="text-sm text-red-700 mb-2">
                          All states in this region have been fully assigned to previous zones, or have no cities available for selection.
                        </p>
                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <strong>Why this happens:</strong> When all cities in a state are selected in previous zones, that state becomes unavailable for future zones. This prevents duplicate city assignments.
                        </div>
                        <p className="text-sm text-red-700 mt-2">
                          This subzone will be deleted and you can proceed to the next one.
                        </p>
                      </div>
                    )}

                    {availableStatesForCurrent.map((state) => {
                      const stats = computeStateStats(state);
                      const focused = getActiveState() === state;
                      const stateStatus = getStateStatusInfo(state, currentZoneIndex);
                      const cardColor = getStateCardColor(state, currentZoneIndex);

                      const cardTone = focused
                        ? "border-blue-700 ring-2 ring-blue-100"
                        : cardColor;

                      return (
                        <div
                          key={state}
                          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${cardTone}`}
                          onClick={() => onStateRowClick(state)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-900 truncate">{state}</div>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {/* Selected progress in this zone (relative to what's available to this zone) */}
                                {stats.totalAvailableForThisZone > 0 && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                    {stats.selectedHere}/{stats.totalAvailableForThisZone} selected
                                  </span>
                                )}
                                {/* Non-yellow remaining count */}
                                {stats.nonYellowRemaining > 0 && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                                    {stats.nonYellowRemaining} cities remaining
                                  </span>
                                )}
                                {/* Yellow leftover count (info) */}
                                {stats.yellowCount > 0 && (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                                    {stats.yellowCount} leftover
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* MODERN STATE STATUS INDICATOR - Moved to right side */}
                            <div className="flex-shrink-0">
                              <span className={`text-2xl ${stateStatus.color}`} title={stateStatus.label}>
                                {stateStatus.icon}
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Cities for active state ONLY */}
                <div>
                  {/* LAYOUT REORGANIZATION - Move buttons to right side of Cities header */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Cities ({getActiveState() || "none"})
                    </h3>
                    {getActiveState() && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllIncludingYellowInActiveState()}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-800 hover:bg-green-200 font-medium"
                          title="Select all remaining cities for this state (including leftovers)"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => clearAllCitiesInActiveState()}
                          className="text-xs px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-medium"
                          title="Clear selected cities in this state and mark them as leftovers"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-[480px] overflow-y-auto pr-1">
                    {!getActiveState() && (
                      <div className="text-sm text-slate-500">
                        Click a state on the left to edit its cities.
                      </div>
                    )}

                    {getActiveState() && currentRegion && (
                      <div className="space-y-4">
                        {(() => {
                          const state = getActiveState()!;
                          const allKeys = getAllCityKeysForStateInRegion(state, currentRegion);

                          // Availability relative to other zones
                          const available = new Set(getAvailableCityKeysForState(state));

                          // Sort city names
                          const sorted = allKeys
                            .map((k) => ({ ...parseCsKey(k), key: k }))
                            .sort((a, b) =>
                              a.city === b.city ? a.state.localeCompare(b.state) : a.city.localeCompare(b.city)
                            );

                          return (
                            <div className="border border-slate-200 rounded-xl p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-slate-900">{state}</h4>
                                <div className="text-xs text-slate-500">
                                  {
                                    currentConfig.selectedCities.filter(
                                      (k) => parseCsKey(k).state === state
                                    ).length
                                  }{" "}
                                  selected
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sorted.map(({ city, key }) => {
                                  const checked = currentConfig.selectedCities.includes(key);
                                  const isBlocked = !available.has(key) && !checked; // used elsewhere
                                  const isYellow = yellowSetForRegion.has(key) && !checked;
                                  const meta = yellowMetaFor(key);
                                  const sourceText =
                                    isYellow && meta?.sources?.length
                                      ? `Leftover`
                                      : null;

                                  return (
                                    <label
                                      key={key}
                                      className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                                        checked
                                          ? "bg-green-50 border-green-200"
                                          : isBlocked
                                          ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                          : isYellow
                                          ? "bg-yellow-50 border-yellow-200"
                                          : "bg-white border-slate-200 hover:bg-slate-50"
                                      }`}
                                      title={
                                        isBlocked
                                          ? "Already assigned in another zone"
                                          : isYellow
                                          ? sourceText || "Leftover from another sub-zone"
                                          : undefined
                                      }
                                    >
                                      <span className="truncate pr-2 flex items-center gap-2">
                                        <span className="truncate">{city}</span>
                                        {isYellow && sourceText && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800">
                                            {sourceText}
                                          </span>
                                        )}
                                      </span>
                                      <input
                                        type="checkbox"
                                        disabled={isBlocked}
                                        checked={checked}
                                        onChange={() => toggleCity(key)}
                                        className="h-4 w-4 text-green-600"
                                      />
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Summary */}
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <h4 className="font-semibold text-green-900">Zone Summary</h4>
              <p className="text-sm text-green-900/80">
                {currentConfig.selectedCities.length} cities in{" "}
                {currentConfig.selectedStates.length} state(s)
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentStep("select-zones")}
                className="px-4 py-2 text-slate-700 hover:text-slate-900"
              >
                ← Back to Zone Selection
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={saveCurrentZone}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                  <CheckCircle className="h-5 w-5" /> Save this zone → Next
                </button>

                {(zoneConfigs.length <= 1 || zoneConfigs.every((z) => z.isComplete)) && (
                  <button
                    onClick={finalizeAll}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save All & Complete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Step 3: Price Matrix ---------- */
  if (currentStep === "price-matrix") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep("configure-zones")}
              className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Zone Configuration
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                Zone Price Matrix
              </h1>
              <p className="mt-2 text-slate-600">
                Set pricing between all your configured zones. Enter prices in your preferred currency.
              </p>
            </div>

            {/* Price Matrix Grid */}
            <div className="overflow-auto max-h-[600px] border border-slate-300 rounded-lg">
              <table className="w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 p-2 bg-slate-100 font-bold text-slate-800 text-sm border border-slate-300 text-center min-w-[80px]">
                      FROM/TO
                    </th>
                    {validZones.map((zone) => (
                      <th
                        key={zone.zoneCode}
                        className="p-2 bg-slate-50 font-semibold text-slate-700 min-w-[60px] text-xs border border-slate-300 text-center"
                      >
                        {zone.zoneCode}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validZones.map((fromZone) => (
                    <tr key={fromZone.zoneCode}>
                      <td className="sticky left-0 z-10 p-2 bg-slate-50 font-semibold text-slate-700 text-xs border border-slate-300 text-center min-w-[80px]">
                        {fromZone.zoneCode}
                      </td>
                      {validZones.map((toZone) => {
                        const currentPrice = getPrice(fromZone.zoneCode, toZone.zoneCode);
                        return (
                          <td
                            key={`${fromZone.zoneCode}-${toZone.zoneCode}`}
                            className="p-1 border border-slate-300 min-w-[60px]"
                          >
                            <DecimalInput
                              value={currentPrice}
                              onChange={(value) =>
                                updatePrice(fromZone.zoneCode, toZone.zoneCode, value)
                              }
                              placeholder="0.000"
                              className="w-full h-full px-2 py-1 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-xs hover:border-slate-300 transition-colors"
                              max={999}
                              maxDecimals={3}
                              maxIntegerDigits={3}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Matrix Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Zones:</span>
                  <span className="ml-2 font-semibold text-blue-900">{validZones.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Routes:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {validZones.length * validZones.length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Prices Set:</span>
                  <span className="ml-2 font-semibold text-blue-900">
                    {priceMatrix.filter((entry) => entry.price !== null).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-3">
                <button
                  onClick={savePriceMatrix}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Matrix
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={exportPriceMatrix}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    Export CSV
                  </button>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
                    <Sparkles className="h-4 w-4" />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  if (
                    confirm(
                      "Proceed to ODA configuration? This will save your zone and pricing data."
                    )
                  ) {
                    savePriceMatrix();
                    window.location.href = "/oda-upload";
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
              >
                <Sparkles className="h-5 w-5" />
                Next: Configure ODA
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return null;
};

export default ZonePriceMatrix;
