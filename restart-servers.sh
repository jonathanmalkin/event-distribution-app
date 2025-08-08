#!/bin/bash

# Event Distribution App - Comprehensive Server Restart Script
# Handles both frontend (React) and backend (Node.js) with troubleshooting

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
MAX_RETRIES=3
RETRY_DELAY=2
LOG_DIR="logs"
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create log directory
create_log_dir() {
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        log_info "Created log directory: $LOG_DIR"
    fi
}

# Check if running in correct directory
check_project_structure() {
    if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Project structure not found. Please run from project root directory."
        log_info "Expected structure:"
        log_info "  - $BACKEND_DIR/"
        log_info "  - $FRONTEND_DIR/"
        exit 1
    fi
}

# Kill processes on specific ports
kill_port_processes() {
    local port=$1
    local service_name=$2
    
    log_info "Checking for processes on port $port ($service_name)..."
    
    # Find processes using the port
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        log_info "No processes found on port $port"
        return 0
    fi
    
    log_warning "Found processes on port $port: $pids"
    
    # Try graceful termination first
    echo "$pids" | xargs kill -TERM 2>/dev/null || true
    sleep 2
    
    # Check if processes are still running
    local remaining_pids=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ ! -z "$remaining_pids" ]; then
        log_warning "Processes still running. Force killing..."
        echo "$remaining_pids" | xargs kill -9 2>/dev/null || true
        sleep 1
        
        # Final check
        local final_pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$final_pids" ]; then
            log_error "Failed to kill processes on port $port"
            return 1
        fi
    fi
    
    log_success "Successfully cleared port $port"
}

# Check if dependencies are installed
check_dependencies() {
    local dir=$1
    local service_name=$2
    
    log_info "Checking dependencies for $service_name..."
    
    if [ ! -d "$dir/node_modules" ]; then
        log_warning "node_modules not found for $service_name. Installing dependencies..."
        cd "$dir"
        npm install
        cd ..
        log_success "Dependencies installed for $service_name"
    else
        log_info "Dependencies found for $service_name"
    fi
}

# Build backend if needed
build_backend() {
    log_info "Building backend..."
    cd "$BACKEND_DIR"
    
    # Check if TypeScript is compiled
    if [ ! -d "dist" ] || [ $(find src -name "*.ts" -newer dist 2>/dev/null | wc -l) -gt 0 ]; then
        log_info "TypeScript files need compilation..."
        npm run build
        if [ $? -ne 0 ]; then
            log_error "Backend build failed"
            cd ..
            return 1
        fi
        log_success "Backend built successfully"
    else
        log_info "Backend is up to date"
    fi
    
    cd ..
}

# Start backend server
start_backend() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log_info "Starting backend server (attempt $((retry_count + 1))/$MAX_RETRIES)..."
        
        cd "$BACKEND_DIR"
        
        # Start backend in background
        nohup npm start > "../$LOG_DIR/backend.log" 2>&1 &
        local backend_pid=$!
        echo $backend_pid > "../$LOG_DIR/backend.pid"
        
        cd ..
        
        # Wait for backend to start
        sleep 5
        
        # Check if backend is responding
        if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
            log_success "Backend started successfully on port $BACKEND_PORT (PID: $backend_pid)"
            return 0
        else
            log_warning "Backend not responding, checking logs..."
            tail -n 10 "$LOG_DIR/backend.log" | sed 's/^/  /'
            
            # Kill the failed process
            kill $backend_pid 2>/dev/null || true
            rm -f "$LOG_DIR/backend.pid"
            
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                log_warning "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    log_error "Failed to start backend after $MAX_RETRIES attempts"
    return 1
}

# Start frontend server
start_frontend() {
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        log_info "Starting frontend server (attempt $((retry_count + 1))/$MAX_RETRIES)..."
        
        cd "$FRONTEND_DIR"
        
        # Set environment variables for React
        export BROWSER=none  # Don't auto-open browser
        export PORT=$FRONTEND_PORT
        
        # Start frontend in background
        nohup npm start > "../$LOG_DIR/frontend.log" 2>&1 &
        local frontend_pid=$!
        echo $frontend_pid > "../$LOG_DIR/frontend.pid"
        
        cd ..
        
        # Wait for frontend to compile and start
        log_info "Waiting for frontend to compile..."
        sleep 15
        
        # Check if frontend is responding
        if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
            log_success "Frontend started successfully on port $FRONTEND_PORT (PID: $frontend_pid)"
            return 0
        else
            log_warning "Frontend not responding, checking logs..."
            tail -n 10 "$LOG_DIR/frontend.log" | sed 's/^/  /'
            
            # Kill the failed process
            kill $frontend_pid 2>/dev/null || true
            rm -f "$LOG_DIR/frontend.pid"
            
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $MAX_RETRIES ]; then
                log_warning "Retrying in $RETRY_DELAY seconds..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    log_error "Failed to start frontend after $MAX_RETRIES attempts"
    return 1
}

# Health check for both servers
health_check() {
    log_info "Performing health checks..."
    
    local backend_status="❌"
    local frontend_status="❌"
    
    # Check backend
    if curl -s "http://localhost:$BACKEND_PORT/health" > /dev/null 2>&1; then
        backend_status="✅"
    fi
    
    # Check frontend
    if curl -s "http://localhost:$FRONTEND_PORT" > /dev/null 2>&1; then
        frontend_status="✅"
    fi
    
    echo ""
    echo "=== Server Status ==="
    echo "Backend (port $BACKEND_PORT):  $backend_status"
    echo "Frontend (port $FRONTEND_PORT): $frontend_status"
    echo ""
    
    if [ "$backend_status" = "✅" ] && [ "$frontend_status" = "✅" ]; then
        log_success "All servers are running successfully!"
        echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
        echo "🔧 Backend:  http://localhost:$BACKEND_PORT"
        return 0
    else
        log_error "One or more servers failed to start properly"
        return 1
    fi
}

