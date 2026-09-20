import {
  RouteOption,
  RouteSegment,
  IntermediateStop,
  CorporatePolicy,
  TravelerProfile,
  ComplianceStatus,
  RebookingAlternative,
  CabinClass,
  TravelMode,
  PreferenceMode,
  CurrencyCode,
} from '../types/travel';
import { PRESET_ROUTES_MAP, CITY_PRESETS } from '../data/travelData';
import { GoogleRouteResult } from './googleDirections';

const CABIN_RANKS: Record<CabinClass, number> = {
  ECONOMY: 1,
  PREMIUM_ECONOMY: 2,
  BUSINESS: 3,
  FIRST: 4,
};

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  exchangeRateToUSD: number; // 1 USD = 84.5 INR, 0.92 EUR, 0.79 GBP
}

export const CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', exchangeRateToUSD: 84.5 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar (USD)', exchangeRateToUSD: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (EUR)', exchangeRateToUSD: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', exchangeRateToUSD: 0.79 },
};

export function convertUSDToCurrency(amountUSD: number, currency: CurrencyCode = 'USD'): number {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  return Math.round(amountUSD * config.exchangeRateToUSD);
}

export function convertINRToCurrency(amountINR: number, currency: CurrencyCode = 'USD'): number {
  if (currency === 'INR') return Math.round(amountINR);
  const amountUSD = amountINR / CURRENCY_CONFIGS.INR.exchangeRateToUSD;
  return convertUSDToCurrency(amountUSD, currency);
}

export function convertCurrencyToUSD(amount: number, fromCurrency: CurrencyCode = 'USD'): number {
  const config = CURRENCY_CONFIGS[fromCurrency] || CURRENCY_CONFIGS.USD;
  return Math.round(amount / config.exchangeRateToUSD);
}

