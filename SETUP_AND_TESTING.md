# Event Distribution App - Setup and Testing Guide

## 🚀 Quick Start (For Testing UI Only)

If you just want to test the user interface without full functionality:

1. **Start Backend** (will show database errors, but UI will work):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm start
   ```

3. **Open**: http://localhost:3000

**What works without database:**
- ✅ Complete UI flow (form → AI generation → preview)
- ✅ Frontend validation and error handling
- ✅ Step-by-step workflow
- ❌ Venue creation/saving (will show errors)
- ❌ Event saving (will show errors)
- ❌ AI theme generation (needs OpenAI key)

## 🗄️ Full Setup (For Complete Functionality)

### Step 1: Database Setup

1. **Install PostgreSQL** (if not installed):
   ```bash
   # macOS with Homebrew
   brew install postgresql
   brew services start postgresql
   
   # Or use PostgreSQL.app: https://postgresapp.com/
   ```

2. **Create Database**:
   ```bash
   psql postgres
   CREATE DATABASE event_distribution;
   \q
   ```

3. **Initialize Schema**:
   ```bash
   cd backend
   psql -d event_distribution -f src/database/init-db.sql
   ```

### Step 2: Environment Configuration

1. **Copy environment file**:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Configure .env** (edit the file):
   ```env
   # Database (update if needed)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=event_distribution
   DB_USER=postgres
   DB_PASSWORD=your_postgres_password

   # OpenAI (required for AI features)
   OPENAI_API_KEY=your_actual_openai_key_here
   ```

### Step 3: Start Services

1. **Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm start
   ```

## 🧪 Testing & Verification

### Test 1: Basic Server Health
```bash
cd backend
node src/test-without-db.js
```
**Expected**: Server structure verified, OpenAI key status shown

### Test 2: Database & API Endpoints
```bash
cd backend
node src/test-endpoints.js
```
**Expected**: Venues and events creation/retrieval working

### Test 3: Frontend Compilation
```bash
cd frontend
npm run build
```
**Expected**: Successful build with only minor ESLint warnings

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch venues"
**Cause**: Database not connected
**Solution**: 
1. Start PostgreSQL: `brew services start postgresql`
2. Create database: `psql postgres -c "CREATE DATABASE event_distribution;"`
3. Run schema: `psql -d event_distribution -f backend/src/database/init-db.sql`

### Issue: "Failed to generate themes"
**Cause**: OpenAI API key not configured
**Solution**: 
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Add to `backend/.env`: `OPENAI_API_KEY=sk-your-real-key-here`
3. Restart backend server

### Issue: TypeScript compilation errors
**Cause**: Type mismatches after recent changes
**Solution**: 
```bash
cd frontend
npm run build
```
If errors persist, check the specific error messages in the terminal.

### Issue: "venue_id is required"
**Cause**: Form validation requires venue selection
**Solution**: This is expected - select a venue from dropdown or create a new one

### Issue: Frontend shows "Loading..." indefinitely
**Cause**: Backend API calls failing
**Solution**: 
1. Check backend is running on port 3001
2. Check browser network tab for specific API errors
3. Verify CORS settings allow localhost:3000

## 📋 Feature Checklist

### ✅ Completed & Working
- [x] TypeScript compilation (both frontend and backend)
- [x] Server startup and health endpoints
- [x] Simplified venue model (name, address, city, state, zip only)
- [x] 5-theme AI generation workflow
- [x] Public display shows only city, state
- [x] Configurable AI prompts via JSON file
- [x] Complete UI workflow (3 steps)
- [x] Venue dropdown and creation form
- [x] Theme selection interface
- [x] Event preview with privacy information

### 🚧 Requires Database Setup
- [ ] Venue creation and storage
- [ ] Event creation and storage
- [ ] Event-venue relationships
- [ ] RSVP system

### 🚧 Requires OpenAI API Key
- [ ] AI theme generation
- [ ] AI image generation
- [ ] AI chat for theme refinement

### 🚧 Future Implementation
- [ ] Platform distribution (Facebook, Instagram, etc.)
- [ ] Email system for location reveal
- [ ] Newsletter integration

## 🎯 Testing Scenarios

### Scenario 1: UI Flow Testing (No Database)
1. Start servers (ignore database errors)
2. Open http://localhost:3000
3. Fill out event form → should show validation
4. Try theme generation → should show API error gracefully
5. Navigate through all 3 steps → should work smoothly

### Scenario 2: Full Functionality Testing (With Database)
1. Set up database and OpenAI key
2. Create new venue → should save successfully
3. Create event with AI themes → should generate 5 options
4. Select theme → should generate image
5. Preview and publish → should save event

### Scenario 3: Error Handling Testing
1. Try invalid dates → should show validation errors
2. Skip venue selection → should prevent form submission
3. Test with invalid OpenAI key → should show graceful error

## 🔧 Development Notes

- **Port Configuration**: Backend runs on 3001, Frontend on 3000
- **Database**: PostgreSQL with simplified schema
- **AI Integration**: OpenAI GPT-4 for themes, DALL-E 3 for images
- **Privacy Model**: City/State public, full address after RSVP only
- **Form Validation**: Required venue selection, proper error handling

## 📞 Support

If you encounter issues not covered here:
1. Check the browser console for JavaScript errors
2. Check the backend terminal for server errors
3. Verify all environment variables are properly set
4. Ensure all services (PostgreSQL, backend, frontend) are running