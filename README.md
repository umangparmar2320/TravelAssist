# ✈️ Autonomous Travel-Disruption Concierge

> **An AI-powered travel assistant that plans, monitors, and recovers multi-modal journeys automatically.**

## 🚀 Overview

Travel disruptions such as flight delays, train delays, cancellations, vehicle breakdowns, and missed connections can force travelers to manually search for alternatives.

**Autonomous Travel-Disruption Concierge** brings the complete recovery process into one platform.

The system can:

* 🗺️ Plan multi-modal journeys
* ✈️ Search flights
* 🚆 Search trains
* 🚕 Find road/cab routes
* ⚙️ Apply traveler preferences and travel policies
* 🚨 Detect travel disruptions
* 🔄 Find alternative routes
* 🧠 Rank alternatives
* 💰 Validate additional cost against policy
* 🎫 Support rebooking decisions
* 🏨 Handle stay/hotel changes
* 🔔 Notify travelers
* 📡 Continue monitoring the journey

---

## 🎯 Problem

When a journey is disrupted, travelers often need to:

1. Detect the disruption
2. Understand its impact
3. Search alternative transportation
4. Compare price and time
5. Check their travel policy
6. Rebook
7. Modify their stay
8. Inform others

Our system combines these steps into a single intelligent workflow.

---

## 💡 How It Works

```text
Create Trip
     ↓
Set Preferences & Travel Policy
     ↓
Search Multi-Modal Routes
     ↓
Select Journey
     ↓
Monitor Journey
     ↓
Detect Disruption
     ↓
Analyze Impact
     ↓
Search Alternatives
     ↓
Rank & Validate
     ↓
Rebook / Recommend
     ↓
Update Journey & Stay
     ↓
Notify Traveler
```

---

# ✨ Key Features

### 🗺️ Multi-Modal Journey Planning

Create journeys using multiple transportation modes:

* ✈️ Flight
* 🚆 Train
* 🚌 Bus
* 🚕 Cab / Road

### 👤 Traveler Preferences

Users can define:

* Cabin preference
* Maximum additional fare
* Maximum transfers
* Preferred transport modes
* Maximum acceptable delay
* Comfort preferences

### 📋 Travel Policy

The system uses traveler-defined policies when evaluating alternatives.

Example:

```text
Maximum additional fare: ₹5,000
Maximum delay: 4 hours
Maximum transfers: 2
Allowed modes: Flight + Train + Cab
```

### 🚨 Disruption Detection

Detect disruptions such as:

* Flight delay
* Train delay
* Cancellation
* Vehicle breakdown
* Missed connection

### 🔄 Alternative Route Recovery

When a disruption occurs:

```text
Disruption
    ↓
Impact Analysis
    ↓
Alternative Search
    ↓
Policy Validation
    ↓
Route Ranking
    ↓
Rebooking / Recommendation
```

### 🤖 AI Assistance

Gemini is used for:

* Natural-language preference understanding
* Travel explanations
* Alternative-route summaries
* Traveler-friendly notifications

Critical values such as **price, duration, policy limits, and connection validity** are handled using deterministic logic.

---

# 🏗️ Architecture

```text
                    ┌──────────────────┐
                    │     Next.js      │
                    │    Frontend      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     FastAPI      │
                    │     Backend      │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
      ┌───────────┐    ┌───────────┐    ┌───────────┐
      │  Core     │    │Disruption │    │  Hotel &  │
      │ Travel A  │    │ Decision B│    │Destination C│
      └───────────┘    └───────────┘    └───────────┘
            │                │                │
            └────────────────┼────────────────┘
                             ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    └──────────────────┘
```

---

# 🛠️ Tech Stack

| Layer           | Technology              |
| --------------- | ----------------------- |
| Frontend        | Next.js, TypeScript     |
| UI              | Tailwind CSS, shadcn/ui |
| Backend         | Python, FastAPI         |
| ORM             | SQLAlchemy              |
| Migration       | Alembic                 |
| Database        | PostgreSQL              |
| Real-Time       | WebSocket, Redis        |
| AI              | Google Gemini           |
| Flight Data     | Amadeus                 |
| Train Data      | Qrail                   |
| Road Routing    | Google Routes API       |
| Version Control | Git + GitHub            |

