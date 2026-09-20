/**
 * Integrated PRD Core Backend Service
 * Implements API contract for:
 * - Part A: Users, Auth, Preferences, Policies, Trips, Segments, Routes Search
 * - Part B: Travel Monitoring, Disruptions, Alternatives, Policy Validation, Rebooking Decision
 * - Part C: Hotel & Destination Intelligence, Stay Modification, Emergency Services
 * - Part D: Real-Time Event Dispatch, Notifications Inbox, Simulated Live Alerts
 */

import {
  UserAccount,
  TravelerPreference,
  CorporatePolicy,
  Trip,
  JourneySegment,
  Route,
  Disruption,
  Alternative,
  HotelStay,
  TravelNotification,
} from '../src/types/unifiedContract';

// In-Memory Database state
export class IntegratedPrdService {
  private users: Map<string, UserAccount> = new Map();
  private preferences: Map<string, TravelerPreference> = new Map();
  private policies: Map<string, CorporatePolicy> = new Map();
  private trips: Map<string, Trip> = new Map();
  private segments: Map<string, JourneySegment[]> = new Map();
  private disruptions: Map<string, Disruption[]> = new Map();
  private alternatives: Map<string, Alternative[]> = new Map();
  private hotels: Map<string, HotelStay> = new Map();
  private notifications: Map<string, TravelNotification[]> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Users
    const defaultUser: UserAccount = {
      id: 'usr-corp-01',
      name: 'Alex Mercer',
      email: 'alex.mercer@acmecorp.com',
      role: 'EMPLOYEE',
      department: 'Enterprise Solutions',
    };
    const adminUser: UserAccount = {
      id: 'usr-corp-02',
      name: 'Sarah Chen',
      email: 'sarah.chen@acmecorp.com',
      role: 'TRAVEL_ADMIN',
      department: 'Corporate Procurement',
    };
    this.users.set(defaultUser.id, defaultUser);
    this.users.set(adminUser.id, adminUser);

    // 2. Preferences
    const defaultPref: TravelerPreference = {
      user_id: defaultUser.id,
      preferred_modes: ['TRAIN', 'FLIGHT', 'CAB'],
      max_transfers: 2,
      seat_preference: 'WINDOW',
      travel_priority: 'fastest',
      loyalty_programs: {
        AirIndia: 'AI-GOLD-98421',
        IRCTC: 'IR-PREM-4421',
      },
    };
    this.preferences.set(defaultUser.id, defaultPref);

    // 3. Policies
    const defaultPolicy: CorporatePolicy = {
      id: 'pol-standard-global',
      user_id: defaultUser.id,
      name: 'Global Standard Business Policy',
      max_budget_per_trip: 12000,
      allowed_modes: ['FLIGHT', 'TRAIN', 'BUS', 'CAB', 'METRO'],
      require_manager_approval: false,
      auto_rebooking_limit: 8000,
      cabin_class_limit: 'ECONOMY',
    };
    this.policies.set(defaultUser.id, defaultPolicy);
    this.policies.set('default', defaultPolicy);

    // 4. Default Demo Trip: Mumbai to Goa
    const trip1Id = 'trip-mb-goa-001';
    const trip1: Trip = {
      id: trip1Id,
      user_id: defaultUser.id,
      source: 'Mumbai Central',
      destination: 'Goa',
      start_date: new Date().toISOString().split('T')[0],
      status: 'IN_PROGRESS',
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    };
    this.trips.set(trip1Id, trip1);

    const trip1Segments: JourneySegment[] = [
      {
        id: 'seg-001-cab',
        trip_id: trip1Id,
        mode: 'CAB',
        provider: 'Uber Intercity / Google Routes',
        origin: 'Bandra West, Mumbai',
        destination: 'Mumbai Central Station',
        departure_time: '06:00 AM',
        arrival_time: '06:45 AM',
        price: 450,
        currency: 'INR',
        status: 'ON_TIME',
        booking_id: 'UBER-98212',
        flight_or_service_num: 'UBER-GO',
      },
      {
        id: 'seg-002-train',
        trip_id: trip1Id,
        mode: 'TRAIN',
        provider: 'Qrail / Indian Railways',
        origin: 'Mumbai Central (MMCT)',
        destination: 'Madgaon Junction (MAO), Goa',
        departure_time: '07:15 AM',
        arrival_time: '04:30 PM',
        price: 1850,
        currency: 'INR',
        status: 'CANCELLED',
        booking_id: 'PNR-24908122',
        flight_or_service_num: '12051 Jan Shatabdi',
        seat: 'Coach B2 - Seat 34 (Window)',
      },
      {
        id: 'seg-003-cab',
        trip_id: trip1Id,
        mode: 'CAB',
        provider: 'GoaMiles / Local Cab',
        origin: 'Madgaon Junction',
        destination: 'Taj Fort Aguada Resort, Candolim',
        departure_time: '05:00 PM',
        arrival_time: '06:15 PM',
        price: 1200,
        currency: 'INR',
        status: 'SCHEDULED',
        booking_id: 'GM-44012',
      },
    ];
    this.segments.set(trip1Id, trip1Segments);

