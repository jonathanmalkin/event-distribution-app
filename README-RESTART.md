# Server Management Script

Comprehensive script to manage both frontend (React) and backend (Node.js) servers with advanced troubleshooting capabilities.

## Quick Start

```bash
# Start both servers (default command)
./restart-servers.sh

# Or explicitly
./restart-servers.sh start
```

## Available Commands

| Command | Description |
|---------|-------------|
| `start` | Start both frontend and backend servers (default) |
| `stop` | Stop all running servers |
| `restart` | Stop and restart all servers |
| `status` | Check if servers are running |
| `logs` | Show recent server logs |
| `troubleshoot` | Display diagnostic information |
| `clean` | Clean up old logs and temporary files |
| `help` | Show usage information |

## Features

### 🚀 **Smart Startup**
- **Dependency Management**: Automatically installs missing npm packages
- **Port Cleanup**: Kills any processes blocking required ports (3000, 3001)
- **Build Management**: Compiles TypeScript backend when needed
- **Health Checks**: Verifies servers are responding before completion

### 🔄 **Robust Process Management**
- **Graceful Shutdown**: SIGTERM followed by SIGKILL if needed
- **Background Execution**: Servers run in background with proper logging
- **PID Tracking**: Maintains process IDs for reliable shutdown
- **Port Monitoring**: Intelligent port conflict resolution

### 🛠 **Advanced Troubleshooting**
- **System Information**: Node.js version, OS details, memory usage
- **Port Analysis**: Shows what's using each port
- **Log Analysis**: Recent error logs from both servers
- **Disk Space Check**: Available storage monitoring

### 📊 **Comprehensive Logging**
- **Separate Logs**: `logs/backend.log` and `logs/frontend.log`
- **Auto Cleanup**: Removes logs older than 7 days
- **PID Files**: Process tracking for reliable management
- **Colored Output**: Easy-to-read status messages

## Usage Examples

### Basic Operations
```bash
# Start servers (recommended)
./restart-servers.sh

# Check if running
./restart-servers.sh status

# Stop everything
./restart-servers.sh stop
```

### Development Workflow
```bash
# After making backend changes
./restart-servers.sh restart

# Check recent logs
./restart-servers.sh logs

# If having issues
./restart-servers.sh troubleshoot
```

### Maintenance
```bash
# Clean up old files
./restart-servers.sh clean

# Full diagnostic check
./restart-servers.sh troubleshoot
```

## Configuration

The script uses these default settings:

```bash
BACKEND_PORT=3001    # Node.js/Express server
FRONTEND_PORT=3000   # React development server
MAX_RETRIES=3        # Startup retry attempts
RETRY_DELAY=2        # Seconds between retries
```

## Troubleshooting Common Issues

### Port Already in Use
```bash
# The script automatically handles this, but you can also:
./restart-servers.sh stop
# Wait a moment, then:
./restart-servers.sh start
```

### Frontend Won't Start
```bash
# Check for compilation errors:
./restart-servers.sh logs

# Clean and restart:
./restart-servers.sh clean
./restart-servers.sh restart
```

### Backend Build Failures
```bash
# Check TypeScript errors:
cd backend
npm run build

# View detailed logs:
./restart-servers.sh logs
```

### Health Check Failures
```bash
# Get detailed diagnostics:
./restart-servers.sh troubleshoot

# Check what's using the ports:
lsof -i:3000
lsof -i:3001
```

## File Structure

```
event-distribution-app/
├── restart-servers.sh     # Main script
├── logs/                  # Created automatically
│   ├── backend.log       # Backend server logs
│   ├── frontend.log      # Frontend server logs
│   ├── backend.pid       # Backend process ID
│   └── frontend.pid      # Frontend process ID
├── backend/              # Node.js API server
└── frontend/             # React application
```

## Requirements

- **Unix-like OS**: macOS, Linux (not Windows)
- **Node.js**: Version 14+ recommended
- **npm**: Package manager
- **curl**: For health checks (usually pre-installed)
- **lsof**: For port management (usually pre-installed)

## Signal Handling

The script handles interruption gracefully:
- `Ctrl+C` (SIGINT): Stops all servers and exits cleanly
- `SIGTERM`: Graceful shutdown of all processes

## Error Codes

- `0`: Success
- `1`: General error (startup failure, missing dependencies, etc.)

## Logging

All output is color-coded for easy reading:
- 🔵 **INFO**: General information
- 🟢 **SUCCESS**: Successful operations
- 🟡 **WARNING**: Non-critical issues
- 🔴 **ERROR**: Critical failures

## Performance

- **Startup Time**: ~15-20 seconds for both servers
- **Memory Usage**: ~200MB backend, ~300MB frontend (development)
- **Log Retention**: 7 days automatic cleanup