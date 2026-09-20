/**
 * Realistic Deterministic Test Fixtures for Multimodal Transit Routing
 */

export interface TestTransitStation {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  types: Array<"RAIL" | "AIR" | "BUS" | "FERRY" | "METRO" | "ROAD">;
}

export interface TestTransitService {
  service_id: string;
  name: string;
  provider: string;
  mode: "TRAIN" | "FLIGHT" | "BUS" | "FERRY" | "METRO" | "TAXI";
  origin_id: string;
  destination_id: string;
  departure_time: string; // e.g. "06:00"
  arrival_time: string;   // e.g. "14:30"
  duration_minutes: number;
  cost: number;
  distance_km: number;
  reliability_score: number;
  frequency_minutes?: number;
}

// 1. Realistic Transit Hubs / Stations in Mumbai - Goa Corridor
export const FIXTURE_STATIONS: Record<string, TestTransitStation> = {
  MUM_CSMT: {
    id: "MUM_CSMT",
    name: "Mumbai CSMT Terminal",
    city: "Mumbai",
    lat: 18.9401,
    lng: 72.8354,
    types: ["RAIL"],
  },
  MUM_CENTRAL: {
    id: "MUM_CENTRAL",
    name: "Mumbai Central",
    city: "Mumbai",
    lat: 18.9696,
    lng: 72.8194,
    types: ["RAIL", "METRO", "ROAD"],
  },
  MUM_BOM_AIRPORT: {
    id: "MUM_BOM_AIRPORT",
    name: "Mumbai Airport (BOM Terminal 2)",
    city: "Mumbai",
    lat: 19.0896,
    lng: 72.8656,
    types: ["AIR", "ROAD"],
  },
  MUM_DADAR_BUS: {
    id: "MUM_DADAR_BUS",
    name: "Dadar Interstate Bus Terminal",
    city: "Mumbai",
    lat: 19.0178,
    lng: 72.8478,
    types: ["BUS", "METRO"],
  },
  MUM_FERRY_WHARF: {
    id: "MUM_FERRY_WHARF",
    name: "Mumbai Ferry Wharf (Bhaucha Dhakka)",
    city: "Mumbai",
    lat: 18.9535,
    lng: 72.8524,
    types: ["FERRY"],
  },
  MANDWA_JETTY: {
    id: "MANDWA_JETTY",
    name: "Mandwa Jetty Transit Hub",
    city: "Alibaug",
    lat: 18.7997,
    lng: 72.8805,
    types: ["FERRY", "ROAD"],
  },
  PUNE_STATION: {
    id: "PUNE_STATION",
    name: "Pune Junction Railway & Transit Station",
    city: "Pune",
    lat: 18.5284,
    lng: 73.8744,
    types: ["RAIL", "BUS"],
  },
  GOA_MAO: {
    id: "GOA_MAO",
    name: "Goa Madgaon Junction (MAO)",
    city: "Goa",
    lat: 15.2736,
    lng: 73.958,
    types: ["RAIL", "ROAD"],
  },
  GOA_GOX_AIRPORT: {
    id: "GOA_GOX_AIRPORT",
    name: "Goa Manohar Intl Airport (GOX Mopa)",
    city: "Goa",
    lat: 15.7538,
    lng: 73.8674,
    types: ["AIR", "ROAD"],
  },
  GOA_PANAJI_BUS: {
    id: "GOA_PANAJI_BUS",
    name: "Panaji KTC Bus Terminal",
    city: "Goa",
    lat: 15.4989,
    lng: 73.8278,
    types: ["BUS", "ROAD"],
  },
  GOA_DESTINATION: {
    id: "GOA_DESTINATION",
    name: "Goa Central Terminal Hub",
    city: "Goa",
    lat: 15.4909,
    lng: 73.8278,
    types: ["ROAD"],
  },
};