    // 5. Active Disruption on Trip 1
    const trip1Disruption: Disruption = {
      id: 'disrupt-konkan-001',
      trip_id: trip1Id,
      segment_id: 'seg-002-train',
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Jan Shatabdi Express cancelled due to rockfall/landslide on Konkan rail route.',
      detected_at: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'ACTIVE',
      affected_provider: 'Qrail / Indian Railways',
      delay_minutes: 360,
    };
    this.disruptions.set(trip1Id, [trip1Disruption]);

    // 6. Alternatives for Trip 1
    const alt1: Alternative = {
      id: 'alt-air-01',
      trip_id: trip1Id,
      title: 'Flight Air Bypass: Mumbai (BOM) → Goa Dabolim (GOI)',
      mode: 'FLIGHT',
      segments: [
        {
          id: 'alt-seg-1',
          trip_id: trip1Id,
          mode: 'CAB',
          provider: 'Google Routes / Cab',
          origin: 'Mumbai Central',
          destination: 'Chhatrapati Shivaji Maharaj Airport (BOM)',
          departure_time: '07:30 AM',
          arrival_time: '08:20 AM',
          price: 650,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: 'ALT-UBER-1',
        },
        {
          id: 'alt-seg-2',
          trip_id: trip1Id,
          mode: 'FLIGHT',
          provider: 'Amadeus / IndiGo',
          origin: 'Mumbai (BOM)',
          destination: 'Goa (GOI)',
          departure_time: '09:45 AM',
          arrival_time: '11:00 AM',
          price: 4600,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: 'ALT-6E-452',
          flight_or_service_num: '6E 452 (A320neo)',
        },
        {
          id: 'alt-seg-3',
          trip_id: trip1Id,
          mode: 'CAB',
          provider: 'Goa Airport Prepaid Taxi',
          origin: 'Goa Dabolim Airport (GOI)',
          destination: 'Taj Fort Aguada Resort, Candolim',
          departure_time: '11:30 AM',
          arrival_time: '12:45 PM',
          price: 1300,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: 'ALT-CAB-GOA',
        },
      ],
      total_price: 6550,
      cost: 6550,
      currency: 'INR',
      total_duration: 315, // 5h 15m
      duration_minutes: 315,
      time_saved_minutes: 210,
      additional_cost: 3050,
      policy_valid: true,
      reason: 'Bypasses the entire Konkan railway blockade. Arrives 3.5 hours earlier than originally planned rail schedule.',
      confidence_score: 96,
      recommendation_badge: 'FASTEST',
    };

    const alt2: Alternative = {
      id: 'alt-bus-02',
      trip_id: trip1Id,
      title: 'Overnight Multi-Axle Volvo Sleeper Bypass',
      mode: 'BUS',
      segments: [
        {
          id: 'alt-seg-201',
          trip_id: trip1Id,
          mode: 'CAB',
          provider: 'City Cab',
          origin: 'Mumbai Central',
          destination: 'Borivali Private Bus Terminal',
          departure_time: '07:00 PM',
          arrival_time: '08:00 PM',
          price: 550,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: 'ALT-CAB-2',
        },
        {
          id: 'alt-seg-202',
          trip_id: trip1Id,
          mode: 'BUS',
          provider: 'VRL Travels / Volvo AC Sleeper',
          origin: 'Mumbai Borivali',
          destination: 'Panaji Bus Stand, Goa',
          departure_time: '08:30 PM',
          arrival_time: '07:30 AM (+1d)',
          price: 1650,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: 'VRL-77491',
        },
      ],
      total_price: 2200,
      cost: 2200,
      currency: 'INR',
      total_duration: 750,
      duration_minutes: 750,
      time_saved_minutes: 0,
      additional_cost: -1300,
      policy_valid: true,
      reason: 'Economical overland solution within corporate policy budget limits. Single transfer with sleeper berth.',
      confidence_score: 84,
      recommendation_badge: 'CHEAPEST',
    } as Alternative;

    this.alternatives.set(trip1Id, [alt1, alt2]);

    // 7. Hotel Stay tied to Trip 1 (Part C: Hotel & Destination)
    const hotel1: HotelStay = {
      id: 'htl-taj-goa-01',
      trip_id: trip1Id,
      hotel_name: 'Taj Fort Aguada Resort & Spa',
      address: 'Sinquerim, Candolim, Goa 403515',
      city: 'Goa',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      original_check_in_time: '03:00 PM',
      estimated_arrival_time: '06:15 PM',
      status: 'CHECK_IN_DELAYED',
      late_check_in_notified: false,
      room_type: 'Deluxe Sea View King',
      confirmation_code: 'TAJ-GOA-78921',
      contact_phone: '+91 832 664 5858',
      destination_info: {
        weather_condition: 'Partly Sunny / Coastal Breeze',
        temperature_celsius: 29,
        emergency_helpline: '112 (Emergency) / 1363 (Tourist Helpline)',
        tourist_desk: 'Goa Tourism Development Desk, Panaji (+91 832 243 8750)',
        transit_tips: 'Pre-paid airport cabs and GoaMiles app cabs available 24/7. Ferry available across Mandovi River.',
      },
    };
    this.hotels.set(trip1Id, hotel1);

