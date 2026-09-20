# Autonomous Travel-Disruption Concierge ✈️🚆🚌🚕

An AI-powered **multi-modal travel assistant** that helps travelers plan journeys, monitor disruptions, find alternative routes, and make travel decisions automatically according to their preferences and travel policy.

## 🚀 Problem

Travel disruptions such as:

* Flight delays
* Train delays
* Vehicle breakdowns
* Route changes
* Missed connections
* Cancellations

can force travelers to manually search for alternatives, compare prices, change bookings, and update their stay arrangements.

This project provides a **single intelligent travel platform** that continuously monitors a journey and helps recover from disruptions.

---

## 💡 Solution

The system follows this flow:

```text
Create Trip
    ↓
Set Traveler Preferences & Policy
    ↓
Search Multi-Modal Routes
    ↓
Flight / Train / Bus / Cab
    ↓
Select Route
    ↓
Monitor Journey
    ↓
Detect Disruption
    ↓
Analyze Impact
    ↓
Find Alternative Routes
    ↓
Rank Alternatives
    ↓
Validate Against Travel Policy
    ↓
Rebook / Recommend Alternative
    ↓
Update Stay
    ↓
Notify Traveler
    ↓
Continue Monitoring
```

---

# ✨ Key Features

### 1. Multi-Modal Travel Planning

Search and combine:

* ✈️ Flights
* 🚆 Trains
* 🚌 Buses
* 🚕 Road/Cab routes

The system can create a journey containing multiple transport segments.

### 2. Traveler Preferences

Users can define preferences such as:

* Economy / Business
* Maximum additional fare
* Maximum number of transfers
* Preferred transport modes
* Maximum acceptable delay
* Comfort preferences

### 3. Travel Policy

Users can define rules that control autonomous decisions.

Example:

```text
Maximum additional fare: ₹5,000
Maximum delay: 4 hours
Maximum transfers: 2
Allowed transport: Flight + Train + Cab
```

### 4. Real-Time Travel Data

The system integrates external travel APIs to retrieve available travel information.

#### ✈️ Amadeus

Used for flight offers, fares and availability.

[Amadeus for Developers](https://developers.amadeus.com/?utm_source=chatgpt.com)

#### 🚆 Qrail

Used for Indian railway information such as train schedules and trains between stations.

[Qrail Developer API](https://www.qrail.in/developers?utm_source=chatgpt.com)

#### 🗺️ Google Routes API

Used for road routing, distance and travel duration.

[Google Routes API](https://developers.google.com/maps/documentation/routes?utm_source=chatgpt.com)

### 🤖 Gemini API

Gemini is used for:

* Understanding natural-language preferences
* Explaining route decisions
* Generating traveler-friendly summaries
* Supporting intelligent reasoning

Gemini is **not used to invent travel prices or schedules**. Actual travel information comes from travel providers.

[Gemini API Documentation](https://ai.google.dev/api?utm_source=chatgpt.com)

---

# 🧠 AI Decision Architecture

The project separates **deterministic decisions** from **AI reasoning**.

```text
Real Travel Data
      ↓
Normalization
      ↓
Deterministic Rules
      ↓
Policy Validation
      ↓
Route Ranking
      ↓
Gemini
      ↓
Human-Friendly Explanation
```

Critical values such as:

* Price
* Travel duration
* Connection feasibility
* Policy limits
* Booking constraints

are handled using deterministic logic.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────┐
```
