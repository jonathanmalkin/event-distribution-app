# Server Restart Guide

## **Problem Summary**

The Event Distribution backend server frequently encountered restart issues:

1. **TypeScript compilation errors** - New code often had type issues
2. **Port conflicts** - Previous processes not properly killed (port 3001)
3. **Environment loading** - .env file access problems
4. **Process management** - Background servers hard to track/kill

## **Streamlined Solution**

### **Quick Restart (Recommended)**
```bash
cd backend && ./restart-server.sh
```

This script automatically:
- ✅ Kills existing processes on port 3001
- ✅ Checks TypeScript compilation first (fast feedback)
- ✅ Validates environment files
- ✅ Installs dependencies if needed
- ✅ Starts server and waits for health check
- ✅ Provides clear success/failure feedback

### **Manual Steps (If Needed)**

1. **Kill existing processes:**
   ```bash
   lsof -ti:3001 | xargs kill -9
   ```

2. **Fix TypeScript errors:**
   ```bash
   npx tsc --noEmit --skipLibCheck
   ```

3. **Check environment:**
   ```bash
   ls -la .env  # Should exist with your API keys
   ```

4. **Start server:**
   ```bash
   npm run dev
   ```

5. **Verify health:**
   ```bash
   curl http://localhost:3001/health
   ```

## **Key Improvements**

### **Health Check Endpoint**
- Added `/health` endpoint for server status verification
- Returns: `{status: 'OK', timestamp: '...', port: 3001}`

### **Consistent Port Configuration**
- Server now defaults to port 3001 (was 5000)
- Matches frontend expectations and documentation

### **TypeScript Error Prevention**
- Script checks compilation before starting
- Prevents runtime crashes from type errors

### **Process Management**
- Script properly kills old processes
- Tracks new process PID for monitoring

## **Usage Examples**

### **Development Workflow**
```bash
# Make code changes
vim src/services/PlatformManager.ts

# Restart server (handles all issues automatically)
./restart-server.sh

# Test changes
curl -X POST http://localhost:3001/api/distribution/import
```

### **Troubleshooting**
```bash
# Check if server is running
curl http://localhost:3001/health

# Check what's using port 3001
lsof -i:3001

# Force kill all Node processes (nuclear option)
pkill -f node
```

## **Common Error Patterns**

### **TypeScript Errors**
**Problem:** `TSError: ⨯ Unable to compile TypeScript`
**Solution:** Fix type errors first, then restart

### **Port Already in Use**
**Problem:** `EADDRINUSE: address already in use :::3001`
**Solution:** Script kills existing processes automatically

### **Environment Issues**
**Problem:** `Eventbrite credentials not configured`
**Solution:** Ensure `.env` file exists with proper values

## **Benefits of New Approach**

- **Faster restarts**: 10-15 seconds vs 2-3 minutes
- **Fewer failures**: Automatic error checking
- **Better feedback**: Clear success/error messages
- **Consistent results**: Same process every time
- **Less manual work**: One command handles everything

## **Future Enhancements**

Consider adding:
- Docker containerization for even more consistency
- Hot reload for certain file types
- Automated test running on restart
- Health check monitoring
- Log aggregation for debugging