    // --- Seed Corridor Trip 2: Bhavnagar to Kerala (User's Exact Corridor) ---
    const trip2Id = 'trip-bhavnagar-kerala-001';
    const trip2: Trip = {
      id: trip2Id,
      user_id: defaultUser.id,
      source: 'Bhavnagar Terminus, Gujarat',
      destination: 'Kochi, Kerala',
      start_date: new Date().toISOString().split('T')[0],
      status: 'DISRUPTED',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    };
    this.trips.set(trip2Id, trip2);

    const trip2Segments: JourneySegment[] = [
      {
        id: 'seg-bvc-01',
        trip_id: trip2Id,
        mode: 'TRAIN',
        provider: 'Indian Railways (Western Railway)',
        origin: 'Bhavnagar Terminus (BVC)',
        destination: 'Surat Junction (ST)',
        departure_time: '04:30 AM',
        arrival_time: '11:15 AM',
        price: 850,
        currency: 'INR',
        status: 'SCHEDULED',
        booking_id: 'PNR-8829104',
        flight_or_service_num: '12972 BVC BDTS SF Exp',
        seat: 'Coach B1 - Seat 22',
      },
      {
        id: 'seg-bvc-02',
        trip_id: trip2Id,
        mode: 'TRAIN',
        provider: 'Indian Railways (Konkan Railway)',
        origin: 'Surat Junction / Mumbai Central',
        destination: 'Ernakulam Junction (ERS), Kochi, Kerala',
        departure_time: '01:30 PM',
        arrival_time: '11:45 AM (Next Day)',
        price: 2450,
        currency: 'INR',
        status: 'CANCELLED',
        booking_id: 'PNR-8829105',
        flight_or_service_num: '12218 Kerala Superfast Express',
        seat: 'Coach A2 - Seat 14',
      },
      {
        id: 'seg-bvc-03',
        trip_id: trip2Id,
        mode: 'CAB',
        provider: 'Kerala Tourism / Prepaid Cab',
        origin: 'Ernakulam Junction',
        destination: 'Kochi Grand Waterside Heritage Resort & Spa, Marine Drive',
        departure_time: '12:15 PM',
        arrival_time: '01:00 PM',
        price: 750,
        currency: 'INR',
        status: 'SCHEDULED',
        booking_id: 'KT-99120',
      },
    ];
    this.segments.set(trip2Id, trip2Segments);

    const trip2Disruption: Disruption = {
      id: 'disrupt-bvc-krl-001',
      trip_id: trip2Id,
      segment_id: 'seg-bvc-02',
      type: 'TRAIN_CANCELLED',
      severity: 'HIGH',
      description: 'Connecting train to Kerala cancelled/blocked at Surat/Mumbai corridor due to track waterlogging and landslide on coastal Konkan link.',
      detected_at: new Date(Date.now() - 25 * 60000).toISOString(),
      status: 'ACTIVE',
      affected_provider: 'Indian Railways / Konkan Railway',
      delay_minutes: 420,
    };
    this.disruptions.set(trip2Id, [trip2Disruption]);

    const hotel2: HotelStay = {
      id: 'htl-kerala-kochi-01',
      trip_id: trip2Id,
      hotel_name: 'Kochi Grand Waterside Heritage Resort & Spa',
      address: 'Marine Drive & Lagoon Promenade, Ernakulam, Kochi, Kerala 682031',
      city: 'Kochi, Kerala',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      original_check_in_time: '03:00 PM',
      estimated_arrival_time: '10:30 PM (Delayed due to transit disruption between Bhavnagar & Kerala)',
      status: 'CHECK_IN_DELAYED',
      late_check_in_notified: false,
      room_type: 'Deluxe Backwaters Lagoon-View Suite',
      confirmation_code: 'KRL-KCH-99201',
      contact_phone: '+91 484 237 1999',
      destination_info: {
        weather_condition: 'Tropical Warm 29°C / Clear Coastal Sky',
        temperature_celsius: 29,
        emergency_helpline: '112 (Emergency) / 1363 (Kerala Tourist Helpline)',
        tourist_desk: 'Kerala Tourism Development Corporation (KTDC), Marine Drive (+91 484 235 3234)',
        transit_tips: 'Cochin International Airport (COK) pre-paid taxis and Kochi Water Metro ferries available 24/7.',
      },
    };
    this.hotels.set(trip2Id, hotel2);