# Clean up old log files
cleanup_logs() {
    if [ -d "$LOG_DIR" ]; then
        # Keep only last 5 log files
        find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    fi
}

# Stop servers function
stop_servers() {
    log_info "Stopping servers..."
    
    # Stop backend
    if [ -f "$LOG_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOG_DIR/backend.pid")
        if kill -0 $backend_pid 2>/dev/null; then
            kill $backend_pid
            log_info "Backend stopped (PID: $backend_pid)"
        fi
        rm -f "$LOG_DIR/backend.pid"
    fi
    
    # Stop frontend
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
        if kill -0 $frontend_pid 2>/dev/null; then
            kill $frontend_pid
            log_info "Frontend stopped (PID: $frontend_pid)"
        fi
        rm -f "$LOG_DIR/frontend.pid"
    fi
    
    # Clean up ports
    kill_port_processes $BACKEND_PORT "Backend"
    kill_port_processes $FRONTEND_PORT "Frontend"
}

# Troubleshooting function
troubleshoot() {
    log_info "Running troubleshooting checks..."
    
    echo ""
    echo "=== System Information ==="
    echo "Node.js version: $(node --version 2>/dev/null || echo 'Not installed')"
    echo "npm version: $(npm --version 2>/dev/null || echo 'Not installed')"
    echo "Operating System: $(uname -s)"
    echo ""
    
    echo "=== Port Status ==="
    echo "Backend port $BACKEND_PORT:"
    lsof -i:$BACKEND_PORT 2>/dev/null || echo "  No processes found"
    echo "Frontend port $FRONTEND_PORT:"
    lsof -i:$FRONTEND_PORT 2>/dev/null || echo "  No processes found"
    echo ""
    
    echo "=== Recent Logs ==="
    if [ -f "$LOG_DIR/backend.log" ]; then
        echo "Backend logs (last 5 lines):"
        tail -n 5 "$LOG_DIR/backend.log" | sed 's/^/  /'
    fi
    
    if [ -f "$LOG_DIR/frontend.log" ]; then
        echo "Frontend logs (last 5 lines):"
        tail -n 5 "$LOG_DIR/frontend.log" | sed 's/^/  /'
    fi
    echo ""
    
    echo "=== Disk Space ==="
    df -h . | tail -n 1 | awk '{print "Available space: " $4 " (" $5 " used)"}'
    echo ""
    
    echo "=== Memory Usage ==="
    if command -v free > /dev/null 2>&1; then
        free -h | head -n 2
    elif command -v vm_stat > /dev/null 2>&1; then
        # macOS
        echo "Memory info available via: vm_stat"
    fi
}

# Usage information
show_usage() {
    echo "Event Distribution App - Server Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       Start both frontend and backend servers (default)"
    echo "  stop        Stop all servers"
    echo "  restart     Stop and restart all servers"
    echo "  status      Check server status"
    echo "  logs        Show recent logs"
    echo "  troubleshoot Show diagnostic information"
    echo "  clean       Clean up old logs and temporary files"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Start servers"
    echo "  $0 restart            # Restart all servers"
    echo "  $0 status             # Check if servers are running"
    echo "  $0 logs               # Show recent logs"
}

# Show logs
show_logs() {
    echo "=== Backend Logs ==="
    if [ -f "$LOG_DIR/backend.log" ]; then
        tail -n 20 "$LOG_DIR/backend.log"
    else
        echo "No backend logs found"
    fi
    
    echo ""
    echo "=== Frontend Logs ==="
    if [ -f "$LOG_DIR/frontend.log" ]; then
        tail -n 20 "$LOG_DIR/frontend.log"
    else
        echo "No frontend logs found"
    fi
}

# Clean up function
clean_up() {
    log_info "Cleaning up old logs and temporary files..."
    
    # Clean old logs
    cleanup_logs
    
    # Clean npm cache if needed
    if [ -d "$BACKEND_DIR/node_modules/.cache" ]; then
        rm -rf "$BACKEND_DIR/node_modules/.cache"
    fi
    
    if [ -d "$FRONTEND_DIR/node_modules/.cache" ]; then
        rm -rf "$FRONTEND_DIR/node_modules/.cache"
    fi
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    local command=${1:-start}
    
    echo "Event Distribution App - Server Manager"
    echo "======================================="
    echo ""
    
    case $command in
        "start")
            check_project_structure
            create_log_dir
            cleanup_logs
            
            # Stop any existing servers
            stop_servers
            
            # Check and install dependencies
            check_dependencies "$BACKEND_DIR" "Backend"
            check_dependencies "$FRONTEND_DIR" "Frontend"
            
            # Build backend
            if ! build_backend; then
                exit 1
            fi
            
            # Start servers
            if start_backend && start_frontend; then
                health_check
                echo ""
                echo "🎉 Servers started successfully!"
                echo "📝 Logs available in: $LOG_DIR/"
                echo "🛑 To stop servers: $0 stop"
            else
                log_error "Failed to start servers. Run '$0 troubleshoot' for more info."
                exit 1
            fi
            ;;
        "stop")
            stop_servers
            log_success "All servers stopped"
            ;;
        "restart")
            log_info "Restarting servers..."
            stop_servers
            sleep 2
            exec "$0" start
            ;;
        "status")
            health_check
            ;;
        "logs")
            show_logs
            ;;
        "troubleshoot")
            troubleshoot
            ;;
        "clean")
            clean_up
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

# Trap signals for clean shutdown
trap 'stop_servers; exit 0' INT TERM

# Run main function
main "$@"