// 2. Realistic Deterministic Services
export const FIXTURE_SERVICES: TestTransitService[] = [
  // --- TRAINS ---
  {
    service_id: "TR10103",
    name: "Mandovi Express #10103",
    provider: "Indian Railways",
    mode: "TRAIN",
    origin_id: "MUM_CSMT",
    destination_id: "GOA_MAO",
    departure_time: "07:10",
    arrival_time: "18:45",
    duration_minutes: 695,
    cost: 1450.0,
    distance_km: 580,
    reliability_score: 88.0,
  },
  {
    service_id: "VB20671",
    name: "Vande Bharat Express #20671",
    provider: "Indian Railways",
    mode: "TRAIN",
    origin_id: "MUM_CSMT",
    destination_id: "GOA_MAO",
    departure_time: "05:25",
    arrival_time: "13:10",
    duration_minutes: 465,
    cost: 1815.0,
    distance_km: 580,
    reliability_score: 97.0,
  },

  // --- FLIGHTS ---
  {
    service_id: "AI667",
    name: "Air India AI-667",
    provider: "Air India",
    mode: "FLIGHT",
    origin_id: "MUM_BOM_AIRPORT",
    destination_id: "GOA_GOX_AIRPORT",
    departure_time: "09:30",
    arrival_time: "10:45",
    duration_minutes: 75,
    cost: 3890.0,
    distance_km: 435,
    reliability_score: 93.0,
  },
  {
    service_id: "6E241",
    name: "IndiGo 6E-241",
    provider: "IndiGo Airlines",
    mode: "FLIGHT",
    origin_id: "MUM_BOM_AIRPORT",
    destination_id: "GOA_GOX_AIRPORT",
    departure_time: "14:15",
    arrival_time: "15:25",
    duration_minutes: 70,
    cost: 4150.0,
    distance_km: 435,
    reliability_score: 95.0,
  },

  // --- BUSES ---
  {
    service_id: "KTC_EXP_501",
    name: "Kadamba State Highway Express",
    provider: "Kadamba State Transport",
    mode: "BUS",
    origin_id: "MUM_DADAR_BUS",
    destination_id: "GOA_PANAJI_BUS",
    departure_time: "08:00",
    arrival_time: "18:30",
    duration_minutes: 630,
    cost: 1250.0,
    distance_km: 565,
    reliability_score: 82.0,
  },
  {
    service_id: "VRL_SLEEPER_01",
    name: "VRL Multi-Axle Volvo Sleeper",
    provider: "VRL Logistics",
    mode: "BUS",
    origin_id: "MUM_DADAR_BUS",
    destination_id: "GOA_PANAJI_BUS",
    departure_time: "18:00",
    arrival_time: "07:00",
    duration_minutes: 780,
    cost: 1950.0,
    distance_km: 570,
    reliability_score: 87.0,
  },

  // --- LOCAL FEEDERS & TAXIS ---
  {
    service_id: "MUM_FEEDER_CAB_BOM",
    name: "Airport Feeder Express Cab",
    provider: "Uber / Ola Premier",
    mode: "TAXI",
    origin_id: "MUM_CENTRAL",
    destination_id: "MUM_BOM_AIRPORT",
    departure_time: "07:30",
    arrival_time: "08:15",
    duration_minutes: 45,
    cost: 650.0,
    distance_km: 18,
    reliability_score: 92.0,
  },
  {
    service_id: "MUM_FEEDER_CAB_CSMT",
    name: "CSMT City Station Feeder",
    provider: "City Yellow-Black Taxi",
    mode: "TAXI",
    origin_id: "MUM_CENTRAL",
    destination_id: "MUM_CSMT",
    departure_time: "04:45",
    arrival_time: "05:05",
    duration_minutes: 20,
    cost: 150.0,
    distance_km: 6,
    reliability_score: 95.0,
  },
  {
    service_id: "MUM_FEEDER_METRO_DADAR",
    name: "Metro Line 3 Feeder to Dadar",
    provider: "Mumbai Metro Rail",
    mode: "METRO",
    origin_id: "MUM_CENTRAL",
    destination_id: "MUM_DADAR_BUS",
    departure_time: "07:15",
    arrival_time: "07:35",
    duration_minutes: 20,
    cost: 40.0,
    distance_km: 8,
    reliability_score: 98.0,
  },
  {
    service_id: "GOA_AIRPORT_SHUTTLE",
    name: "Goa Mopa Airport Feeder Cab",
    provider: "Goa Miles Taxi",
    mode: "TAXI",
    origin_id: "GOA_GOX_AIRPORT",
    destination_id: "GOA_DESTINATION",
    departure_time: "11:15",
    arrival_time: "12:15",
    duration_minutes: 60,
    cost: 660.0,
    distance_km: 42,
    reliability_score: 94.0,
  },
  {
    service_id: "GOA_STATION_AUTO",
    name: "Madgaon Junction Station Auto",
    provider: "Goa Station Taxi Union",
    mode: "TAXI",
    origin_id: "GOA_MAO",
    destination_id: "GOA_DESTINATION",
    departure_time: "13:20",
    arrival_time: "13:35",
    duration_minutes: 15,
    cost: 185.0,
    distance_km: 12,
    reliability_score: 95.0,
  },
  {
    service_id: "GOA_BUS_FEEDER",
    name: "Panaji Local Shuttle",
    provider: "Panaji Auto Stand",
    mode: "TAXI",
    origin_id: "GOA_PANAJI_BUS",
    destination_id: "GOA_DESTINATION",
    departure_time: "18:40",
    arrival_time: "18:55",
    duration_minutes: 15,
    cost: 150.0,
    distance_km: 8,
    reliability_score: 95.0,
  },

  // --- DIRECT DOOR-TO-DOOR HIGHWAY SEDAN ---
  {
    service_id: "INTERCITY_SEDAN_DIRECT",
    name: "Intercity Highway Premier Cab",
    provider: "Uber Intercity",
    mode: "TAXI",
    origin_id: "MUM_CENTRAL",
    destination_id: "GOA_DESTINATION",
    departure_time: "07:00",
    arrival_time: "16:00",
    duration_minutes: 540,
    cost: 8400.0,
    distance_km: 590,
    reliability_score: 92.0,
  },

  // --- COASTAL MARITIME FERRY & HIGHWAY LINK ---
  {
    service_id: "ROPAX_FERRY_01",
    name: "Mumbai Coastal Ro-Pax Ferry",
    provider: "M2M Ferries",
    mode: "FERRY",
    origin_id: "MUM_FERRY_WHARF",
    destination_id: "MANDWA_JETTY",
    departure_time: "08:30",
    arrival_time: "09:30",
    duration_minutes: 60,
    cost: 450.0,
    distance_km: 19,
    reliability_score: 92.0,
  },
  {
    service_id: "MANDWA_COASTAL_CAB",
    name: "Mandwa to Goa Coastal Cab",
    provider: "Konkan Highway Taxis",
    mode: "TAXI",
    origin_id: "MANDWA_JETTY",
    destination_id: "GOA_DESTINATION",
    departure_time: "10:00",
    arrival_time: "20:30",
    duration_minutes: 630,
    cost: 2650.0,
    distance_km: 540,
    reliability_score: 87.0,
  },
  {
    service_id: "MUM_FEEDER_CAB_FERRY",
    name: "Feeder Cab to Ferry Wharf",
    provider: "City Taxi",
    mode: "TAXI",
    origin_id: "MUM_CENTRAL",
    destination_id: "MUM_FERRY_WHARF",
    departure_time: "07:45",
    arrival_time: "08:10",
    duration_minutes: 25,
    cost: 160.0,
    distance_km: 7,
    reliability_score: 92.0,
  },
];