    // 8. Notifications for User (Part D: Frontend & Notifications)
    const userNotifications: TravelNotification[] = [
      {
        id: 'notif-001',
        user_id: defaultUser.id,
        trip_id: trip1Id,
        type: 'DISRUPTION_DETECTED',
        title: 'Train 12051 Cancelled',
        message: 'Your rail journey Mumbai Central → Goa Madgaon has been cancelled due to track obstruction on Konkan line.',
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
        read: false,
        urgency: 'CRITICAL',
        channel: 'IN_APP',
        action_link: '/disruptions',
      },
      {
        id: 'notif-002',
        user_id: defaultUser.id,
        trip_id: trip1Id,
        type: 'ALTERNATIVE_FOUND',
        title: 'In-Policy Air Alternative Available',
        message: 'Amadeus flight option found via BOM → GOI (IndiGo 6E 452). Arrives 3.5h earlier. Fully within company auto-rebooking policy ($96 / ₹4,600).',
        timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
        read: false,
        urgency: 'WARNING',
        channel: 'IN_APP',
        action_link: '/alternatives',
      },
    ];
    this.notifications.set(defaultUser.id, userNotifications);
  }

  // --- Part A: Users & Auth ---
  public createUser(userData: Partial<UserAccount>): UserAccount {
    const id = userData.id || `usr-${Date.now().toString().slice(-5)}`;
    const user: UserAccount = {
      id,
      name: userData.name || 'Business Traveler',
      email: userData.email || `user.${id}@enterprise.com`,
      role: userData.role || 'EMPLOYEE',
      department: userData.department || 'Corporate Operations',
    };
    this.users.set(id, user);
    return user;
  }

  public authenticate(email: string): { user: UserAccount; token: string } {
    let user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user) {
      user = this.createUser({ email, name: email.split('@')[0] });
    }
    return {
      user,
      token: `jwt_sim_${user.id}_${Date.now()}`,
    };
  }

  // --- Part A: Preferences ---
  public getPreferences(userId: string): TravelerPreference {
    return (
      this.preferences.get(userId) || {
        user_id: userId,
        preferred_modes: ['FLIGHT', 'TRAIN', 'CAB'],
        max_transfers: 2,
        seat_preference: 'WINDOW',
        travel_priority: 'fastest',
      }
    );
  }

  public savePreferences(pref: TravelerPreference): TravelerPreference {
    this.preferences.set(pref.user_id, pref);
    return pref;
  }

  // --- Part A: Policies ---
  public getPolicy(userId: string): CorporatePolicy {
    return (
      this.policies.get(userId) ||
      this.policies.get('default') || {
        id: 'pol-default',
        name: 'Standard Travel Policy',
        max_budget_per_trip: 10000,
        allowed_modes: ['FLIGHT', 'TRAIN', 'BUS', 'CAB', 'METRO'],
        require_manager_approval: false,
        auto_rebooking_limit: 8000,
        cabin_class_limit: 'ECONOMY',
      }
    );
  }

  public savePolicy(policy: CorporatePolicy): CorporatePolicy {
    const id = policy.id || `pol-${Date.now()}`;
    const saved = { ...policy, id };
    if (policy.user_id) {
      this.policies.set(policy.user_id, saved);
    }
    this.policies.set(id, saved);
    return saved;
  }

  // --- Part A: Trips & Segments ---
  public createTrip(tripData: Partial<Trip>): Trip {
    const id = tripData.id || `trip-${Date.now().toString().slice(-6)}`;
    const trip: Trip = {
      id,
      user_id: tripData.user_id || 'usr-corp-01',
      source: tripData.source || 'Origin City',
      destination: tripData.destination || 'Destination City',
      start_date: tripData.start_date || new Date().toISOString().split('T')[0],
      status: tripData.status || 'PLANNED',
      created_at: new Date().toISOString(),
    };
    this.trips.set(id, trip);

    // Initial segments if provided
    if (tripData.segments && tripData.segments.length > 0) {
      this.segments.set(id, tripData.segments);
    } else {
      // Default segments
      const defaultSegments: JourneySegment[] = [
        {
          id: `seg-${id}-1`,
          trip_id: id,
          mode: 'CAB',
          provider: 'Google Routes / Cab',
          origin: trip.source,
          destination: `${trip.source} Transit Hub`,
          departure_time: '08:00 AM',
          arrival_time: '08:45 AM',
          price: 400,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: `BK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        },
        {
          id: `seg-${id}-2`,
          trip_id: id,
          mode: 'TRAIN',
          provider: 'Qrail / High Speed Rail',
          origin: `${trip.source} Transit Hub`,
          destination: `${trip.destination} Terminal`,
          departure_time: '09:30 AM',
          arrival_time: '03:15 PM',
          price: 1800,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: `BK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        },
        {
          id: `seg-${id}-3`,
          trip_id: id,
          mode: 'CAB',
          provider: 'Local Cab',
          origin: `${trip.destination} Terminal`,
          destination: trip.destination,
          departure_time: '03:30 PM',
          arrival_time: '04:15 PM',
          price: 500,
          currency: 'INR',
          status: 'SCHEDULED',
          booking_id: `BK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        },
      ];
      this.segments.set(id, defaultSegments);
    }

    // Default linked hotel for trip
    const hotel: HotelStay = {
      id: `htl-${id}`,
      trip_id: id,
      hotel_name: `${trip.destination} Grand Executive Hotel`,
      address: `100 Central Boulevard, ${trip.destination}`,
      city: trip.destination,
      check_in_date: trip.start_date,
      check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      original_check_in_time: '03:00 PM',
      estimated_arrival_time: '04:30 PM',
      status: 'CONFIRMED',
      late_check_in_notified: false,
      room_type: 'Executive Business Suite',
      confirmation_code: `HTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      contact_phone: '+91 22 2840 9900',
      destination_info: {
        weather_condition: 'Clear Sky',
        temperature_celsius: 27,
        emergency_helpline: '112 / 100',
        tourist_desk: 'City Central Information Center',
        transit_tips: 'Airport & Central railway shuttles run every 15 minutes.',
      },
    };
    this.hotels.set(id, hotel);

    return trip;
  }

  public getTrip(tripId: string): Trip | null {
    const trip = this.trips.get(tripId);
    if (!trip) return null;
    return {
      ...trip,
      segments: this.segments.get(tripId) || [],
    };
  }

  public listTrips(userId?: string): Trip[] {
    const all = Array.from(this.trips.values());
    if (userId) {
      return all.filter((t) => t.user_id === userId);
    }
    return all;
  }

  public getTripSegments(tripId: string): JourneySegment[] {
    return this.segments.get(tripId) || [];
  }

  // --- Part A: Normalized Multi-Modal Route Search ---
  public searchRoutes(params: {
    origin: string;
    destination: string;
    date?: string;
    preferred_mode?: string;
    currency?: string;
  }): Route[] {
    const { origin, destination, currency = 'INR' } = params;
    const isIndia = currency === 'INR';
    const sym = isIndia ? '₹' : '$';

    // Return 3 normalized multi-modal route options:
    // Option 1: Fast Air + Cab (Amadeus + Google Routes)
    const airRoute: Route = {
      id: `route-air-${Date.now()}`,
      title: `${origin} → ${destination} Express Flight Bypass`,
      segments: [
        {
          id: 'seg-flt-1',
          trip_id: 'search',
          mode: 'CAB',
          provider: 'Google Routes / Uber',
          origin: origin,
          destination: 'Metropolitan International Airport',
          departure_time: '07:00 AM',
          arrival_time: '07:45 AM',
          price: isIndia ? 650 : 12,
          currency,
          status: 'SCHEDULED',
          booking_id: 'AM-CAB-1',
        },
        {
          id: 'seg-flt-2',
          trip_id: 'search',
          mode: 'FLIGHT',
          provider: 'Amadeus / Air India Express',
          origin: 'Metropolitan Airport',
          destination: `${destination} Airport`,
          departure_time: '09:15 AM',
          arrival_time: '10:45 AM',
          price: isIndia ? 4800 : 62,
          currency,
          status: 'SCHEDULED',
          booking_id: 'AM-FLT-102',
          flight_or_service_num: 'AI 641',
        },
        {
          id: 'seg-flt-3',
          trip_id: 'search',
          mode: 'CAB',
          provider: 'Local Airport Cab',
          origin: `${destination} Airport`,
          destination: destination,
          departure_time: '11:15 AM',
          arrival_time: '12:00 PM',
          price: isIndia ? 950 : 16,
          currency,
          status: 'SCHEDULED',
          booking_id: 'AM-CAB-2',
        },
      ],
      total_price: isIndia ? 6400 : 90,
      total_cost: isIndia ? 6400 : 90,
      currency,
      total_duration: 300, // 5 hours
      transfers: 2,
      waiting_time: 45,
      provider: 'Amadeus & Google Routes',
      last_updated: new Date().toISOString(),
      policy_valid: true,
      reliability_score: 95,
      badges: ['Fastest', 'Corporate Compliant'],
    };

    // Option 2: High-Speed Rail + Ground (Qrail + Indian Railways / Transit)
    const railRoute: Route = {
      id: `route-rail-${Date.now()}`,
      title: `${origin} → ${destination} Superfast Rail Link`,
      segments: [
        {
          id: 'seg-rail-1',
          trip_id: 'search',
          mode: 'CAB',
          provider: 'City Metro / Auto',
          origin: origin,
          destination: 'Central Railway Station',
          departure_time: '06:15 AM',
          arrival_time: '06:50 AM',
          price: isIndia ? 250 : 4,
          currency,
          status: 'SCHEDULED',
          booking_id: 'QR-CAB-1',
        },
        {
          id: 'seg-rail-2',
          trip_id: 'search',
          mode: 'TRAIN',
          provider: 'Qrail / Superfast Express',
          origin: 'Central Railway Station',
          destination: `${destination} Junction`,
          departure_time: '07:20 AM',
          arrival_time: '03:15 PM',
          price: isIndia ? 1650 : 22,
          currency,
          status: 'SCHEDULED',
          booking_id: 'QR-TRN-882',
          flight_or_service_num: '12952 Superfast',
          seat: 'Executive Chair (EC)',
        },
        {
          id: 'seg-rail-3',
          trip_id: 'search',
          mode: 'CAB',
          provider: 'Local City Cab',
          origin: `${destination} Junction`,
          destination: destination,
          departure_time: '03:30 PM',
          arrival_time: '04:15 PM',
          price: isIndia ? 400 : 6,
          currency,
          status: 'SCHEDULED',
          booking_id: 'QR-CAB-2',
        },
      ],
      total_price: isIndia ? 2300 : 32,
      total_cost: isIndia ? 2300 : 32,
      currency,
      total_duration: 600, // 10 hours
      transfers: 2,
      waiting_time: 30,
      provider: 'Qrail & City Transit',
      last_updated: new Date().toISOString(),
      policy_valid: true,
      reliability_score: 91,
      badges: ['Cheapest', 'Low Carbon'],
    };

    // Option 3: Direct Private Intercity Car (Google Routes API)
    const roadRoute: Route = {
      id: `route-cab-${Date.now()}`,
      title: `${origin} → ${destination} Private Direct Chauffeur`,
      segments: [
        {
          id: 'seg-road-1',
          trip_id: 'search',
          mode: 'CAB',
          provider: 'Google Routes / Intercity Chauffeur',
          origin: origin,
          destination: destination,
          departure_time: '06:30 AM',
          arrival_time: '02:30 PM',
          price: isIndia ? 8200 : 105,
          currency,
          status: 'SCHEDULED',
          booking_id: 'GR-CAB-DIRECT',
        },
      ],
      total_price: isIndia ? 8200 : 105,
      total_cost: isIndia ? 8200 : 105,
      currency,
      total_duration: 480, // 8 hours
      transfers: 0,
      waiting_time: 0,
      provider: 'Google Routes API',
      last_updated: new Date().toISOString(),
      policy_valid: true,
      reliability_score: 87,
      badges: ['Zero Transfers', 'Door-to-Door'],
    };

    return [airRoute, railRoute, roadRoute];
  }

  // --- Part B: Disruptions & Alternatives ---
  public getDisruptions(tripId: string): Disruption[] {
    return this.disruptions.get(tripId) || [];
  }

  public simulateDisruption(tripId: string, disruptionData: Partial<Disruption>): Disruption {
    const trip = this.trips.get(tripId);
    if (trip) {
      trip.status = 'DISRUPTED';
    }

    const segments = this.segments.get(tripId) || [];
    if (segments.length > 1) {
      // mark middle transport segment as cancelled or delayed
      segments[1].status = disruptionData.type === 'SEVERE_DELAY' ? 'DELAYED' : 'CANCELLED';
    }

    const newDisruption: Disruption = {
      id: `disrupt-${Date.now()}`,
      trip_id: tripId,
      segment_id: disruptionData.segment_id || segments[1]?.id || 'seg-002',
      type: disruptionData.type || 'TRAIN_CANCELLED',
      severity: disruptionData.severity || 'HIGH',
      description:
        disruptionData.description ||
        'Service cancelled unexpectedly due to operational hazard on main corridor.',
      detected_at: new Date().toISOString(),
      status: 'ACTIVE',
      affected_provider: disruptionData.affected_provider || 'Qrail / Transit Operator',
      delay_minutes: disruptionData.delay_minutes || 240,
    };

    const list = this.disruptions.get(tripId) || [];
    list.unshift(newDisruption);
    this.disruptions.set(tripId, list);

    // Update linked Hotel Stay status to CHECK_IN_DELAYED
    const hotel = this.hotels.get(tripId);
    if (hotel) {
      hotel.status = 'CHECK_IN_DELAYED';
      hotel.estimated_arrival_time = '09:45 PM (Delayed due to transit disruption)';
    }

    // Add Notification to User Inbox
    const userNotif: TravelNotification = {
      id: `notif-${Date.now()}`,
      user_id: trip?.user_id || 'usr-corp-01',
      trip_id: tripId,
      type: 'DISRUPTION_DETECTED',
      title: `${newDisruption.type.replace(/_/g, ' ')} Alert`,
      message: `${newDisruption.description} Autonomous Concierge has generated in-policy alternatives.`,
      timestamp: new Date().toISOString(),
      read: false,
      urgency: 'CRITICAL',
      channel: 'IN_APP',
      action_link: '/disruptions',
    };
    const notifs = this.notifications.get(userNotif.user_id) || [];
    notifs.unshift(userNotif);
    this.notifications.set(userNotif.user_id, notifs);

    return newDisruption;
  }

  public getAlternatives(tripId: string): Alternative[] {
    const trip = this.trips.get(tripId);
    const origin = trip?.source || 'Current Location';
    const dest = trip?.destination || 'Destination Hub';
    const userPolicy = trip ? this.getPolicy(trip.user_id) : null;

    let alts = this.alternatives.get(tripId);
    if (!alts || alts.length === 0) {
      alts = [
        {
          id: `alt-air-${tripId}`,
          trip_id: tripId,
          title: `Flight Air Bypass: ${origin} → ${dest}`,
          mode: 'FLIGHT',
          segments: [
            {
              id: `alt-s1`,
              trip_id: tripId,
              mode: 'CAB',
              provider: 'Google Routes / Cab',
              origin: origin,
              destination: 'Nearest Airport',
              departure_time: 'Immediate',
              arrival_time: '45m later',
              price: 600,
              currency: 'INR',
              status: 'SCHEDULED',
              booking_id: 'ALT-CAB',
            },
            {
              id: `alt-s2`,
              trip_id: tripId,
              mode: 'FLIGHT',
              provider: 'Amadeus / Domestic Air',
              origin: 'Departure Airport',
              destination: `${dest} Airport`,
              departure_time: 'In 2 hours',
              arrival_time: 'In 3h 15m',
              price: 4500,
              currency: 'INR',
              status: 'SCHEDULED',
              booking_id: 'ALT-FLT',
              flight_or_service_num: 'DOM-304',
            },
          ],
          total_price: 5100,
          cost: 5100,
          currency: 'INR',
          total_duration: 240,
          duration_minutes: 240,
          time_saved_minutes: 180,
          additional_cost: 2900,
          policy_valid: true,
          reason: 'Fastest alternative to circumvent the disabled ground corridor. Arrives well ahead of rescheduled business meeting.',
          confidence_score: 96,
          recommendation_badge: 'FASTEST',
        },
        {
          id: `alt-bus-${tripId}`,
          trip_id: tripId,
          title: `Highway Sleeper Coach Detour: ${origin} → ${dest}`,
          mode: 'BUS',
          segments: [
            {
              id: `alt-b1`,
              trip_id: tripId,
              mode: 'BUS',
              provider: 'State Express Transport',
              origin: origin,
              destination: dest,
              departure_time: 'Tonight 08:30 PM',
              arrival_time: 'Tomorrow 07:00 AM',
              price: 1550,
              currency: 'INR',
              status: 'SCHEDULED',
              booking_id: 'ALT-BUS',
            },
          ],
          total_price: 1550,
          cost: 1550,
          currency: 'INR',
          total_duration: 630,
          duration_minutes: 630,
          time_saved_minutes: 0,
          additional_cost: -650,
          policy_valid: true,
          reason: 'Economical overnight solution with direct berth, incurring zero budget overage.',
          confidence_score: 82,
          recommendation_badge: 'CHEAPEST',
        },
      ];
      this.alternatives.set(tripId, alts);
    }

    // Dynamic compliance validation against traveler's corporate policy
    alts.forEach((alt) => {
      alt.cost = alt.total_price;
      alt.duration_minutes = alt.total_duration;
      alt.time_saved_minutes = alt.time_saved_minutes ?? Math.max(0, 480 - alt.total_duration);

      if (userPolicy) {
        const altPrice = alt.total_price;
        const exceedsMaxBudget = altPrice > userPolicy.max_budget_per_trip;
        const exceedsAutoRebook = altPrice > userPolicy.auto_rebooking_limit;
        const hasDisallowedMode = alt.segments.some((s) => !userPolicy.allowed_modes.includes(s.mode));

        alt.policy_valid = !(exceedsMaxBudget || exceedsAutoRebook || hasDisallowedMode);
      }
    });

    return alts;
  }

  // --- Part B & C: Rebooking & Stay Synchronization ---
  public executeRebooking(tripId: string, alternativeId?: string): {
    success: boolean;
    trip: Trip;
    rebooked_alternative: Alternative;
    rebooking_reference: string;
    hotel_stay: HotelStay;
    message: string;
  } {
    const trip = this.trips.get(tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);

    const alts = this.getAlternatives(tripId);
    const selectedAlt = alts.find((a) => a.id === alternativeId) || alts[0];

    // 1. Update trip status & replace segments
    trip.status = 'REBOOKED';
    const existingSegments = this.segments.get(tripId) || [];
    const updatedOldSegments = existingSegments.map((s) => ({
      ...s,
      status: 'CANCELLED' as const,
    }));
    const rebookedLegs = selectedAlt.segments.map((s) => ({
      ...s,
      status: 'REBOOKED' as const,
    }));
    this.segments.set(tripId, [...updatedOldSegments, ...rebookedLegs]);

    // 2. Mark active disruptions as resolved
    const currentDisruptions = this.disruptions.get(tripId) || [];
    currentDisruptions.forEach((d) => {
      d.status = 'AUTO_REBOOKED';
    });

    // 3. Update Part C: Hotel Stay check-in & arrival
    let hotel = this.hotels.get(tripId);
    if (!hotel) {
      hotel = {
        id: `htl-${tripId}`,
        trip_id: tripId,
        hotel_name: 'Destination Executive Resort & Spa',
        address: '100 Beach Boulevard, Central District',
        city: trip.destination || 'Destination',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        original_check_in_time: '03:00 PM',
        estimated_arrival_time: '04:30 PM',
        status: 'CONFIRMED',
        late_check_in_notified: false,
        room_type: 'Executive Business Suite',
        confirmation_code: `HTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        contact_phone: '+91 22 2840 9900',
        destination_info: {
          weather_condition: 'Clear Sky',
          temperature_celsius: 28,
          emergency_helpline: '112',
          tourist_desk: 'Central Hub Desk',
          transit_tips: 'Airport & Central railway shuttles run every 15 minutes.',
        },
      };
      this.hotels.set(tripId, hotel);
    }

    hotel.status = 'CONFIRMED';
    hotel.late_check_in_notified = true;
    hotel.last_notification_sent_at = new Date().toISOString();
    hotel.estimated_arrival_time = 'Rescheduled to 01:15 PM (Direct air arrival verified)';

    // 4. Create Notification in Part D
    const notif: TravelNotification = {
      id: `notif-rebook-${Date.now()}`,
      user_id: trip.user_id,
      trip_id: tripId,
      type: 'AUTO_REBOOKED',
      title: 'Journey Rebooked Successfully',
      message: `Your trip has been confirmed on: ${selectedAlt.title}. Hotel Front Desk at ${hotel.hotel_name} has been updated with revised arrival time.`,
      timestamp: new Date().toISOString(),
      read: false,
      urgency: 'INFO',
      channel: 'IN_APP',
      action_link: '/trips',
    };
    const notifs = this.notifications.get(trip.user_id) || [];
    notifs.unshift(notif);
    this.notifications.set(trip.user_id, notifs);

    const rebookingRef = `REB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    return {
      success: true,
      trip,
      rebooked_alternative: selectedAlt,
      rebooking_reference: rebookingRef,
      hotel_stay: hotel,
      message: `Successfully rebooked on ${selectedAlt.title}. Destination stay synchronized.`,
    };
  }

  // --- Part C: Hotels & Stay Modification ---
  public getHotelStay(tripIdOrDestination: string): HotelStay | null {
    const key = tripIdOrDestination.toLowerCase();
    
    // Check if directly stored
    let hotel = this.hotels.get(tripIdOrDestination);
    if (hotel) return hotel;

    // Check by destination matching
    if (key.includes('kerala') || key.includes('kochi') || key.includes('ernakulam') || key.includes('bhavnagar')) {
      return this.hotels.get('trip-bhavnagar-kerala-001') || null;
    }
    if (key.includes('goa') || key.includes('madgaon')) {
      return this.hotels.get('trip-mb-goa-001') || null;
    }

    // Lookup linked trip
    const trip = this.trips.get(tripIdOrDestination);
    if (trip?.destination) {
      const destLower = trip.destination.toLowerCase();
      if (destLower.includes('kerala') || destLower.includes('kochi')) {
        return this.hotels.get('trip-bhavnagar-kerala-001') || null;
      }
      if (destLower.includes('goa')) {
        return this.hotels.get('trip-mb-goa-001') || null;
      }
    }

    if (!hotel) {
      hotel = {
        id: `htl-${tripIdOrDestination}`,
        trip_id: tripIdOrDestination,
        hotel_name: 'Grand Hyatt Executive City Centre',
        address: '450 Marina Way, Central Commercial Zone',
        city: trip?.destination || tripIdOrDestination || 'Destination City',
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
        original_check_in_time: '02:00 PM',
        estimated_arrival_time: '03:45 PM',
        status: 'CONFIRMED',
        late_check_in_notified: false,
        room_type: 'Deluxe Executive King Suite',
        confirmation_code: `HTL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        contact_phone: '+91 80 4455 6677',
        destination_info: {
          weather_condition: 'Sunny with Moderate Breeze',
          temperature_celsius: 27,
          emergency_helpline: '112 / +91 11 2301 2412',
          tourist_desk: 'Concierge Desk Level 1',
          transit_tips: 'Express transit shuttles leave every 20 minutes from Central Terminal.',
        },
      };
      this.hotels.set(tripIdOrDestination, hotel);
    }
    return hotel;
  }

  public modifyHotelStay(
    tripId: string,
    modifications: {
      late_check_in_notified?: boolean;
      new_check_in_date?: string;
      new_check_out_date?: string;
      special_instructions?: string;
    }
  ): HotelStay {
    let hotel = this.getHotelStay(tripId);
    if (!hotel) throw new Error(`No hotel booking found for trip ${tripId}`);

    if (modifications.late_check_in_notified !== undefined) {
      hotel.late_check_in_notified = modifications.late_check_in_notified;
      hotel.last_notification_sent_at = new Date().toISOString();
    }
    if (modifications.new_check_in_date) {
      hotel.check_in_date = modifications.new_check_in_date;
      hotel.status = 'DATE_MODIFIED';
    }
    if (modifications.new_check_out_date) {
      hotel.check_out_date = modifications.new_check_out_date;
    }
    if (modifications.special_instructions !== undefined) {
      hotel.special_instructions = modifications.special_instructions;
    }

    // Add notification
    const trip = this.trips.get(tripId);
    if (trip) {
      const notif: TravelNotification = {
        id: `notif-htl-${Date.now()}`,
        user_id: trip.user_id,
        trip_id: tripId,
        type: 'HOTEL_UPDATED',
        title: 'Hotel Stay Updated',
        message: `Front desk at ${hotel.hotel_name} updated. Late arrival clearance logged (${hotel.confirmation_code}).`,
        timestamp: new Date().toISOString(),
        read: false,
        urgency: 'INFO',
        channel: 'IN_APP',
        action_link: '/hotels',
      };
      const notifs = this.notifications.get(trip.user_id) || [];
      notifs.unshift(notif);
      this.notifications.set(trip.user_id, notifs);
    }

    return hotel;
  }

  // --- Part D: Notifications ---
  public getNotifications(userId: string): TravelNotification[] {
    return this.notifications.get(userId) || [];
  }

  public markNotificationAsRead(userId: string, notificationId: string): boolean {
    const list = this.notifications.get(userId) || [];
    const item = list.find((n) => n.id === notificationId);
    if (item) {
      item.read = true;
      return true;
    }
    return false;
  }

  public sendNotification(notification: Partial<TravelNotification>): TravelNotification {
    const userId = notification.user_id || 'usr-corp-01';
    const newNotif: TravelNotification = {
      id: notification.id || `notif-${Date.now()}`,
      user_id: userId,
      trip_id: notification.trip_id,
      type: notification.type || 'DISRUPTION_DETECTED',
      title: notification.title || 'Travel Alert',
      message: notification.message || 'Automated travel concierge update.',
      timestamp: new Date().toISOString(),
      read: false,
      urgency: notification.urgency || 'INFO',
      channel: notification.channel || 'IN_APP',
      action_link: notification.action_link,
    };

    const list = this.notifications.get(userId) || [];
    list.unshift(newNotif);
    this.notifications.set(userId, list);

    return newNotif;
  }
}

export const integratedPrdService = new IntegratedPrdService();
