# QUIZZICALLY 🧠

A feature-rich, full-stack quiz application designed for serious trivia enthusiasts, researchers, and casual players. Quizzically blends performance analytics with AI-powered insights and a polished user experience.

---

## ✨ Features & UI Components

### 🕹️ Gameplay & Core Features

- [x] **Authentication System:** Secure login and signup with JWT and Google OAuth.
- [x] **Streak System:** Incentivizes daily play with automated streak tracking and visual badges.
- [ ] **Make a Quiz *(Big Feature)*:** Comprehensive custom quiz creation and hosting tool.
  - Supports all question formats: Buzzer, PNB (Pass/No Buzz), and Written rounds.
  - Ability to host a live quiz session for multiple participants.
  - Join via a shareable room code — players enter the code to join and answer in real time.
- [ ] **Question of the Day (QOTD):** Daily AI-powered challenge with step-by-step explanations on how to arrive at the correct answer.
  - 3 questions generated daily across adjustable difficulty levels.
  - Players choose their preferred difficulty before starting.
- [ ] **Most Recent Quiz:** Quick access to the last played set — useful if a player misses a session and wants to catch up or review.
- [ ] **Past Sets:** Historical repository of all previously attempted quizzes. *(Poojan will compile the data pipeline for this.)*

### 📊 Analytics & Data

- [ ] **Performance Graphs:** Detailed visualization of accuracy across difficulty levels, genres (categories), and formats (MCQ, True/False, Written, etc.) — accessible from the user bio/profile page.
- [ ] **QM Dataset Browser:** Dedicated browser for Question Master datasets. Click on any QM to explore their questioning style, topic preferences, and difficulty distribution. *(Accessible from the sidebar.)*
- [ ] **Leaderboards:** Competitive rankings broken down across every genre and category.
- [ ] **Hot Topics Page:** A dedicated page for trending current events and trivia. News feed displayed below the Paintings Carousel on the home screen. *(Sourced from GK Today / current events APIs.)*

### 🎨 UI/UX & Visuals

- [x] **Light / Dark Mode:** Context-aware theme toggle for comfortable viewing in any environment.
- [x] **Paintings Carousel:** A curated showcase of the Top 50 paintings of all time — a touch of art history on the home screen.
- [ ] **Smart Loading Screen:**
  - [ ] **Buffering Animation:** A figure skater–themed loading animation. *(ho jayega)*
  - [ ] **Loading Tips:** Contextual trivia tips and hints displayed during data fetching (e.g., on leaderboard load).
- [x] **User Profiles:** Personalized profile pages with bio, stats, and performance history.

---

## 🏗️ Technical Architecture

- **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Recharts.
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB via Mongoose.
- **State Management:** Context API for Themes and Authentication.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB (Local or Atlas)

### Installation

1. **Clone the project:**
   ```bash
   git clone <your-repo-url>
   ```

2. **Server Configuration:**
   ```bash
   cd server
   npm install
   # Create a .env file with the following:
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_random_secret_string
   NODE_ENV=development
   GOOGLE_CLIENT_ID=your_google_client_id
   npm run dev
   ```

3. **Client Configuration:**
   ```bash
   cd client
   npm install
   # Create a .env file with the following:
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   npm run dev
   ```

---

## 🛠️ Development Roadmap (TODO)

- [ ] Implement Figure Skater animation in `Loader.jsx`.
- [ ] Add contextual trivia tips to loading screens (leaderboard buffering, etc.).
- [ ] Build the AI bridge for the QOTD logic — 3 questions/day with difficulty selection and step-by-step AI explanations.
- [ ] Connect `Performance.jsx` to Recharts using real backend data (difficulty, genre, format breakdown).
- [ ] Finalize QM Dataset filtering logic and add QM Browser to the sidebar nav.
- [ ] Build the Make-a-Quiz flow: question format selection (Buzzer / PNB / Written), room creation, and code-based live join system.
- [ ] Implement Past Sets page — coordinate with Poojan on data compilation and schema.
- [ ] Build Hot Topics page and integrate current events / GK Today news feed below the Paintings Carousel.
- [ ] Set up Leaderboards with per-genre filtering.
- [ ] Implement Cron jobs for daily streak resets and QOTD updates.
