# QUIZZICALLY 🧠

A feature-rich, full-stack quiz application designed for serious trivia enthusiasts, researchers, and casual players. Quizzically blends performance analytics with AI-powered insights and a polished user experience.

---

## ✨ Features & UI Components

### 🕹️ Gameplay & Core Features
- [x] **Authentication System:** Secure login and signup with JWT.
- [x] **Streak System:** Incentivizes daily play with automated streak tracking and visual badges.
- [ ] **Make a Quiz:** Custom quiz creation tool based on user preferences.
- [ ] **Question of the Day (QOTD):** Daily challenge powered by AI to explain *how* to arrive at the correct answer (API Integration).
- [ ] **Most Recent Quiz:** Quick access to the last played set to resume or review.
- [ ] **Past Sets:** Historical repository of all previously attempted quizzes.

### 📊 Analytics & Data
- [ ] **Performance Graphs:** Detailed visualization of accuracy across difficulty levels, genres (categories), and formats (MCQ, True/False, etc.).
- [ ] **QM Dataset:** Specialized browser for Question Master datasets—analyze the unique questioning styles of different trivia creators.
- [ ] **Leaderboards:** Competitive rankings across every category and difficulty level.
- [ ] **Hot Topics:** A dedicated page for trending current events and trivia topics.

### 🎨 UI/UX & Visuals
- [x] **Light / Dark Mode:** Context-aware theme toggle for comfortable viewing.
- [x] **Paintings Carousel:** A curated showcase of the Top 50 paintings of all time for a touch of art history.
- [ ] **Smart Loading Screen:**
    - [ ] **Buffering Animation:** Figure skater themed loading animation.
    - [ ] **Loading Tips:** Contextual trivia tips displayed during data fetching.
- [x] **User Profiles:** Personalized profile pages with bio and performance stats.

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
   # Create a .env file:
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_random_secret_string
   NODE_ENV = development
   GOOGLE_CLIENT_ID = your_google_client_id
   npm run dev
   ```

3. **Client Configuration:**
   ```bash
   cd client
   npm install
   # Create a .env file:
   GOOGLE_CLIENT_ID = your_google_client_id
   npm run dev
   ```

---

## 🛠️ Development Roadmap (TODO)
- [ ] Implement Figure Skater animation in `Loader.jsx`.
- [ ] Build the AI bridge for the "Question of the Day" logic.
- [ ] Connect `Performance.jsx` to Recharts using real backend data.
- [ ] Finalize the QM Dataset filtering logic.
- [ ] Implement Cron jobs for daily streak resets and QOTD updates.
