# SmartOPD — Smart OPD Queue & Patient Arrival Management System

> **College Mini Project** | Healthcare Technology / Queue Management System  
> Developed for Government Hospitals to eliminate physical waiting room overcrowding and optimize patient arrival times.

---

## 1. Project Overview

In public and district government hospitals, hundreds of patients typically arrive early in the morning (e.g. 7:30 AM – 8:00 AM) regardless of their actual consultation time. Patients travelling from distant villages wait for 4 to 7 hours in congested, unventilated corridors. When a doctor is delayed, steps out for ward rounds, or an emergency case interrupts the OPD, static token numbers offer zero guidance.

**SmartOPD** solves this crisis through a **Dynamic OPD Queue Engine**:
1. **Remote Registration**: Patients generate digital OPD tokens from home using their mobile phone.
2. **Dynamic Queue Recalculation**: Instead of static numbers, the system continuously calculates real-time estimated consultation times based on doctor availability, actual consultation pace, doctor delays, emergencies, and no-shows.
3. **Recommended Hospital Arrival Window**: Patients receive personalized arrival brackets (e.g., *"Reach hospital between 11:20 AM and 11:35 AM"*), allowing them to travel comfortably and arrive right on time.
4. **Mock SMS Gateway & Broadcasts**: Automatic SMS notifications alert patients when their token is confirmed, if an emergency postpones the queue, or when their turn is next.
5. **Staff Dashboard**: Dedicated hospital console for doctors and nurses with operational controls: *Call Next*, *Pause Queue*, *Doctor Delay*, *Emergency Flag*, *Mark No-Show*, and *Requeue Patient*.

---

## 2. Technology Stack

- **Frontend**: React.js 18, Tailwind CSS, Lucide icons, responsive mobile/desktop UI.
- **Backend**: Java 25 LTS / Spring Boot 3.5 (REST APIs, Spring Data JPA, Jakarta Validation, CORS).
- **Database**: PostgreSQL 14+ (with H2 in-memory auto-fallback for zero-setup demo).
- **Queue Engine**: Deterministic rule-based algorithmic engine.
- **SMS Integration**: Pluggable SMS Gateway architecture (`MockSmsGatewayServiceImpl` with instant logs & simulated SMS toast banners).

---

## 3. Project Directory Structure

```
SmartOPD/
├── live-app/
│   └── index.html                # Self-contained zero-dependency interactive application (runs in any browser)
├── backend/
│   ├── pom.xml                   # Maven dependencies (Spring Boot, JPA, Postgres, H2, Validation)
│   └── src/
│       ├── main/
│       │   ├── java/com/smartopd/
│       │   │   ├── SmartOpdApplication.java
│       │   │   ├── config/       # SecurityConfig, CorsConfig, DataInitializer
│       │   │   ├── controller/   # AuthController, PatientController, QueueController, StaffController, ...
│       │   │   ├── dto/          # Request & Response DTOs
│       │   │   ├── engine/       # DynamicQueueEngine.java (Core Innovation Algorithm)
│       │   │   ├── entity/       # Department, Patient, StaffUser, QueueToken, QueueEvent, ...
│       │   │   ├── enums/        # TokenStatus, EventType, Role, NotificationChannel
│       │   │   ├── repository/   # Spring Data JPA Repositories
│       │   │   └── service/      # QueueService, PatientService, StaffService, NotificationService, sms/
│       │   └── resources/
│       │       ├── application.yml           # Default dev configuration (H2 in-memory DB)
│       │       └── application-postgres.yml  # PostgreSQL production configuration
├── frontend/
│   ├── package.json              # React 18 & Vite configuration
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx               # Main SPA router and view orchestrator
│       ├── main.jsx
│       ├── index.css
│       ├── api/apiService.js     # REST client communicating with Spring Boot backend
│       ├── context/AppContext.jsx# Global state management
│       ├── components/           # Navbar, Footer, Sidebar, StatCard, Badge, SmsToastNotification
│       └── pages/                # All 10 application pages
├── database/
│   ├── schema.sql                # Complete PostgreSQL schema script
│   └── seed_data.sql             # Sample departments, doctors, patients, and initial tokens
├── docs/
│   ├── ARCHITECTURE.md           # System architecture, layered design & sequence diagrams
│   ├── DYNAMIC_QUEUE_ENGINE.md   # Mathematical model, equations & recalculation triggers
│   ├── API_DOCUMENTATION.md      # Full REST API documentation with sample JSON payloads
│   └── DATABASE_SCHEMA.md        # Database tables, relationships and indices
└── README.md
```

---

## 4. How to Run the Project

### Option A: Instant Zero-Install Demo (Recommended for quick testing)
To review and demonstrate the entire application immediately without installing Node or Maven:
1. Navigate to: `SmartOPD/live-app/`
2. Double-click **`index.html`** or open it in Chrome, Edge, or Firefox.
3. The complete application runs live with all 10 pages, rich healthcare styling, real-time dynamic queue recalculation, audio-visual banners, and SMS notifications.

---

### Option B: Full-Stack Execution (Spring Boot Backend + PostgreSQL + React)

#### 1. Database Setup (PostgreSQL)
Create the PostgreSQL database and execute the schema:
```bash
# In PostgreSQL CLI or pgAdmin:
CREATE DATABASE smartopd_db;
\c smartopd_db;
\i C:/Users/Shanu/.gemini/antigravity/scratch/SmartOPD/database/schema.sql;
\i C:/Users/Shanu/.gemini/antigravity/scratch/SmartOPD/database/seed_data.sql;
```