---

# 🔌 External APIs

### ✈️ Amadeus

Used for flight search, offers, fares and availability.

### 🚆 Qrail

Used for Indian railway information.

### 🗺️ Google Routes API

Used for road/cab route calculation, distance and travel duration.

### 🤖 Gemini API

Used for AI reasoning, preference interpretation and explanations.

---

# 🔑 Environment Variables

Create a `.env` file for the backend:

```env
DATABASE_URL=

GEMINI_API_KEY=

AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=

QRAIL_API_KEY=

GOOGLE_MAPS_API_KEY=

REDIS_URL=

TELEGRAM_BOT_TOKEN=
```

> ⚠️ **Never commit API keys or `.env` files to GitHub.**

---

# 📁 Project Structure

```text
autonomous-travel-concierge/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── services/
│   └── types/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── providers/
│   │   └── main.py
│   │
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
│
├── .env.example
├── .gitignore
└── README.md
```

---

# ▶️ Getting Started

## 1. Clone the Repository

```bash
git clone <repository-url>
cd autonomous-travel-concierge
```

## 2. Backend Setup

```bash
cd backend

python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

# 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Testing

The project includes end-to-end testing for the complete travel recovery workflow.

### Core Test Flow

```text
Login
 ↓
Create Trip
 ↓
Set Preferences
 ↓
Set Travel Policy
 ↓
Search Route
 ↓
Select Route
 ↓
Save Trip
 ↓
Trigger Disruption
 ↓
Analyze Impact
 ↓
Find Alternatives
 ↓
Validate Policy
 ↓
Rebook / Recommend
 ↓
Update Journey
 ↓
Notify User
```

The final integration testing checks frontend, backend, database, APIs, real-time updates, disruption handling, and the complete recovery workflow.

---

# 👥 Team Structure

### Part A — Core Travel

* User & Authentication
* Traveler Preferences
* Travel Policy
* Trip Management
* Journey Segments
* Transport Data
* Route Planning
* Travel API Integration

### Part B — Disruption & Decision

* Monitoring
* Disruption Detection
* Impact Analysis
* Alternative Routes
* Ranking
* Policy Validation
* Rebooking

### Part C — Hotel & Destination

* Hotel / Stay Management
* Stay Modification
* Destination Information
* Destination Services

### Part D — Frontend & Notifications

* Dashboard
* Journey Timeline
* Real-Time UI
* WebSocket Updates
* Notifications

---

# 🔄 Integration Strategy

All modules use shared contracts and APIs.

```text
Frontend
   ↓
FastAPI
   ↓
Services
   ↓
PostgreSQL
   ↓
External Travel APIs
```

External provider responses are normalized before being used by the application:

```text
Amadeus
Qrail
Google Routes
     ↓
Provider Adapters
     ↓
Normalized Travel Data
     ↓
Application
```

This keeps all team modules compatible after merging.

---

# 🧪 Demo Mode

The application supports mock/demo travel data for demonstrating the complete disruption-recovery workflow when external APIs are unavailable.

Mock and real providers use the same normalized data structure.

```text
Real Provider
      │
      ├──→ Normalized Travel Data
      │
Mock Provider
      │
      └──→ Normalized Travel Data
```

---

# 🔐 Security

* API keys are stored only in environment variables.
* Secrets are never exposed to the frontend.
* `.env` is excluded from Git.
* Backend validates external API responses.
* User and travel-policy data are validated before decision-making.

---

# 🎯 Project Goal

The goal is to move the traveler from:

> **“My journey has been disrupted.”**

to:

> **“Here is a valid alternative that matches your travel policy.”**

with minimal manual effort.

---

## 📚 Documentation

Detailed project documentation is available in the `docs/` directory.

Recommended repository documentation includes setup, usage, testing, and contribution information; GitHub displays the root `README.md` on the repository's main page.

---

## 👨‍💻 Team

Built as a collaborative hackathon project.

**Autonomous Travel-Disruption Concierge**
*Plan smarter. Recover faster. Travel with confidence.* ✈️