export function formatFare(amount: number, currency: CurrencyCode = 'USD'): string {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  if (currency === 'INR') {
    return `${config.symbol}${Math.round(amount).toLocaleString('en-IN')}`;
  }
  return `${config.symbol}${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Detects whether the origin/destination is in India or another regional jurisdiction
 */
export function detectCountryOrRegion(
  originName: string,
  originCode: string,
  destName: string,
  destCode: string,
  originCoords?: { lat: number; lon: number },
  destCoords?: { lat: number; lon: number }
): { isIndia: boolean; isUK: boolean; isEurope: boolean; defaultCurrency: CurrencyCode } {
  const text = `${originName} ${destName} ${originCode} ${destCode}`.toLowerCase();

  const isCoordInIndia = (c?: { lat: number; lon: number }) =>
    Boolean(c && c.lat >= 6.5 && c.lat <= 37.5 && c.lon >= 68.0 && c.lon <= 97.5);

  const isIndia =
    isCoordInIndia(originCoords) ||
    isCoordInIndia(destCoords) ||
    text.includes('india') ||
    text.includes('gujarat') ||
    text.includes('nadiad') ||
    text.includes('talaja') ||
    text.includes('ahmedabad') ||
    text.includes('mumbai') ||
    text.includes('delhi') ||
    text.includes('bengaluru') ||
    text.includes('bangalore') ||
    text.includes('bhavnagar') ||
    text.includes('surat') ||
    text.includes('vadodara') ||
    originCode === 'NAD' ||
    destCode === 'TAL' ||
    originCode === 'BOM' ||
    destCode === 'DEL' ||
    originCode === 'AMD' ||
    destCode === 'AMD';

  if (isIndia) {
    return { isIndia: true, isUK: false, isEurope: false, defaultCurrency: 'INR' };
  }

  const isUK =
    text.includes('united kingdom') ||
    text.includes('london') ||
    originCode === 'LON' ||
    destCode === 'LON' ||
    originCode === 'LHR' ||
    destCode === 'LHR';
  if (isUK) {
    return { isIndia: false, isUK: true, isEurope: false, defaultCurrency: 'GBP' };
  }

  const isEurope =
    text.includes('france') ||
    text.includes('germany') ||
    text.includes('paris') ||
    text.includes('berlin') ||
    originCode === 'PAR' ||
    destCode === 'PAR' ||
    originCode === 'CDG' ||
    destCode === 'CDG';
  if (isEurope) {
    return { isIndia: false, isUK: false, isEurope: true, defaultCurrency: 'EUR' };
  }

  return { isIndia: false, isUK: false, isEurope: false, defaultCurrency: 'USD' };
}

/**
 * Calculates haversine distance in km between two geo-coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates route compliance against corporate travel policy
 */
export function evaluatePolicyCompliance(
  route: RouteOption,
  policy: CorporatePolicy
): { status: ComplianceStatus; notes: string[] } {
  const notes: string[] = [];
  let isOutOfPolicy = false;
  let hasWarning = false;

  const currency = route.currency || 'USD';
  const sym = route.currency_symbol || (CURRENCY_CONFIGS[currency]?.symbol || '$');
  const actualCost = route.total_cost ?? route.total_cost_usd;
  const benchCost = route.benchmark_cost ?? route.benchmark_cost_usd;
  const costDelta = actualCost - benchCost;

  // Accurately convert policy allowance to active route currency
  const allowableThreshold = convertUSDToCurrency(policy.max_additional_fare_usd, currency);

  // 1. Check rail mandate for short distances
  const hasFlight = route.segments.some((s) => s.mode === 'FLIGHT');
  if (hasFlight && route.total_distance_km <= policy.mandate_rail_under_km) {
    notes.push(
      `Mandatory Rail/Surface corridor: Commercial flights restricted under ${policy.mandate_rail_under_km} km (Route is ${route.total_distance_km} km).`
    );
    isOutOfPolicy = true;
  }

  // 2. Check cost over benchmark
  if (costDelta > allowableThreshold) {
    notes.push(
      `Fare (${sym}${Math.round(actualCost).toLocaleString()}) exceeds benchmark limit (${sym}${Math.round(benchCost).toLocaleString()} + ${sym}${Math.round(allowableThreshold).toLocaleString()} policy allowance) by ${sym}${Math.round(costDelta - allowableThreshold).toLocaleString()}.`
    );
    isOutOfPolicy = true;
  } else if (costDelta > 0) {
    notes.push(
      `Fare is ${sym}${Math.round(costDelta).toLocaleString()} above lowest baseline, but within allowable ${sym}${Math.round(allowableThreshold).toLocaleString()} threshold.`
    );
    hasWarning = true;
  }

  // 3. Cabin class check
  const highestCabin = route.segments.reduce((max, seg) => {
    const rank = CABIN_RANKS[seg.cabin_class || 'ECONOMY'];
    return rank > CABIN_RANKS[max] ? (seg.cabin_class || 'ECONOMY') : max;
  }, 'ECONOMY' as CabinClass);

  const allowedCabin =
    route.total_duration_minutes > policy.international_flight_duration_threshold_hours * 60
      ? policy.allowed_cabin_international
      : policy.allowed_cabin_domestic;

  if (CABIN_RANKS[highestCabin] > CABIN_RANKS[allowedCabin]) {
    notes.push(
      `Cabin tier '${highestCabin}' exceeds authorized level '${allowedCabin}' for journeys under ${policy.international_flight_duration_threshold_hours}h.`
    );
    isOutOfPolicy = true;
  }

  // 4. Max stops check
  if (route.transfer_count > policy.max_stops) {
    notes.push(
      `Route includes ${route.transfer_count} connections, exceeding the policy maximum of ${policy.max_stops}.`
    );
    hasWarning = true;
  }

  // 5. Preferred & Blocked carriers
  route.segments.forEach((seg) => {
    if (seg.provider_name && policy.blocked_carriers.some((b) => seg.provider_name.includes(b))) {
      notes.push(`Carrier '${seg.provider_name}' is blocked under corporate procurement guidelines.`);
      isOutOfPolicy = true;
    }
  });

  let status: ComplianceStatus = 'COMPLIANT';
  if (isOutOfPolicy) {
    status = 'OUT_OF_POLICY';
  } else if (hasWarning) {
    status = 'WARNING';
  }

  if (notes.length === 0) {
    notes.push('100% Compliant with Corporate Travel Policy guidelines.');
  }

  return { status, notes };
}

/**
 * Calibrates route pricing ensuring consistent currency, realistic benchmarks,
 * and exact mathematical summation of all segments to the total fare.
 */
export function calibrateRoutePricing(
  routes: RouteOption[],
  currency: CurrencyCode = 'USD'
): RouteOption[] {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const sym = config.symbol;

  return routes.map((route) => {
    // Determine the base USD cost
    let baseCostUSD = route.total_cost_usd;
    if (!baseCostUSD || baseCostUSD <= 0) {
      if (route.total_cost && route.currency) {
        baseCostUSD = convertCurrencyToUSD(route.total_cost, route.currency);
      } else {
        baseCostUSD = 100;
      }
    }

    let baseBenchUSD = route.benchmark_cost_usd;
    if (!baseBenchUSD || baseBenchUSD <= 0) {
      baseBenchUSD = Math.round(baseCostUSD * 1.15);
    }

    const totalCostLocal = convertUSDToCurrency(baseCostUSD, currency);
    const benchCostLocal = convertUSDToCurrency(baseBenchUSD, currency);

    // Reconcile segments so the sum of segment costs exactly equals the total route fare
    let runningUSD = 0;
    let runningLocal = 0;

    const calibratedSegments = route.segments.map((seg, idx) => {
      const isLast = idx === route.segments.length - 1;
      let segUSD = seg.cost_usd;
      if (!segUSD || segUSD <= 0) {
        segUSD = Math.max(1, Math.round(baseCostUSD / route.segments.length));
      }

      let segLocal = convertUSDToCurrency(segUSD, currency);

      if (isLast && route.segments.length > 1) {
        // Enforce exact mathematical sum without rounding mismatch
        segUSD = Math.max(1, baseCostUSD - runningUSD);
        segLocal = Math.max(1, totalCostLocal - runningLocal);
      } else {
        runningUSD += segUSD;
        runningLocal += segLocal;
      }

      return {
        ...seg,
        cost_usd: segUSD,
        cost: segLocal,
        currency_symbol: sym,
      };
    });

    return {
      ...route,
      currency,
      currency_symbol: sym,
      total_cost: totalCostLocal,
      benchmark_cost: benchCostLocal,
      total_cost_usd: baseCostUSD,
      benchmark_cost_usd: baseBenchUSD,
      segments: calibratedSegments,
    };
  });
}

/**
 * Generates route options based on search query, travel mode, traveler preference, and corporate policy
 */
export function calculateRoutes(
  originName: string,
  originCode: string,
  destName: string,
  destCode: string,
  travelMode: TravelMode,
  preference: PreferenceMode,
  policy: CorporatePolicy,
  traveler: TravelerProfile,
  originCoords?: { lat: number; lon: number },
  destCoords?: { lat: number; lon: number },
  googleRoute?: GoogleRouteResult | null,
  overrideCurrency?: CurrencyCode,
  viaStation?: string
): RouteOption[] {
  const directKey = `${originCode.toLowerCase()}-${destCode.toLowerCase()}`;
  const reverseKey = `${destCode.toLowerCase()}-${originCode.toLowerCase()}`;

  const region = detectCountryOrRegion(
    originName,
    originCode,
    destName,
    destCode,
    originCoords,
    destCoords
  );
  const activeCurrency = overrideCurrency || region.defaultCurrency;

  let baseOptions: RouteOption[] = [];

  // Check preset route matches
  const directPreset = PRESET_ROUTES_MAP[directKey];
  const reversePreset = PRESET_ROUTES_MAP[reverseKey];

  if (directPreset) {
    baseOptions = calibrateRoutePricing(JSON.parse(JSON.stringify(directPreset)), activeCurrency);
  } else if (reversePreset) {
    const reversed = reversePreset.map((opt, idx) => ({
      ...opt,
      id: `${opt.id}-rev-${idx}`,
      title: `${opt.title} (Return)`,
      origin_name: destName,
      origin_code: destCode,
      destination_name: originName,
      destination_code: originCode,
      segments: opt.segments.map((seg, sIdx) => ({
        ...seg,
        id: `${seg.id}-rev-${sIdx}`,
        start_name: seg.end_name,
        start_code: seg.end_code,
        end_name: seg.start_name,
        end_code: seg.start_code,
      })),
    }));
    baseOptions = calibrateRoutePricing(reversed, activeCurrency);
  } else {
    // Dynamically synthesize realistic multi-modal routes for ANY place globally
    const rawOptions = generateSyntheticRoutes(
      originName,
      originCode,
      destName,
      destCode,
      originCoords,
      destCoords,
      googleRoute,
      activeCurrency,
      viaStation
    );
    baseOptions = calibrateRoutePricing(rawOptions, activeCurrency);
  }

  // If traveler specified a preferred viaStation and we used preset routes, check if we need to promote or append a viaStation connecting route
  if (viaStation && viaStation.trim()) {
    const trimmedVia = viaStation.trim().toLowerCase();
    const hasViaInPreset = baseOptions.some(
      (opt) =>
        opt.via_stations?.some((v) => v.toLowerCase().includes(trimmedVia)) ||
        opt.segments.some((s) =>
          s.intermediate_stops?.some((st) => st.station_name.toLowerCase().includes(trimmedVia))
        )
    );

    if (!hasViaInPreset) {
      // Synthesize custom connecting route routing through traveler's requested viaStation
      const viaSynthetic = generateSyntheticRoutes(
        originName,
        originCode,
        destName,
        destCode,
        originCoords,
        destCoords,
        googleRoute,
        activeCurrency,
        viaStation.trim()
      );
      const calibratedVia = calibrateRoutePricing(viaSynthetic, activeCurrency);
      const connectingViaRoute = calibratedVia.find((r) => r.transfer_count > 0);
      if (connectingViaRoute) {
        baseOptions.unshift(connectingViaRoute);
      }
    }
  }

  // Filter by travel mode if not ALL_MODES
  let filtered = baseOptions;
  if (travelMode === 'FLIGHT_ONLY') {
    filtered = baseOptions.filter(
      (r) => r.travel_mode === 'FLIGHT_ONLY' || r.segments.some((s) => s.mode === 'FLIGHT')
    );
  } else if (travelMode === 'RAIL_ONLY') {
    filtered = baseOptions.filter(
      (r) =>
        r.travel_mode === 'RAIL_ONLY' ||
        r.segments.every(
          (s) =>
            s.mode === 'HIGH_SPEED_RAIL' ||
            s.mode === 'COMMUTER_TRAIN' ||
            s.mode === 'METRO' ||
            s.mode === 'WALK'
        )
    );
  } else if (travelMode === 'GROUND_ONLY') {
    filtered = baseOptions.filter((r) => !r.segments.some((s) => s.mode === 'FLIGHT'));
  }

  if (filtered.length === 0) {
    filtered = baseOptions;
  }

  // Re-evaluate corporate policy and update scores
  const evaluated = filtered.map((route) => {
    const comp = evaluatePolicyCompliance(route, policy);
    return {
      ...route,
      compliance_status: comp.status,
      compliance_notes: comp.notes,
    };
  });

  // Sort based on company preference
  evaluated.sort((a, b) => {
    const costA = a.total_cost ?? a.total_cost_usd;
    const costB = b.total_cost ?? b.total_cost_usd;
    if (preference === 'FASTEST') {
      return a.total_duration_minutes - b.total_duration_minutes;
    }
    if (preference === 'CHEAPEST') {
      return costA - costB;
    }
    // BALANCED: cost + duration optimization
    const scoreA = a.total_duration_minutes * 0.5 + costA * 0.05;
    const scoreB = b.total_duration_minutes * 0.5 + costB * 0.05;
    return scoreA - scoreB;
  });

  return evaluated;
}

/**
 * Generates realistic intermediate stations and halts for any travel corridor
 */
export function generateIntermediateStopsForLeg(
  startName: string,
  startCode: string,
  endName: string,
  endCode: string,
  startTime: string,
  durationMinutes: number,
  distKm: number,
  mode: 'BUS' | 'COMMUTER_TRAIN' | 'HIGH_SPEED_RAIL' | 'FLIGHT' | 'RIDE_SHARE',
  isIndia: boolean,
  specifiedVia?: string
): { stops: IntermediateStop[]; viaStationNames: string[] } {
  const combined = `${startName} ${endName} ${startCode} ${endCode}`.toLowerCase();
  const via = specifiedVia?.trim();

  let candidateStops: Array<{ name: string; code?: string; halt: number }> = [];

  if (isIndia) {
    if (
      combined.includes('nadiad') ||
      combined.includes('talaja') ||
      combined.includes('anand') ||
      combined.includes('bhavnagar') ||
      combined.includes('vadodara') ||
      combined.includes('ahmedabad') ||
      combined.includes('gujarat')
    ) {
      if (mode === 'BUS') {
        candidateStops = [
          { name: 'Anand New ST Stand', code: 'ANND', halt: 5 },
          { name: 'Borsad Chowkdi', code: 'BRSD', halt: 3 },
          { name: 'Tarapur Cross Road', code: 'TRPR', halt: 8 },
          { name: 'Bhavnagar Highway Bypass', code: 'BVN', halt: 6 },
          { name: 'Trapaj Station Halt', code: 'TRPJ', halt: 3 },
        ];
      } else {
        candidateStops = [
          { name: 'Anand Junction', code: 'ANND', halt: 3 },
          { name: 'Vadodara Junction', code: 'BRC', halt: 5 },
          { name: 'Botad Junction', code: 'BTD', halt: 4 },
          { name: 'Sihor Gujarat', code: 'SOJN', halt: 2 },
          { name: 'Bhavnagar Terminus', code: 'BVC', halt: 6 },
        ];
      }
    } else if (
      combined.includes('delhi') ||
      combined.includes('jaipur') ||
      combined.includes('agra') ||
      combined.includes('chandigarh')
    ) {
      candidateStops = [
        { name: 'Gurugram Junction', code: 'GGN', halt: 3 },
        { name: 'Faridabad New Town', code: 'FDB', halt: 2 },
        { name: 'Mathura Junction', code: 'MTJ', halt: 5 },
        { name: 'Bharatpur Junction', code: 'BTE', halt: 3 },
      ];
    } else if (
      combined.includes('mumbai') ||
      combined.includes('pune') ||
      combined.includes('nashik')
    ) {
      candidateStops = [
        { name: 'Thane Central Station', code: 'TNA', halt: 3 },
        { name: 'Kalyan Junction', code: 'KYN', halt: 4 },
        { name: 'Karjat Station Halt', code: 'KJT', halt: 2 },
        { name: 'Lonavala Crossing', code: 'LNL', halt: 4 },
        { name: 'Chinchwad Station', code: 'CCH', halt: 2 },
      ];
    } else if (
      combined.includes('bengaluru') ||
      combined.includes('bangalore') ||
      combined.includes('mysuru') ||
      combined.includes('chennai')
    ) {
      candidateStops = [
        { name: 'Electronic City Tollgate', code: 'EC', halt: 3 },
        { name: 'Hosur Station Hub', code: 'HSRA', halt: 4 },
        { name: 'Krishnagiri Highway Halt', code: 'KGI', halt: 5 },
        { name: 'Ambur Junction', code: 'AB', halt: 3 },
      ];
    } else {
      const oClean = startName.split(/[\s,]+/)[0];
      const dClean = endName.split(/[\s,]+/)[0];
      candidateStops = [
        { name: `${oClean} Highway Halt`, code: `${startCode}B`, halt: 3 },
        { name: 'Midway Regional Junction', code: 'MIDW', halt: 5 },
        { name: 'Sector Crossing Station', code: 'SCTR', halt: 4 },
        { name: `${dClean} Outer Junction`, code: `${endCode}O`, halt: 3 },
      ];
    }
  } else {
    // International / US / Europe
    if (
      combined.includes('new york') ||
      combined.includes('washington') ||
      combined.includes('philadelphia') ||
      combined.includes('boston')
    ) {
      candidateStops = [
        { name: 'Newark Penn Station', code: 'NWK', halt: 2 },
        { name: 'Trenton Transit Center', code: 'TRE', halt: 2 },
        { name: 'Philadelphia 30th Street', code: 'PHL', halt: 5 },
        { name: 'Wilmington Station', code: 'WIL', halt: 2 },
        { name: 'Baltimore Penn Station', code: 'BAL', halt: 4 },
      ];
    } else if (
      combined.includes('london') ||
      combined.includes('paris') ||
      combined.includes('brussels') ||
      combined.includes('lille')
    ) {
      candidateStops = [
        { name: 'Ebbsfleet International', code: 'EBF', halt: 2 },
        { name: 'Calais-Fréthun', code: 'CFT', halt: 2 },
        { name: 'Lille Europe', code: 'LLE', halt: 4 },
        { name: 'Arras Station', code: 'ARS', halt: 3 },
      ];
    } else {
      const oClean = startName.split(/[\s,]+/)[0];
      const dClean = endName.split(/[\s,]+/)[0];
      candidateStops = [
        { name: `${oClean} Waypoint Station`, code: 'WP1', halt: 3 },
        { name: 'Central Interchange Junction', code: 'INT', halt: 5 },
        { name: `${dClean} North Halt`, code: 'WP2', halt: 3 },
      ];
    }
  }

  // If traveler specified a preferred intermediate station, incorporate it
  if (via) {
    const already = candidateStops.some((s) => s.name.toLowerCase().includes(via.toLowerCase()));
    if (!already) {
      const insertIdx = Math.floor(candidateStops.length / 2);
      candidateStops.splice(insertIdx, 0, {
        name: via.includes('Station') || via.includes('Hub') || via.includes('Junction') ? via : `${via} Station`,
        code: 'VIA',
        halt: 5,
      });
    }
  }

  // Scale stop count with distance
  let targetCount = 3;
  if (distKm < 70) targetCount = Math.min(2, candidateStops.length);
  else if (distKm < 160) targetCount = Math.min(3, candidateStops.length);
  else if (distKm < 300) targetCount = Math.min(4, candidateStops.length);
  else targetCount = Math.min(5, candidateStops.length);

  const selectedStops = candidateStops.slice(0, Math.max(1, targetCount));

  const stops: IntermediateStop[] = selectedStops.map((c, idx) => {
    const frac = (idx + 1) / (selectedStops.length + 1);
    const elapsedMinutes = Math.max(12, Math.round(durationMinutes * frac));
    const arrTime = calculateArrivalTime(startTime, elapsedMinutes);
    const depTime = calculateArrivalTime(arrTime, c.halt);
    return {
      station_name: c.name,
      station_code: c.code,
      arrival_time: arrTime,
      departure_time: depTime,
      halt_minutes: c.halt,
    };
  });

  return {
    stops,
    viaStationNames: stops.map((s) => s.station_name),
  };
}

/**
 * Determines a sensible intermediate hub station for connecting routes
 */
function determineIntermediateHub(
  originName: string,
  destName: string,
  isIndia: boolean,
  specifiedVia?: string
): { hubName: string; hubCode: string } {
  if (specifiedVia && specifiedVia.trim()) {
    const clean = specifiedVia.trim();
    return {
      hubName:
        clean.includes('Hub') || clean.includes('Junction') || clean.includes('Station')
          ? clean
          : `${clean} Transit Hub`,
      hubCode: clean.slice(0, 3).toUpperCase(),
    };
  }

  const combined = `${originName} ${destName}`.toLowerCase();
  if (isIndia) {
    if (combined.includes('talaja') || combined.includes('bhavnagar') || combined.includes('nadiad')) {
      return { hubName: 'Bhavnagar Central ST Hub', hubCode: 'BVN' };
    }
    if (combined.includes('gujarat') || combined.includes('ahmedabad') || combined.includes('vadodara')) {
      return { hubName: 'Vadodara Junction Interchange', hubCode: 'BRC' };
    }
    if (combined.includes('mumbai') || combined.includes('pune')) {
      return { hubName: 'Kalyan / Lonavala Interchange', hubCode: 'KYN' };
    }
    if (combined.includes('delhi') || combined.includes('agra') || combined.includes('jaipur')) {
      return { hubName: 'Mathura Junction Interchange', hubCode: 'MTJ' };
    }
    if (combined.includes('bengaluru') || combined.includes('chennai')) {
      return { hubName: 'Hosur Station Hub', hubCode: 'HSRA' };
    }
    const cleanO = originName.split(/[\s,]+/)[0];
    return { hubName: `${cleanO} Intermediate Transit Junction`, hubCode: 'INT' };
  } else {
    if (combined.includes('new york') || combined.includes('washington') || combined.includes('philadelphia')) {
      return { hubName: 'Philadelphia 30th St Hub', hubCode: 'PHL' };
    }
    if (combined.includes('london') || combined.includes('paris')) {
      return { hubName: 'Lille Europe Interchange', hubCode: 'LLE' };
    }
    const cleanO = originName.split(/[\s,]+/)[0];
    return { hubName: `${cleanO} Regional Interchange Hub`, hubCode: 'HUB' };
  }
}

/**
 * Dynamically synthesizes realistic routes between any two locations worldwide
 */
function generateSyntheticRoutes(
  originName: string,
  originCode: string,
  destName: string,
  destCode: string,
  originCoords?: { lat: number; lon: number },
  destCoords?: { lat: number; lon: number },
  googleRoute?: GoogleRouteResult | null,
  currency: CurrencyCode = 'USD',
  viaStation?: string
): RouteOption[] {
  let dist = 180;

  if (googleRoute && googleRoute.distanceKm > 0) {
    dist = googleRoute.distanceKm;
  } else if (originCoords && destCoords && originCoords.lat && destCoords.lat) {
    const straightLine = calculateHaversineDistance(
      originCoords.lat,
      originCoords.lon,
      destCoords.lat,
      destCoords.lon
    );
    // Real roads and tracks typically wind 1.15x - 1.25x straight-line distance
    dist = Math.round(straightLine * 1.18);
  } else {
    const originPreset = CITY_PRESETS.find(
      (c) => c.name.toLowerCase().includes(originName.toLowerCase()) || c.code === originCode
    );
    const destPreset = CITY_PRESETS.find(
      (c) => c.name.toLowerCase().includes(destName.toLowerCase()) || c.code === destCode
    );
    if (originPreset && destPreset) {
      const straightLine = calculateHaversineDistance(
        originPreset.lat,
        originPreset.lon,
        destPreset.lat,
        destPreset.lon
      );
      dist = Math.round(straightLine * 1.18);
    }
  }

  if (dist < 15) dist = 35;

  const region = detectCountryOrRegion(
    originName,
    originCode,
    destName,
    destCode,
    originCoords,
    destCoords
  );
  const isIndia = region.isIndia;
  const currConfig = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const sym = currConfig.symbol;

  const hubInfo = determineIntermediateHub(originName, destName, isIndia, viaStation);
  const options: RouteOption[] = [];

  // ============================================================================
  // CASE A: INDIA REGIONAL ROUTES (e.g. Nadiad ⇄ Talaja, Gujarat, or Mumbai ⇄ Pune)
  // ============================================================================
  if (isIndia) {
    if (dist <= 450) {
      // 1. Intercity State Transport / Regional Express Bus (GSRTC Express)
      let busDurationMinutes = Math.round((dist / 38) * 60);
      if (googleRoute && googleRoute.durationMinutes > 0) {
        busDurationMinutes = Math.round(googleRoute.durationMinutes * 1.16);
      }
      if (dist >= 140 && dist <= 220) {
        busDurationMinutes = Math.max(240, Math.min(300, busDurationMinutes));
      }

      const busCostINR = Math.max(80, Math.round(dist * 1.45));
      const busBenchmarkINR = Math.round(busCostINR * 1.3);
      const busCostUSD = Math.max(2, Math.round(busCostINR / 84));

      const busIntermediate = generateIntermediateStopsForLeg(
        originName,
        originCode,
        destName,
        destCode,
        '08:00 AM',
        busDurationMinutes,
        dist,
        'BUS',
        true,
        viaStation
      );

      options.push({
        id: `ind-bus-${dist}`,
        title: `Intercity Highway Express Bus (${originCode} ⇄ ${destCode})`,
        badge: 'Corporate Pick',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'GROUND_ONLY',
        total_distance_km: dist,
        total_duration_minutes: busDurationMinutes,
        total_cost: currency === 'INR' ? busCostINR : Math.round(busCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? busBenchmarkINR : Math.round(busBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: busCostUSD,
        benchmark_cost_usd: Math.max(3, Math.round(busBenchmarkINR / 84)),
        currency,
        currency_symbol: sym,
        transfer_count: 0,
        via_stations: busIntermediate.viaStationNames,
        compliance_status: 'COMPLIANT',
        compliance_notes: [
          `Optimal state highway transit corridor (${Math.floor(busDurationMinutes / 60)}h ${busDurationMinutes % 60}m travel time)`,
          `Intermediate stopping stations: ${busIntermediate.viaStationNames.slice(0, 3).join(', ')}`,
          `Fare ${sym}${currency === 'INR' ? busCostINR : Math.round(busCostINR / currConfig.exchangeRateToUSD)} within approved benchmark limit`,
        ],
        max_cabin_class: 'ECONOMY',
        reliability_score: 93,
        segments: [
          {
            id: `ind-seg-bus-1`,
            sequence_order: 1,
            mode: 'BUS',
            provider_name: 'Gujarat State Road Transport (GSRTC Express)',
            carrier_code: 'GSRTC',
            flight_or_service_num: 'Express Line 104',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Central Bus Station`,
            start_code: originCode,
            start_lat: originCoords?.lat || 0,
            start_lon: originCoords?.lon || 0,
            departure_time: '08:00 AM',
            end_name: `${destName} Bus Depot`,
            end_code: destCode,
            end_lat: destCoords?.lat || 0,
            end_lon: destCoords?.lon || 0,
            arrival_time: calculateArrivalTime('08:00 AM', busDurationMinutes),
            distance_km: dist,
            duration_minutes: busDurationMinutes,
            delay_minutes: 0,
            cost_usd: busCostUSD,
            cost: currency === 'INR' ? busCostINR : Math.round(busCostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            intermediate_stops: busIntermediate.stops,
            instructions: 'Board direct intercity express bus at platform 3. Includes scheduled intermediate halts.',
          },
        ],
      });

      // 2. Connecting Transit Route via Intermediate Station / Hub (Beech Ka Station Transfer)
      const leg1Dist = Math.round(dist * 0.58);
      const leg2Dist = dist - leg1Dist;
      const leg1Dur = Math.round((leg1Dist / 38) * 60);
      const leg2Dur = Math.round((leg2Dist / 38) * 60);
      const layoverMin = 35;
      const connTotalDur = leg1Dur + layoverMin + leg2Dur;
      const connCostINR = Math.round(busCostINR * 1.08);
      const connCostUSD = Math.max(3, Math.round(connCostINR / 84));
      const leg1CostINR = Math.round(connCostINR * 0.58);
      const leg2CostINR = connCostINR - leg1CostINR;

      const leg1Stops = generateIntermediateStopsForLeg(
        originName,
        originCode,
        hubInfo.hubName,
        hubInfo.hubCode,
        '08:00 AM',
        leg1Dur,
        leg1Dist,
        'BUS',
        true
      );
      const leg1Arrival = calculateArrivalTime('08:00 AM', leg1Dur);
      const leg2Departure = calculateArrivalTime(leg1Arrival, layoverMin);

      const leg2Stops = generateIntermediateStopsForLeg(
        hubInfo.hubName,
        hubInfo.hubCode,
        destName,
        destCode,
        leg2Departure,
        leg2Dur,
        leg2Dist,
        'BUS',
        true
      );

      options.push({
        id: `ind-conn-bus-${dist}`,
        title: `Connecting Transit via ${hubInfo.hubName} (Intermediate Station)`,
        badge: 'Recommended',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'GROUND_ONLY',
        total_distance_km: dist + 12,
        total_duration_minutes: connTotalDur,
        total_cost: currency === 'INR' ? connCostINR : Math.round(connCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? busBenchmarkINR : Math.round(busBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: connCostUSD,
        benchmark_cost_usd: Math.max(3, Math.round(busBenchmarkINR / 84)),
        currency,
        currency_symbol: sym,
        transfer_count: 1,
        via_stations: [hubInfo.hubName],
        compliance_status: 'COMPLIANT',
        compliance_notes: [
          `Multi-stage route connecting via ${hubInfo.hubName}`,
          `Comfortable ${layoverMin}-minute transfer buffer at intermediate station platform`,
          `Serves intermediate localities between origin and destination`,
        ],
        max_cabin_class: 'ECONOMY',
        reliability_score: 91,
        segments: [
          {
            id: `ind-seg-conn-1`,
            sequence_order: 1,
            mode: 'BUS',
            provider_name: 'Regional Express Shuttle',
            carrier_code: 'GSRTC',
            flight_or_service_num: 'Sector Line 12',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Central Bus Station`,
            start_code: originCode,
            start_lat: originCoords?.lat || 0,
            start_lon: originCoords?.lon || 0,
            departure_time: '08:00 AM',
            end_name: hubInfo.hubName,
            end_code: hubInfo.hubCode,
            end_lat: 0,
            end_lon: 0,
            arrival_time: leg1Arrival,
            distance_km: leg1Dist,
            duration_minutes: leg1Dur,
            delay_minutes: 0,
            cost_usd: Math.round(leg1CostINR / 84),
            cost: currency === 'INR' ? leg1CostINR : Math.round(leg1CostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            layover_after_minutes: layoverMin,
            intermediate_stops: leg1Stops.stops,
            instructions: `Disembark at ${hubInfo.hubName} for connection to ${destName}. Transfer buffer: ${layoverMin} mins.`,
          },
          {
            id: `ind-seg-conn-2`,
            sequence_order: 2,
            mode: 'BUS',
            provider_name: 'Connecting Highway Express',
            carrier_code: 'GSRTC',
            flight_or_service_num: 'District Shuttle 88',
            cabin_class: 'ECONOMY',
            start_name: hubInfo.hubName,
            start_code: hubInfo.hubCode,
            start_lat: 0,
            start_lon: 0,
            departure_time: leg2Departure,
            end_name: `${destName} Bus Depot`,
            end_code: destCode,
            end_lat: destCoords?.lat || 0,
            end_lon: destCoords?.lon || 0,
            arrival_time: calculateArrivalTime('08:00 AM', connTotalDur),
            distance_km: leg2Dist,
            duration_minutes: leg2Dur,
            delay_minutes: 0,
            cost_usd: Math.round(leg2CostINR / 84),
            cost: currency === 'INR' ? leg2CostINR : Math.round(leg2CostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            intermediate_stops: leg2Stops.stops,
            instructions: `Board connecting bus at ${hubInfo.hubName} platform 2 towards ${destName}.`,
          },
        ],
      });

      // 3. Indian Railways Intercity Express with Intermediate Junction Halts
      const railDurationMinutes = Math.round((dist / 42) * 60);
      const railCostINR = Math.max(70, Math.round(dist * 1.32));
      const railBenchmarkINR = Math.round(railCostINR * 1.35);
      const railCostUSD = Math.max(2, Math.round(railCostINR / 84));

      const railIntermediate = generateIntermediateStopsForLeg(
        originName,
        originCode,
        destName,
        destCode,
        '08:30 AM',
        railDurationMinutes,
        dist,
        'COMMUTER_TRAIN',
        true,
        viaStation
      );

      options.push({
        id: `ind-rail-${dist}`,
        title: `Indian Railways Intercity Express (${originCode} ⇄ ${destCode})`,
        badge: 'Best Value',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'RAIL_ONLY',
        total_distance_km: dist,
        total_duration_minutes: railDurationMinutes,
        total_cost: currency === 'INR' ? railCostINR : Math.round(railCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? railBenchmarkINR : Math.round(railBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: railCostUSD,
        benchmark_cost_usd: Math.max(3, Math.round(railBenchmarkINR / 84)),
        currency,
        currency_symbol: sym,
        transfer_count: 0,
        via_stations: railIntermediate.viaStationNames,
        compliance_status: 'COMPLIANT',
        compliance_notes: [
          `Direct scheduled Western Railway service`,
          `Intermediate stopping stations: ${railIntermediate.viaStationNames.slice(0, 3).join(', ')}`,
          `Fare ${sym}${currency === 'INR' ? railCostINR : Math.round(railCostINR / currConfig.exchangeRateToUSD)} compliant with standard employee expense tier`,
        ],
        max_cabin_class: 'ECONOMY',
        reliability_score: 91,
        segments: [
          {
            id: `ind-seg-rail-1`,
            sequence_order: 1,
            mode: 'COMMUTER_TRAIN',
            provider_name: 'Indian Railways (Western Railway)',
            carrier_code: 'IR',
            flight_or_service_num: '19035 Intercity Express',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Railway Station`,
            start_code: originCode,
            start_lat: originCoords?.lat || 0,
            start_lon: originCoords?.lon || 0,
            departure_time: '08:30 AM',
            end_name: `${destName} Junction`,
            end_code: destCode,
            end_lat: destCoords?.lat || 0,
            end_lon: destCoords?.lon || 0,
            arrival_time: calculateArrivalTime('08:30 AM', railDurationMinutes),
            distance_km: dist,
            duration_minutes: railDurationMinutes,
            delay_minutes: 0,
            cost_usd: railCostUSD,
            cost: currency === 'INR' ? railCostINR : Math.round(railCostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            intermediate_stops: railIntermediate.stops,
            instructions: 'Reserved 2S/Sleeper coach. Halts at scheduled intermediate stations along the corridor.',
          },
        ],
      });

      // 3. Dedicated Intercity Highway AC Taxi / Cab
      // Driving speed: 48-52 km/h -> ~3h 30m for 172km
      // Fare: ~₹13.5 per km + toll = ~₹2,420 INR (~$28 USD)
      let cabDurationMinutes = Math.round((dist / 50) * 60);
      if (googleRoute && googleRoute.durationMinutes > 0) {
        cabDurationMinutes = googleRoute.durationMinutes;
      }
      const cabCostINR = Math.round(dist * 13.5 + 100);
      const cabBenchmarkINR = Math.round(cabCostINR * 1.2);
      const cabCostUSD = Math.round(cabCostINR / 84);

      options.push({
        id: `ind-cab-${dist}`,
        title: `Dedicated Intercity Cab / Highway Taxi`,
        badge: 'Fastest',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'GROUND_ONLY',
        total_distance_km: dist,
        total_duration_minutes: cabDurationMinutes,
        total_cost: currency === 'INR' ? cabCostINR : Math.round(cabCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? cabBenchmarkINR : Math.round(cabBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: cabCostUSD,
        benchmark_cost_usd: Math.round(cabBenchmarkINR / 84),
        currency,
        currency_symbol: sym,
        transfer_count: 0,
        compliance_status: 'COMPLIANT',
        compliance_notes: ['Door-to-door direct highway route via AC Sedan', 'Corporate partner billing approved'],
        max_cabin_class: 'ECONOMY',
        reliability_score: 95,
        segments: [
          {
            id: `ind-seg-cab-1`,
            sequence_order: 1,
            mode: 'RIDE_SHARE',
            provider_name: 'Verified Corporate Intercity Partner',
            carrier_code: 'FLEET',
            flight_or_service_num: 'Intercity AC Sedan',
            cabin_class: 'ECONOMY',
            start_name: originName,
            start_lat: originCoords?.lat || 0,
            start_lon: originCoords?.lon || 0,
            departure_time: '08:00 AM',
            end_name: destName,
            end_lat: destCoords?.lat || 0,
            end_lon: destCoords?.lon || 0,
            arrival_time: calculateArrivalTime('08:00 AM', cabDurationMinutes),
            distance_km: dist,
            duration_minutes: cabDurationMinutes,
            delay_minutes: 0,
            cost_usd: cabCostUSD,
            cost: currency === 'INR' ? cabCostINR : Math.round(cabCostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            instructions: 'Driver meets at pickup point. Highway toll included in corporate account.',
          },
        ],
      });
    } else {
      // Long distance in India (> 450 km): e.g. Delhi ⇄ Mumbai or Ahmedabad ⇄ Mumbai
      const flightDuration = Math.round((dist / 700) * 60 + 35);
      const totalAirDuration = flightDuration + 130; // 2h 10m airport buffer
      const flightCostINR = Math.round(2800 + dist * 3.4);
      const flightBenchmarkINR = Math.round(flightCostINR * 1.15);
      const flightCostUSD = Math.round(flightCostINR / 84);

      options.push({
        id: `ind-air-direct-${dist}`,
        title: `Commercial Domestic Flight (${originCode} ⇄ ${destCode})`,
        badge: 'Fastest',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'FLIGHT_ONLY',
        total_distance_km: dist + 30,
        total_duration_minutes: totalAirDuration,
        total_cost: currency === 'INR' ? flightCostINR : Math.round(flightCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? flightBenchmarkINR : Math.round(flightBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: flightCostUSD,
        benchmark_cost_usd: Math.round(flightBenchmarkINR / 84),
        currency,
        currency_symbol: sym,
        transfer_count: 0,
        compliance_status: 'COMPLIANT',
        compliance_notes: ['Approved corporate carrier (IndiGo / Air India)', 'Within domestic air benchmark'],
        max_cabin_class: 'ECONOMY',
        reliability_score: 92,
        segments: [
          {
            id: `ind-seg-air-1`,
            sequence_order: 1,
            mode: 'FLIGHT',
            provider_name: 'IndiGo / Air India Express',
            carrier_code: '6E',
            flight_or_service_num: '6E-452',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Airport`,
            start_code: originCode,
            start_lat: 0,
            start_lon: 0,
            departure_time: '09:00 AM',
            end_name: `${destName} Airport`,
            end_code: destCode,
            end_lat: 0,
            end_lon: 0,
            arrival_time: calculateArrivalTime('09:00 AM', flightDuration),
            distance_km: dist,
            duration_minutes: flightDuration,
            delay_minutes: 0,
            cost_usd: flightCostUSD,
            cost: currency === 'INR' ? flightCostINR : Math.round(flightCostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            instructions: 'Direct scheduled flight. Web check-in open 48h prior.',
          },
        ],
      });

      // Connecting Aviation / Rail Transit via Intermediate Hub
      const indConnCostINR = Math.round(flightCostINR * 0.82);
      const indConnDur = totalAirDuration + 65;
      options.push({
        id: `ind-conn-air-${dist}`,
        title: `Connecting Transit via ${hubInfo.hubName} (Intermediate Station)`,
        badge: 'Best Value',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'FLIGHT_ONLY',
        total_distance_km: dist + 85,
        total_duration_minutes: indConnDur,
        total_cost: currency === 'INR' ? indConnCostINR : Math.round(indConnCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? flightBenchmarkINR : Math.round(flightBenchmarkINR / currConfig.exchangeRateToUSD),
        total_cost_usd: Math.round(indConnCostINR / 84),
        benchmark_cost_usd: Math.round(flightBenchmarkINR / 84),
        currency,
        currency_symbol: sym,
        transfer_count: 1,
        via_stations: [hubInfo.hubName],
        compliance_status: 'COMPLIANT',
        compliance_notes: [
          `Intermediate connection through ${hubInfo.hubName}`,
          `Saves ${sym}${Math.round(flightCostINR - indConnCostINR)} compared to peak direct fare`,
        ],
        max_cabin_class: 'ECONOMY',
        reliability_score: 89,
        segments: [
          {
            id: `ind-seg-con-air-1`,
            sequence_order: 1,
            mode: 'FLIGHT',
            provider_name: 'Regional Alliance Carrier',
            carrier_code: 'AI',
            flight_or_service_num: 'AI-214',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Airport`,
            start_code: originCode,
            start_lat: 0,
            start_lon: 0,
            departure_time: '07:30 AM',
            end_name: hubInfo.hubName,
            end_code: hubInfo.hubCode,
            end_lat: 0,
            end_lon: 0,
            arrival_time: calculateArrivalTime('07:30 AM', Math.round(flightDuration * 0.52)),
            distance_km: Math.round(dist * 0.52),
            duration_minutes: Math.round(flightDuration * 0.52),
            delay_minutes: 0,
            cost_usd: Math.round((indConnCostINR * 0.48) / 84),
            cost: currency === 'INR' ? Math.round(indConnCostINR * 0.48) : Math.round((indConnCostINR * 0.48) / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            layover_after_minutes: 45,
            instructions: `Intermediate connection at ${hubInfo.hubName}. Transit security lane available.`,
          },
          {
            id: `ind-seg-con-air-2`,
            sequence_order: 2,
            mode: 'FLIGHT',
            provider_name: 'Regional Alliance Carrier',
            carrier_code: 'AI',
            flight_or_service_num: 'AI-558',
            cabin_class: 'ECONOMY',
            start_name: hubInfo.hubName,
            start_code: hubInfo.hubCode,
            start_lat: 0,
            start_lon: 0,
            departure_time: calculateArrivalTime('07:30 AM', Math.round(flightDuration * 0.52) + 45),
            end_name: `${destName} Airport`,
            end_code: destCode,
            end_lat: 0,
            end_lon: 0,
            arrival_time: calculateArrivalTime('07:30 AM', indConnDur),
            distance_km: Math.round(dist * 0.55),
            duration_minutes: Math.round(flightDuration * 0.52),
            delay_minutes: 0,
            cost_usd: Math.round((indConnCostINR * 0.52) / 84),
            cost: currency === 'INR' ? Math.round(indConnCostINR * 0.52) : Math.round((indConnCostINR * 0.52) / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            instructions: `Board connecting flight at ${hubInfo.hubName} to ${destName}.`,
          },
        ],
      });

      // Superfast / Vande Bharat Express with intermediate stops
      const superfastDuration = Math.round((dist / 75) * 60 + 40);
      const sfCostINR = Math.round(800 + dist * 1.6);
      const sfCostUSD = Math.round(sfCostINR / 84);

      const sfIntermediate = generateIntermediateStopsForLeg(
        originName,
        originCode,
        destName,
        destCode,
        '06:10 AM',
        superfastDuration,
        dist,
        'HIGH_SPEED_RAIL',
        true,
        viaStation
      );

      options.push({
        id: `ind-sf-rail-${dist}`,
        title: `Vande Bharat / Superfast Express (${originCode} ⇄ ${destCode})`,
        badge: 'Corporate Pick',
        origin_name: originName,
        origin_code: originCode,
        destination_name: destName,
        destination_code: destCode,
        travel_mode: 'RAIL_ONLY',
        total_distance_km: dist,
        total_duration_minutes: superfastDuration,
        total_cost: currency === 'INR' ? sfCostINR : Math.round(sfCostINR / currConfig.exchangeRateToUSD),
        benchmark_cost: currency === 'INR' ? Math.round(sfCostINR * 1.25) : Math.round((sfCostINR * 1.25) / currConfig.exchangeRateToUSD),
        total_cost_usd: sfCostUSD,
        benchmark_cost_usd: Math.round((sfCostINR * 1.25) / 84),
        currency,
        currency_symbol: sym,
        transfer_count: 0,
        via_stations: sfIntermediate.viaStationNames,
        compliance_status: 'COMPLIANT',
        compliance_notes: [
          'Executive Chair Car with onboard meals and power outlets',
          `Intermediate junction halts: ${sfIntermediate.viaStationNames.slice(0, 3).join(', ')}`,
          'Fully policy compliant',
        ],
        max_cabin_class: 'ECONOMY',
        reliability_score: 95,
        segments: [
          {
            id: `ind-seg-sf-1`,
            sequence_order: 1,
            mode: 'HIGH_SPEED_RAIL',
            provider_name: 'Indian Railways (Vande Bharat)',
            carrier_code: 'VB',
            flight_or_service_num: '20901 Vande Bharat',
            cabin_class: 'ECONOMY',
            start_name: `${originName} Central Station`,
            start_code: originCode,
            start_lat: 0,
            start_lon: 0,
            departure_time: '06:10 AM',
            end_name: `${destName} Central Station`,
            end_code: destCode,
            end_lat: 0,
            end_lon: 0,
            arrival_time: calculateArrivalTime('06:10 AM', superfastDuration),
            distance_km: dist,
            duration_minutes: superfastDuration,
            delay_minutes: 0,
            cost_usd: sfCostUSD,
            cost: currency === 'INR' ? sfCostINR : Math.round(sfCostINR / currConfig.exchangeRateToUSD),
            currency_symbol: sym,
            intermediate_stops: sfIntermediate.stops,
            instructions: 'Air-conditioned chair car with rotating seats. Intermediate junction halts included.',
          },
        ],
      });
    }

    return options;
  }

  // ============================================================================
  // CASE B: INTERNATIONAL / US / EUROPEAN / GLOBAL ROUTES
  // ============================================================================
  const rate = currConfig.exchangeRateToUSD;

  if (dist > 650) {
    const flightDur = Math.round((dist / 750) * 60 + 45);
    const totalAirDur = flightDur + 120; // 2 hours ground + airport buffer
    const airCostUSD = Math.round(180 + dist * 0.18);
    const benchmarkFareUSD = Math.round(airCostUSD * 1.12);

    const airCostLocal = Math.round(airCostUSD * rate);
    const benchLocal = Math.round(benchmarkFareUSD * rate);

    options.push({
      id: `dyn-flight-direct-${dist}`,
      title: `Non-Stop Commercial Flight (${originCode} ⇄ ${destCode})`,
      badge: 'Fastest',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'MULTI_MODAL',
      total_distance_km: dist + 30,
      total_duration_minutes: totalAirDur,
      total_cost: airCostLocal,
      benchmark_cost: benchLocal,
      total_cost_usd: airCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 0,
      compliance_status: 'COMPLIANT',
      compliance_notes: ['Approved corporate partner route', 'Within standard fare benchmark'],
      max_cabin_class: 'ECONOMY',
      reliability_score: 92,
      segments: [
        {
          id: `dyn-seg-air-1`,
          sequence_order: 1,
          mode: 'FLIGHT',
          provider_name: 'Flagship Alliance Airline',
          carrier_code: 'FA',
          flight_or_service_num: 'FA-204',
          cabin_class: 'ECONOMY',
          start_name: `${originName} Airport`,
          start_code: originCode,
          start_lat: 0,
          start_lon: 0,
          departure_time: '09:00 AM',
          end_name: `${destName} Airport`,
          end_code: destCode,
          end_lat: 0,
          end_lon: 0,
          arrival_time: calculateArrivalTime('09:00 AM', flightDur),
          distance_km: dist,
          duration_minutes: flightDur,
          delay_minutes: 0,
          cost_usd: airCostUSD,
          cost: airCostLocal,
          currency_symbol: sym,
          instructions: 'Direct scheduled flight with in-seat power and Wi-Fi.',
        },
      ],
    });

    const connCostUSD = Math.round(airCostUSD * 0.76);
    const connDur = totalAirDur + 75;
    options.push({
      id: `dyn-flight-con-${dist}`,
      title: `Connecting Saver Flight (via ${hubInfo.hubName})`,
      badge: 'Best Value',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'FLIGHT_ONLY',
      total_distance_km: dist + 90,
      total_duration_minutes: connDur,
      total_cost: Math.round(connCostUSD * rate),
      benchmark_cost: benchLocal,
      total_cost_usd: connCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 1,
      via_stations: [hubInfo.hubName],
      compliance_status: 'COMPLIANT',
      compliance_notes: [
        `Intermediate transfer through ${hubInfo.hubName}`,
        `Saves ${sym}${Math.round((benchmarkFareUSD - connCostUSD) * rate)} vs benchmark fare`,
      ],
      max_cabin_class: 'ECONOMY',
      reliability_score: 87,
      segments: [
        {
          id: `dyn-seg-con-1`,
          sequence_order: 1,
          mode: 'FLIGHT',
          provider_name: 'Regional Alliance Carrier',
          carrier_code: 'RC',
          flight_or_service_num: 'RC-110',
          cabin_class: 'ECONOMY',
          start_name: `${originName} Airport`,
          start_code: originCode,
          start_lat: 0,
          start_lon: 0,
          departure_time: '08:00 AM',
          end_name: hubInfo.hubName,
          end_code: hubInfo.hubCode,
          end_lat: 0,
          end_lon: 0,
          arrival_time: calculateArrivalTime('08:00 AM', Math.round(flightDur * 0.55)),
          distance_km: Math.round(dist * 0.5),
          duration_minutes: Math.round(flightDur * 0.55),
          delay_minutes: 0,
          cost_usd: Math.round(connCostUSD * 0.45),
          cost: Math.round(connCostUSD * 0.45 * rate),
          currency_symbol: sym,
          layover_after_minutes: 50,
          instructions: `Connecting gate info updated on arrival at ${hubInfo.hubName}.`,
        },
        {
          id: `dyn-seg-con-2`,
          sequence_order: 2,
          mode: 'FLIGHT',
          provider_name: 'Regional Alliance Carrier',
          carrier_code: 'RC',
          flight_or_service_num: 'RC-992',
          cabin_class: 'ECONOMY',
          start_name: hubInfo.hubName,
          start_code: hubInfo.hubCode,
          start_lat: 0,
          start_lon: 0,
          departure_time: calculateArrivalTime('08:00 AM', Math.round(flightDur * 0.55) + 50),
          end_name: `${destName} Airport`,
          end_code: destCode,
          end_lat: 0,
          end_lon: 0,
          arrival_time: calculateArrivalTime('08:00 AM', connDur),
          distance_km: Math.round(dist * 0.55),
          duration_minutes: Math.round(flightDur * 0.55),
          delay_minutes: 0,
          cost_usd: Math.round(connCostUSD * 0.55),
          cost: Math.round(connCostUSD * 0.55 * rate),
          currency_symbol: sym,
          instructions: 'Proceed to arrival exit.',
        },
      ],
    });
  } else {
    // Medium & Short Distance (< 650 km): Intercity Rail, Express Coach, Highway Shuttle
    let railDuration = Math.round((dist / 120) * 60 + 20);
    if (googleRoute && googleRoute.durationMinutes > 0) {
      railDuration = Math.round(googleRoute.durationMinutes * 0.95);
    }
    const railCostUSD = Math.round(35 + dist * 0.22);
    const benchmarkFareUSD = Math.round(railCostUSD * 1.25);

    const railCostLocal = Math.round(railCostUSD * rate);
    const benchLocal = Math.round(benchmarkFareUSD * rate);

    const railIntermediate = generateIntermediateStopsForLeg(
      originName,
      originCode,
      destName,
      destCode,
      '08:15 AM',
      railDuration,
      dist,
      'HIGH_SPEED_RAIL',
      false,
      viaStation
    );

    // Option 1: Direct Express Rail with intermediate stops
    options.push({
      id: `dyn-rail-${dist}-1`,
      title: `Intercity Express Rail (${originCode} ⇄ ${destCode})`,
      badge: 'Corporate Pick',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'RAIL_ONLY',
      total_distance_km: dist,
      total_duration_minutes: railDuration,
      total_cost: railCostLocal,
      benchmark_cost: benchLocal,
      total_cost_usd: railCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 0,
      via_stations: railIntermediate.viaStationNames,
      compliance_status: 'COMPLIANT',
      compliance_notes: [
        'City-center to city-center direct route',
        `Scheduled intermediate halts: ${railIntermediate.viaStationNames.slice(0, 3).join(', ')}`,
        '100% compliant with short-haul surface transit mandate',
      ],
      max_cabin_class: 'ECONOMY',
      reliability_score: 95,
      segments: [
        {
          id: `dyn-seg-rail-1`,
          sequence_order: 1,
          mode: 'HIGH_SPEED_RAIL',
          provider_name: region.isUK ? 'British National Rail' : region.isEurope ? 'SNCF / Deutsche Bahn' : 'Amtrak Regional',
          carrier_code: region.isUK ? 'NR' : region.isEurope ? 'EU' : 'AMTK',
          flight_or_service_num: 'Express Line 42',
          cabin_class: 'ECONOMY',
          start_name: `${originName} Central Station`,
          start_code: originCode,
          start_lat: originCoords?.lat || 0,
          start_lon: originCoords?.lon || 0,
          departure_time: '08:15 AM',
          end_name: `${destName} Central Station`,
          end_code: destCode,
          end_lat: destCoords?.lat || 0,
          end_lon: destCoords?.lon || 0,
          arrival_time: calculateArrivalTime('08:15 AM', railDuration),
          distance_km: dist,
          duration_minutes: railDuration,
          delay_minutes: 0,
          cost_usd: railCostUSD,
          cost: railCostLocal,
          currency_symbol: sym,
          intermediate_stops: railIntermediate.stops,
          instructions: 'Direct service with quiet car, work table, and power outlet. Halts at scheduled intermediate stations.',
        },
      ],
    });

    // Option 2: Connecting Rail via Intermediate Station / Hub (Beech Ka Station Transfer)
    const leg1Dist = Math.round(dist * 0.55);
    const leg2Dist = dist - leg1Dist;
    const leg1Dur = Math.round(railDuration * 0.55);
    const leg2Dur = Math.round(railDuration * 0.50);
    const layoverMin = 30;
    const connRailDur = leg1Dur + layoverMin + leg2Dur;
    const connRailCostUSD = Math.round(railCostUSD * 0.88);
    const connLeg1CostUSD = Math.round(connRailCostUSD * 0.52);
    const connLeg2CostUSD = connRailCostUSD - connLeg1CostUSD;

    const leg1Stops = generateIntermediateStopsForLeg(
      originName,
      originCode,
      hubInfo.hubName,
      hubInfo.hubCode,
      '08:00 AM',
      leg1Dur,
      leg1Dist,
      'HIGH_SPEED_RAIL',
      false
    );
    const leg1Arr = calculateArrivalTime('08:00 AM', leg1Dur);
    const leg2Dep = calculateArrivalTime(leg1Arr, layoverMin);

    const leg2Stops = generateIntermediateStopsForLeg(
      hubInfo.hubName,
      hubInfo.hubCode,
      destName,
      destCode,
      leg2Dep,
      leg2Dur,
      leg2Dist,
      'HIGH_SPEED_RAIL',
      false
    );

    options.push({
      id: `dyn-conn-rail-${dist}`,
      title: `Connecting Rail via ${hubInfo.hubName} (Intermediate Station)`,
      badge: 'Recommended',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'RAIL_ONLY',
      total_distance_km: dist + 15,
      total_duration_minutes: connRailDur,
      total_cost: Math.round(connRailCostUSD * rate),
      benchmark_cost: benchLocal,
      total_cost_usd: connRailCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 1,
      via_stations: [hubInfo.hubName],
      compliance_status: 'COMPLIANT',
      compliance_notes: [
        `Intermediate connection at ${hubInfo.hubName} with ${layoverMin}-minute transfer buffer`,
        `Saves ${sym}${Math.round((benchmarkFareUSD - connRailCostUSD) * rate)} vs benchmark ticket price`,
      ],
      max_cabin_class: 'ECONOMY',
      reliability_score: 92,
      segments: [
        {
          id: `dyn-seg-conn-r1`,
          sequence_order: 1,
          mode: 'HIGH_SPEED_RAIL',
          provider_name: region.isUK ? 'British National Rail' : 'Amtrak Regional',
          carrier_code: region.isUK ? 'NR' : 'AMTK',
          flight_or_service_num: 'Line 108',
          cabin_class: 'ECONOMY',
          start_name: `${originName} Central Station`,
          start_code: originCode,
          start_lat: originCoords?.lat || 0,
          start_lon: originCoords?.lon || 0,
          departure_time: '08:00 AM',
          end_name: hubInfo.hubName,
          end_code: hubInfo.hubCode,
          end_lat: 0,
          end_lon: 0,
          arrival_time: leg1Arr,
          distance_km: leg1Dist,
          duration_minutes: leg1Dur,
          delay_minutes: 0,
          cost_usd: connLeg1CostUSD,
          cost: Math.round(connLeg1CostUSD * rate),
          currency_symbol: sym,
          layover_after_minutes: layoverMin,
          intermediate_stops: leg1Stops.stops,
          instructions: `Change trains at ${hubInfo.hubName}. Cross-platform transfer.`,
        },
        {
          id: `dyn-seg-conn-r2`,
          sequence_order: 2,
          mode: 'HIGH_SPEED_RAIL',
          provider_name: region.isUK ? 'British National Rail' : 'Amtrak Regional',
          carrier_code: region.isUK ? 'NR' : 'AMTK',
          flight_or_service_num: 'Line 214',
          cabin_class: 'ECONOMY',
          start_name: hubInfo.hubName,
          start_code: hubInfo.hubCode,
          start_lat: 0,
          start_lon: 0,
          departure_time: leg2Dep,
          end_name: `${destName} Central Station`,
          end_code: destCode,
          end_lat: destCoords?.lat || 0,
          end_lon: destCoords?.lon || 0,
          arrival_time: calculateArrivalTime('08:00 AM', connRailDur),
          distance_km: leg2Dist,
          duration_minutes: leg2Dur,
          delay_minutes: 0,
          cost_usd: connLeg2CostUSD,
          cost: Math.round(connLeg2CostUSD * rate),
          currency_symbol: sym,
          intermediate_stops: leg2Stops.stops,
          instructions: `Board connecting train at ${hubInfo.hubName} towards ${destName}.`,
        },
      ],
    });

    // Option 3: Regional Express Coach
    const saverCostUSD = Math.round(railCostUSD * 0.65);
    const saverDur = Math.round(railDuration * 1.25);
    const busIntermediate = generateIntermediateStopsForLeg(
      originName,
      originCode,
      destName,
      destCode,
      '08:45 AM',
      saverDur,
      dist,
      'BUS',
      false,
      viaStation
    );

    options.push({
      id: `dyn-saver-${dist}-2`,
      title: `Regional Commuter Saver Coach`,
      badge: 'Best Value',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'GROUND_ONLY',
      total_distance_km: dist,
      total_duration_minutes: saverDur,
      total_cost: Math.round(saverCostUSD * rate),
      benchmark_cost: benchLocal,
      total_cost_usd: saverCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 0,
      via_stations: busIntermediate.viaStationNames,
      compliance_status: 'COMPLIANT',
      compliance_notes: [
        `Saves ${sym}${Math.round((benchmarkFareUSD - saverCostUSD) * rate)} against benchmark`,
        `Scheduled intermediate coach halts: ${busIntermediate.viaStationNames.slice(0, 3).join(', ')}`,
      ],
      max_cabin_class: 'ECONOMY',
      reliability_score: 90,
      segments: [
        {
          id: `dyn-seg-sav-1`,
          sequence_order: 1,
          mode: 'BUS',
          provider_name: 'Interstate Express Coach',
          carrier_code: 'IEC',
          flight_or_service_num: 'Line 202',
          cabin_class: 'ECONOMY',
          start_name: `${originName} Terminal`,
          start_code: originCode,
          start_lat: originCoords?.lat || 0,
          start_lon: originCoords?.lon || 0,
          departure_time: '08:45 AM',
          end_name: `${destName} Terminal`,
          end_code: destCode,
          end_lat: destCoords?.lat || 0,
          end_lon: destCoords?.lon || 0,
          arrival_time: calculateArrivalTime('08:45 AM', saverDur),
          distance_km: dist,
          duration_minutes: saverDur,
          delay_minutes: 0,
          cost_usd: saverCostUSD,
          cost: Math.round(saverCostUSD * rate),
          currency_symbol: sym,
          intermediate_stops: busIntermediate.stops,
          instructions: 'Standard reserved seating with Wi-Fi. Scheduled intermediate stops along route.',
        },
      ],
    });

    // Option 4: Executive Ground Transfer
    let roadDur = Math.round((dist / 90) * 60);
    if (googleRoute && googleRoute.durationMinutes > 0) {
      roadDur = googleRoute.durationMinutes;
    }
    const roadCostUSD = Math.round(90 + dist * 0.45);
    options.push({
      id: `dyn-car-${dist}-3`,
      title: `Private Corporate Chauffeur Direct`,
      badge: 'Fastest',
      origin_name: originName,
      origin_code: originCode,
      destination_name: destName,
      destination_code: destCode,
      travel_mode: 'GROUND_ONLY',
      total_distance_km: dist,
      total_duration_minutes: roadDur,
      total_cost: Math.round(roadCostUSD * rate),
      benchmark_cost: benchLocal,
      total_cost_usd: roadCostUSD,
      benchmark_cost_usd: benchmarkFareUSD,
      currency,
      currency_symbol: sym,
      transfer_count: 0,
      compliance_status: roadCostUSD > benchmarkFareUSD + 50 ? 'WARNING' : 'COMPLIANT',
      compliance_notes: ['Door-to-door direct highway travel without transfers', 'Tolls and driver gratuity included'],
      max_cabin_class: 'BUSINESS',
      reliability_score: 93,
      segments: [
        {
          id: `dyn-seg-car-1`,
          sequence_order: 1,
          mode: 'RIDE_SHARE',
          provider_name: 'Corporate Fleet Partner Sedan',
          flight_or_service_num: 'Executive Sedan',
          start_name: originName,
          start_lat: originCoords?.lat || 0,
          start_lon: originCoords?.lon || 0,
          departure_time: '08:00 AM',
          end_name: destName,
          end_lat: destCoords?.lat || 0,
          end_lon: destCoords?.lon || 0,
          arrival_time: calculateArrivalTime('08:00 AM', roadDur),
          distance_km: dist,
          duration_minutes: roadDur,
          delay_minutes: 0,
          cost_usd: roadCostUSD,
          cost: Math.round(roadCostUSD * rate),
          currency_symbol: sym,
          instructions: 'Driver meets at lobby. Direct door-to-door highway travel.',
        },
      ],
    });
  }

  return options;
}

/**
 * Calculates arrival time string given departure and duration in minutes
 */
export function calculateArrivalTime(depTime: string, durationMin: number): string {
  const match = depTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '11:00 AM';

  let hour = parseInt(match[1], 10);
  const min = parseInt(match[2], 10);
  const meridian = match[3].toUpperCase();

  if (meridian === 'PM' && hour !== 12) hour += 12;
  if (meridian === 'AM' && hour === 12) hour = 0;

  const totalMin = hour * 60 + min + durationMin;
  const newHour24 = Math.floor(totalMin / 60) % 24;
  const newMin = totalMin % 60;

  const finalMeridian = newHour24 >= 12 ? 'PM' : 'AM';
  let finalHour = newHour24 % 12;
  if (finalHour === 0) finalHour = 12;

  const minStr = newMin < 10 ? `0${newMin}` : `${newMin}`;
  const hourStr = finalHour < 10 ? `0${finalHour}` : `${finalHour}`;

  return `${hourStr}:${minStr} ${finalMeridian}`;
}

/**
 * Disruption & Automated Rebooking Engine
 */
export function evaluateDisruptionAndRebooking(
  segments: RouteSegment[],
  disruptedSegmentIndex: number,
  addedDelayMinutes: number,
  policy: CorporatePolicy,
  currency: CurrencyCode = 'USD'
): {
  isConnectionMissed: boolean;
  missedTransferIndex?: number;
  breachMinutes: number;
  alternatives: RebookingAlternative[];
} {
  const currentSeg = segments[disruptedSegmentIndex];
  if (!currentSeg) {
    return { isConnectionMissed: false, breachMinutes: 0, alternatives: [] };
  }

  const layover = currentSeg.layover_after_minutes || 0;
  const breach = addedDelayMinutes - layover;

  if (breach <= 0) {
    return {
      isConnectionMissed: false,
      breachMinutes: 0,
      alternatives: [],
    };
  }

  const nextSeg = segments[disruptedSegmentIndex + 1];
  const alternatives: RebookingAlternative[] = [];
  const cfg = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.USD;
  const sym = cfg.symbol;
  const allowableCapUSD = policy.auto_rebooking_max_delta_usd;
  const allowableCapLocal = convertUSDToCurrency(allowableCapUSD, currency);

  if (nextSeg) {
    const alt1CostDeltaUSD = 45;
    const alt1CostDeltaLocal = convertUSDToCurrency(alt1CostDeltaUSD, currency);
    const isUnderPolicyLimit = alt1CostDeltaUSD <= allowableCapUSD;

    alternatives.push({
      id: 'rebook-alt-1',
      title: `Next Scheduled Connection (${nextSeg.provider_name} - +50m)`,
      replacement_segments: [
        {
          ...nextSeg,
          id: `${nextSeg.id}-rebooked-1`,
          flight_or_service_num: `${nextSeg.flight_or_service_num} (Later Service)`,
          departure_time: calculateArrivalTime(nextSeg.departure_time, addedDelayMinutes + 15),
          arrival_time: calculateArrivalTime(nextSeg.arrival_time, addedDelayMinutes + 15),
          is_rebooked: true,
          disruption_note: `Rebooked due to ${addedDelayMinutes}m delay on prior leg.`,
        },
      ],
      new_arrival_time: calculateArrivalTime(nextSeg.arrival_time, addedDelayMinutes + 15),
      cost_delta_usd: alt1CostDeltaUSD,
      cost_delta: alt1CostDeltaLocal,
      currency,
      currency_symbol: sym,
      duration_delta_minutes: addedDelayMinutes + 15,
      is_policy_compliant: isUnderPolicyLimit,
      policy_rule_note: isUnderPolicyLimit
        ? `Pre-approved under Company Travel Policy (Fare delta ${sym}${alt1CostDeltaLocal} <= cap ${sym}${allowableCapLocal}).`
        : `Requires Travel Manager approval (Fare delta ${sym}${alt1CostDeltaLocal} > allowable cap ${sym}${allowableCapLocal}).`,
      auto_rebookable: isUnderPolicyLimit && policy.auto_rebooking_allowed,
    });

    const alt2CostDeltaUSD = 95;
    const alt2CostDeltaLocal = convertUSDToCurrency(alt2CostDeltaUSD, currency);
    const isAlt2UnderLimit = alt2CostDeltaUSD <= allowableCapUSD;

    alternatives.push({
      id: 'rebook-alt-2',
      title: `Priority Partner Express Replacement (Fast Recovery)`,
      replacement_segments: [
        {
          ...nextSeg,
          id: `${nextSeg.id}-rebooked-2`,
          mode: 'HIGH_SPEED_RAIL',
          provider_name: 'High-Speed Priority Link',
          flight_or_service_num: 'Priority Express Non-Stop',
          departure_time: calculateArrivalTime(nextSeg.departure_time, addedDelayMinutes + 10),
          arrival_time: calculateArrivalTime(nextSeg.arrival_time, Math.max(15, addedDelayMinutes - 15)),
          duration_minutes: Math.max(30, nextSeg.duration_minutes - 25),
          cost_usd: nextSeg.cost_usd + alt2CostDeltaUSD,
          cost: (nextSeg.cost || convertUSDToCurrency(nextSeg.cost_usd, currency)) + alt2CostDeltaLocal,
          currency_symbol: sym,
          is_rebooked: true,
          disruption_note: 'Expedited routing to minimize business meeting delay.',
        },
      ],
      new_arrival_time: calculateArrivalTime(nextSeg.arrival_time, Math.max(15, addedDelayMinutes - 15)),
      cost_delta_usd: alt2CostDeltaUSD,
      cost_delta: alt2CostDeltaLocal,
      currency,
      currency_symbol: sym,
      duration_delta_minutes: Math.max(15, addedDelayMinutes - 15),
      is_policy_compliant: isAlt2UnderLimit,
      policy_rule_note: isAlt2UnderLimit
        ? `Auto-rebooking authorized under Corporate Travel Rules.`
        : `Requires Manager Approval: Cost delta +${sym}${alt2CostDeltaLocal} exceeds policy cap (${sym}${allowableCapLocal}).`,
      auto_rebookable: isAlt2UnderLimit && policy.auto_rebooking_allowed,
    });
  }

  return {
    isConnectionMissed: true,
    missedTransferIndex: disruptedSegmentIndex,
    breachMinutes: breach,
    alternatives,
  };
}