#### 2. Start the Spring Boot Backend
```bash
cd C:/Users/Shanu/.gemini/antigravity/scratch/SmartOPD/backend

# Run with Maven (uses H2 in-memory by default for instant evaluation):
mvn spring-boot:run

# Or run with PostgreSQL profile:
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```
Backend will start on: **`http://localhost:8080`**  
Embedded H2 Console (in dev mode): **`http://localhost:8080/h2-console`**

#### 3. Start the React Frontend
```bash
cd C:/Users/Shanu/.gemini/antigravity/scratch/SmartOPD/frontend
npm install
npm run dev
```
Frontend will be available at: **`http://localhost:3000`**

---

## 5. Demo Credentials & Sample Data

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Hospital Admin** | `admin` | `Admin@123` | Hospital-wide administration |
| **Nurse Staff** | `staff.card` | `Staff@123` | Cardiology queue manager |
| **OPD Doctor** | `dr.sharma` | `Doctor@123` | Cardiology consulting doctor |

### Pre-loaded Patient Tokens for Testing:
- **`CARD-104`**: Patient **Geeta Devi** (63y, Female) travelling from Rampur village (35 km away). Token status: `WAITING`, position #2.
- **`CARD-103`**: Patient **Mohit Singhania** (28y, Male). Token status: `WAITING`, position #1 (next in line).
- **`CARD-102`**: Patient **Pooja Sharma** (34y, Female). Token status: `IN_CONSULTATION`.
- **`CARD-101`**: Patient **Ramesh Kumar** (52y, Male). Token status: `COMPLETED`.

---

## 6. Testing & Evaluation Walkthrough

Follow these test scenarios to verify all functional requirements:

1. **Patient Registration & Token Generation**:
   - Go to **Patient Registration Page**.
   - Enter name, mobile (`+919811223344`), age, and select *Cardiology*.
   - Click **Generate OPD Queue Token**.
   - Notice the instant confirmation modal displaying Token Number (e.g. `CARD-105`), dynamic position, estimated consultation time, and recommended arrival window.
   - An SMS alert toast pops up on the bottom right.

2. **Patient Live Queue Tracking**:
   - Go to **Track Token Page**. Enter `CARD-104` or phone `+919765432109`.
   - The **Patient Dashboard** displays queue rank, patients ahead, estimated wait time, and recommended arrival window.

3. **Doctor Delay & Automatic Recalculation**:
   - Login as staff using one-click button (`staff.card`).
   - Go to **Delays & Emergencies** page.
   - Log a **20-minute doctor delay** ("Attending inpatient rounds").
   - Notice that all waiting patient consultation times and arrival windows automatically shift forward by 20 minutes without corrupting the queue.
   - SMS delay notifications are logged in the **SMS Dispatch Log**.

4. **Emergency Case Interruption**:
   - On the **Delays & Emergencies** page, record an **Emergency Case** (25 minutes offset).
   - All waiting tokens immediately postpone their arrival windows.
   - Urgent broadcast SMS is dispatched to waiting patients.

5. **Operational Controls (Call Next, In-Consultation, Complete)**:
   - Go to **Queue Operations** page.
   - Click **Call Next Waiting Patient**. The first waiting patient changes to `CALLED`, their rank updates, and a "Your Turn" SMS is sent.
   - Click **Start Consultation** $\to$ status changes to `IN_CONSULTATION`.
   - Click **Complete Consultation** $\to$ enter diagnosis and prescription $\to$ status moves to `COMPLETED`.

6. **No-Show and Requeue Handling**:
   - For an absent patient, click **No-Show**. The patient is removed from active line, and all subsequent patients advance up 1 position immediately.
   - For an authorized patient who was delayed in traffic, click **Re-admit & Requeue**, specify target position #1 or #3, and verify the queue recalculates.

7. **Queue Pause and Resume**:
   - In Staff Dashboard, click **Pause Queue**. Department status changes to paused, and an informational alert banner appears on both staff and patient portals.
   - Click **Resume Queue** to restore progression.

8. **Public Live Board**:
   - Open **Live OPD Board** (`public-queue`).
   - Switch between departments (Cardiology, General Medicine, Orthopaedics) to inspect the high-contrast display board with current token and upcoming patients.

---

## 7. Replacing Mock SMS with Production SMS API (Twilio / Fast2SMS)

In `com.smartopd.service.sms.MockSmsGatewayServiceImpl`:
To plug in **Twilio**:
```java
// Add to pom.xml:
// <dependency><groupId>com.twilio.sdk</groupId><artifactId>twilio</artifactId><version>9.14.0</version></dependency>

Twilio.init(ACCOUNT_SID, AUTH_TOKEN);
Message message = Message.creator(
    new PhoneNumber(phoneNumber),
    new PhoneNumber(FROM_NUMBER),
    messageBody
).create();
return message.getSid();
```
To plug in **Fast2SMS** (India DLT):
```java
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://www.fast2sms.com/dev/bulkV2"))
    .header("authorization", FAST2SMS_API_KEY)
    .POST(BodyPublishers.ofString("{\"route\":\"q\",\"message\":\"" + message + "\",\"numbers\":\"" + phoneNumber + "\"}"))
    .build();
```

---

## 8. Summary of Project Deliverables

- [x] Complete React frontend (`frontend/` and `live-app/index.html`).
- [x] Complete Java Spring Boot backend (`backend/`).
- [x] PostgreSQL database schema and seed data (`database/`).
- [x] Dynamic OPD Queue Engine (`com.smartopd.engine.DynamicQueueEngine`).
- [x] Patient portal (Registration, Lookup, Dashboard, Arrival Window).
- [x] Hospital staff dashboard (KPI cards, Operational controls, Delay/Emergency logging).
- [x] Notification module (SMS Gateway abstraction, DB audit log, live SMS alerts).
- [x] Complete REST API documentation and System Architecture diagrams.
- [x] Installation and testing walkthrough.
