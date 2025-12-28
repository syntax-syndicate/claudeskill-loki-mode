#!/bin/bash
#===============================================================================
# Loki Mode - Autonomous Runner
# Single script that handles prerequisites, setup, and autonomous execution
#
# Usage:
#   ./autonomy/run.sh [PRD_PATH]
#   ./autonomy/run.sh ./docs/requirements.md
#   ./autonomy/run.sh                          # Interactive mode
#
# Environment Variables:
#   LOKI_MAX_RETRIES    - Max retry attempts (default: 50)
#   LOKI_BASE_WAIT      - Base wait time in seconds (default: 60)
#   LOKI_MAX_WAIT       - Max wait time in seconds (default: 3600)
#   LOKI_SKIP_PREREQS   - Skip prerequisite checks (default: false)
#   LOKI_VIBE_KANBAN    - Enable Vibe Kanban UI (default: true)
#   LOKI_KANBAN_PORT    - Vibe Kanban port (default: 57374)
#===============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
MAX_RETRIES=${LOKI_MAX_RETRIES:-50}
BASE_WAIT=${LOKI_BASE_WAIT:-60}
MAX_WAIT=${LOKI_MAX_WAIT:-3600}
SKIP_PREREQS=${LOKI_SKIP_PREREQS:-false}
VIBE_KANBAN=${LOKI_VIBE_KANBAN:-true}
KANBAN_PORT=${LOKI_KANBAN_PORT:-57374}
STATUS_MONITOR_PID=""
KANBAN_PID=""
KANBAN_SYNC_PID=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

#===============================================================================
# Logging Functions
#===============================================================================

log_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $*"; }

#===============================================================================
# Prerequisites Check
#===============================================================================

check_prerequisites() {
    log_header "Checking Prerequisites"

    local missing=()

    # Check Claude Code CLI
    log_step "Checking Claude Code CLI..."
    if command -v claude &> /dev/null; then
        local version=$(claude --version 2>/dev/null | head -1 || echo "unknown")
        log_info "Claude Code CLI: $version"
    else
        missing+=("claude")
        log_error "Claude Code CLI not found"
        log_info "Install: https://claude.ai/code or npm install -g @anthropic-ai/claude-code"
    fi

    # Check Python 3
    log_step "Checking Python 3..."
    if command -v python3 &> /dev/null; then
        local py_version=$(python3 --version 2>&1)
        log_info "Python: $py_version"
    else
        missing+=("python3")
        log_error "Python 3 not found"
    fi

    # Check Git
    log_step "Checking Git..."
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        log_info "Git: $git_version"
    else
        missing+=("git")
        log_error "Git not found"
    fi

    # Check Node.js (optional but recommended)
    log_step "Checking Node.js (optional)..."
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_info "Node.js: $node_version"
    else
        log_warn "Node.js not found (optional, needed for some builds)"
    fi

    # Check npm (optional)
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_info "npm: $npm_version"
    fi

    # Check curl (for web fetches)
    log_step "Checking curl..."
    if command -v curl &> /dev/null; then
        log_info "curl: available"
    else
        missing+=("curl")
        log_error "curl not found"
    fi

    # Check jq (optional but helpful)
    log_step "Checking jq (optional)..."
    if command -v jq &> /dev/null; then
        log_info "jq: available"
    else
        log_warn "jq not found (optional, for JSON parsing)"
    fi

    # Summary
    echo ""
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install the missing tools and try again."
        return 1
    else
        log_info "All required prerequisites are installed!"
        return 0
    fi
}

#===============================================================================
# Skill Installation Check
#===============================================================================

check_skill_installed() {
    log_header "Checking Loki Mode Skill"

    local skill_locations=(
        "$HOME/.claude/skills/loki-mode/SKILL.md"
        ".claude/skills/loki-mode/SKILL.md"
        "$PROJECT_DIR/SKILL.md"
    )

    for loc in "${skill_locations[@]}"; do
        if [ -f "$loc" ]; then
            log_info "Skill found: $loc"
            return 0
        fi
    done

    log_warn "Loki Mode skill not found in standard locations"
    log_info "The skill will be used from: $PROJECT_DIR/SKILL.md"

    if [ -f "$PROJECT_DIR/SKILL.md" ]; then
        log_info "Using skill from project directory"
        return 0
    else
        log_error "SKILL.md not found!"
        return 1
    fi
}

#===============================================================================
# Initialize Loki Directory
#===============================================================================

init_loki_dir() {
    log_header "Initializing Loki Mode Directory"

    mkdir -p .loki/{state,queue,messages,logs,config,prompts,artifacts,scripts}
    mkdir -p .loki/queue
    mkdir -p .loki/state/checkpoints
    mkdir -p .loki/artifacts/{releases,reports,backups}

    # Initialize queue files if they don't exist
    for queue in pending in-progress completed failed dead-letter; do
        if [ ! -f ".loki/queue/${queue}.json" ]; then
            echo "[]" > ".loki/queue/${queue}.json"
        fi
    done

    # Initialize orchestrator state if it doesn't exist
    if [ ! -f ".loki/state/orchestrator.json" ]; then
        cat > ".loki/state/orchestrator.json" << EOF
{
    "version": "$(cat "$PROJECT_DIR/VERSION" 2>/dev/null || echo "2.2.0")",
    "currentPhase": "BOOTSTRAP",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "agents": {},
    "metrics": {
        "tasksCompleted": 0,
        "tasksFailed": 0,
        "retries": 0
    }
}
EOF
    fi

    log_info "Loki directory initialized: .loki/"
}

#===============================================================================
# Task Status Monitor
#===============================================================================

update_status_file() {
    # Create a human-readable status file
    local status_file=".loki/STATUS.txt"

    # Get current phase
    local current_phase="UNKNOWN"
    if [ -f ".loki/state/orchestrator.json" ]; then
        current_phase=$(python3 -c "import json; print(json.load(open('.loki/state/orchestrator.json')).get('currentPhase', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
    fi

    # Count tasks in each queue
    local pending=0 in_progress=0 completed=0 failed=0
    [ -f ".loki/queue/pending.json" ] && pending=$(python3 -c "import json; print(len(json.load(open('.loki/queue/pending.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/in-progress.json" ] && in_progress=$(python3 -c "import json; print(len(json.load(open('.loki/queue/in-progress.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/completed.json" ] && completed=$(python3 -c "import json; print(len(json.load(open('.loki/queue/completed.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/failed.json" ] && failed=$(python3 -c "import json; print(len(json.load(open('.loki/queue/failed.json'))))" 2>/dev/null || echo "0")

    cat > "$status_file" << EOF
╔════════════════════════════════════════════════════════════════╗
║                    LOKI MODE STATUS                            ║
╚════════════════════════════════════════════════════════════════╝

Updated: $(date)

Phase: $current_phase

Tasks:
  ├─ Pending:     $pending
  ├─ In Progress: $in_progress
  ├─ Completed:   $completed
  └─ Failed:      $failed

Monitor: watch -n 2 cat .loki/STATUS.txt
EOF
}

start_status_monitor() {
    log_step "Starting status monitor..."

    # Initial update
    update_status_file

    # Background update loop
    (
        while true; do
            update_status_file
            sleep 5
        done
    ) &
    STATUS_MONITOR_PID=$!

    log_info "Status monitor started"
    log_info "Monitor progress: ${CYAN}watch -n 2 cat .loki/STATUS.txt${NC}"
}

stop_status_monitor() {
    if [ -n "$STATUS_MONITOR_PID" ]; then
        kill "$STATUS_MONITOR_PID" 2>/dev/null || true
        wait "$STATUS_MONITOR_PID" 2>/dev/null || true
    fi
}

#===============================================================================
# Vibe Kanban Integration
#===============================================================================

export_tasks_to_kanban() {
    # Export Loki tasks to Vibe Kanban format
    local export_dir=".loki/kanban"
    mkdir -p "$export_dir"

    python3 -u << 'PYTHON_EXPORT'
import json
import os
from datetime import datetime

loki_dir = ".loki"
export_dir = ".loki/kanban"

def get_phase():
    try:
        with open(f"{loki_dir}/state/orchestrator.json") as f:
            return json.load(f).get("currentPhase", "UNKNOWN")
    except:
        return "UNKNOWN"

def export_queue(queue_file, status):
    try:
        with open(queue_file) as f:
            content = f.read().strip()
            if not content or content == "[]":
                return []
            tasks = json.loads(content)
            if isinstance(tasks, dict):
                tasks = tasks.get("tasks", [])
    except:
        return []

    exported = []
    phase = get_phase()

    for task in tasks:
        task_id = task.get("id", "unknown")
        payload = task.get("payload", {})
        agent_type = task.get("type", "general")

        # Map status
        status_map = {
            "pending": "todo",
            "in-progress": "doing",
            "completed": "done",
            "failed": "blocked",
            "dead-letter": "blocked"
        }
        vibe_status = status_map.get(status, "todo")

        # Build title
        action = payload.get("action", "") if isinstance(payload, dict) else ""
        title = f"[{agent_type}] {action}" if action else f"[{agent_type}] Task"

        # Build description
        if isinstance(payload, dict):
            desc = payload.get("description", json.dumps(payload, indent=2))
        else:
            desc = str(payload)

        vibe_task = {
            "id": f"loki-{task_id}",
            "title": title[:80],
            "description": desc[:500],
            "status": vibe_status,
            "agent": task.get("claimedBy", "unassigned"),
            "tags": [agent_type, f"phase-{phase.lower()}", f"priority-{task.get('priority', 5)}"],
            "createdAt": task.get("createdAt", datetime.utcnow().isoformat() + "Z"),
            "metadata": {
                "lokiId": task_id,
                "lokiPhase": phase,
                "retries": task.get("retries", 0),
                "lastError": task.get("lastError")
            }
        }

        # Write individual task file
        with open(f"{export_dir}/{task_id}.json", "w") as out:
            json.dump(vibe_task, out, indent=2)
        exported.append(task_id)

    return exported

# Export all queues
all_exported = []
for queue in ["pending", "in-progress", "completed", "failed", "dead-letter"]:
    queue_file = f"{loki_dir}/queue/{queue}.json"
    if os.path.exists(queue_file):
        all_exported.extend(export_queue(queue_file, queue))

# Write summary
summary = {
    "exportedAt": datetime.utcnow().isoformat() + "Z",
    "phase": get_phase(),
    "taskCount": len(all_exported),
    "tasks": all_exported
}
with open(f"{export_dir}/_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

print(f"EXPORTED:{len(all_exported)}")
PYTHON_EXPORT
}

start_kanban_server() {
    log_header "Starting Vibe Kanban Dashboard"

    # Check if npx is available
    if ! command -v npx &> /dev/null; then
        log_warn "npx not found - Vibe Kanban UI disabled"
        log_info "Install Node.js to enable: brew install node"
        return 1
    fi

    # Check if port is already in use
    if lsof -i :$KANBAN_PORT &>/dev/null; then
        log_info "Port $KANBAN_PORT already in use - Kanban may already be running"
        log_info "Dashboard: ${CYAN}http://127.0.0.1:$KANBAN_PORT${NC}"
        return 0
    fi

    # Create kanban data directory
    mkdir -p .loki/kanban

    # Start Vibe Kanban in background
    log_step "Launching Vibe Kanban server..."

    # Try to start vibe-kanban
    local kanban_log="$(pwd)/.loki/logs/kanban.log"
    touch "$kanban_log"
    (
        cd .loki/kanban
        npx vibe-kanban --port $KANBAN_PORT 2>&1 | while read line; do
            echo "[kanban] $line" >> "$kanban_log"
        done
    ) &
    KANBAN_PID=$!

    # Wait for server to start
    sleep 3

    if kill -0 $KANBAN_PID 2>/dev/null; then
        log_info "Vibe Kanban started (PID: $KANBAN_PID)"
        log_info "Dashboard: ${CYAN}http://127.0.0.1:$KANBAN_PORT${NC}"
        return 0
    else
        log_warn "Vibe Kanban failed to start - falling back to STATUS.txt"
        KANBAN_PID=""
        return 1
    fi
}

start_kanban_sync() {
    log_step "Starting task sync..."

    # Initial export
    export_tasks_to_kanban

    # Background sync loop
    (
        while true; do
            sleep 5
            export_tasks_to_kanban 2>/dev/null || true
        done
    ) &
    KANBAN_SYNC_PID=$!

    log_info "Task sync started (every 5s)"
}

stop_kanban() {
    if [ -n "$KANBAN_SYNC_PID" ]; then
        kill "$KANBAN_SYNC_PID" 2>/dev/null || true
        wait "$KANBAN_SYNC_PID" 2>/dev/null || true
    fi
    if [ -n "$KANBAN_PID" ]; then
        kill "$KANBAN_PID" 2>/dev/null || true
        wait "$KANBAN_PID" 2>/dev/null || true
    fi
}

#===============================================================================
# Calculate Exponential Backoff
#===============================================================================

calculate_wait() {
    local retry="$1"
    local wait_time=$((BASE_WAIT * (2 ** retry)))

    # Add jitter (0-30 seconds)
    local jitter=$((RANDOM % 30))
    wait_time=$((wait_time + jitter))

    # Cap at max wait
    if [ $wait_time -gt $MAX_WAIT ]; then
        wait_time=$MAX_WAIT
    fi

    echo $wait_time
}

#===============================================================================
# Check Completion
#===============================================================================

is_completed() {
    # Check orchestrator state
    if [ -f ".loki/state/orchestrator.json" ]; then
        if command -v python3 &> /dev/null; then
            local phase=$(python3 -c "import json; print(json.load(open('.loki/state/orchestrator.json')).get('currentPhase', ''))" 2>/dev/null || echo "")
            if [ "$phase" = "COMPLETED" ] || [ "$phase" = "complete" ]; then
                return 0
            fi
        fi
    fi

    # Check for completion marker
    if [ -f ".loki/COMPLETED" ]; then
        return 0
    fi

    return 1
}

#===============================================================================
# Save/Load Wrapper State
#===============================================================================

save_state() {
    local retry_count="$1"
    local status="$2"
    local exit_code="$3"

    cat > ".loki/autonomy-state.json" << EOF
{
    "retryCount": $retry_count,
    "status": "$status",
    "lastExitCode": $exit_code,
    "lastRun": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "prdPath": "${PRD_PATH:-}",
    "pid": $$,
    "maxRetries": $MAX_RETRIES,
    "baseWait": $BASE_WAIT
}
EOF
}

load_state() {
    if [ -f ".loki/autonomy-state.json" ]; then
        if command -v python3 &> /dev/null; then
            RETRY_COUNT=$(python3 -c "import json; print(json.load(open('.loki/autonomy-state.json')).get('retryCount', 0))" 2>/dev/null || echo "0")
        else
            RETRY_COUNT=0
        fi
    else
        RETRY_COUNT=0
    fi
}

#===============================================================================
# Build Resume Prompt
#===============================================================================

build_prompt() {
    local retry="$1"
    local prd="$2"

    if [ $retry -eq 0 ]; then
        if [ -n "$prd" ]; then
            echo "Loki Mode with PRD at $prd"
        else
            echo "Loki Mode"
        fi
    else
        if [ -n "$prd" ]; then
            echo "Loki Mode - Resume from checkpoint. PRD at $prd. This is retry #$retry after interruption. Check .loki/state/ for current progress and continue from where we left off."
        else
            echo "Loki Mode - Resume from checkpoint. This is retry #$retry after interruption. Check .loki/state/ for current progress and continue from where we left off."
        fi
    fi
}

#===============================================================================
# Main Autonomous Loop
#===============================================================================

run_autonomous() {
    local prd_path="$1"

    log_header "Starting Autonomous Execution"

    log_info "PRD: ${prd_path:-Interactive}"
    log_info "Max retries: $MAX_RETRIES"
    log_info "Base wait: ${BASE_WAIT}s"
    log_info "Max wait: ${MAX_WAIT}s"
    echo ""

    load_state
    local retry=$RETRY_COUNT

    while [ $retry -lt $MAX_RETRIES ]; do
        local prompt=$(build_prompt $retry "$prd_path")

        echo ""
        log_header "Attempt $((retry + 1)) of $MAX_RETRIES"
        log_info "Prompt: $prompt"
        echo ""

        save_state $retry "running" 0

        # Run Claude Code with live output
        local start_time=$(date +%s)
        local log_file=".loki/logs/autonomy-$(date +%Y%m%d).log"

        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}  CLAUDE CODE OUTPUT (live)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # Log start time
        echo "=== Session started at $(date) ===" >> "$log_file"
        echo "=== Prompt: $prompt ===" >> "$log_file"

        set +e
        # Run Claude with stream-json for real-time output
        # Parse JSON stream and display formatted output
        claude --dangerously-skip-permissions -p "$prompt" \
            --output-format stream-json --verbose 2>&1 | \
            tee -a "$log_file" | \
            python3 -u -c '
import sys
import json

# ANSI colors
CYAN = "\033[0;36m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
MAGENTA = "\033[0;35m"
DIM = "\033[2m"
NC = "\033[0m"

def process_stream():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            msg_type = data.get("type", "")

            if msg_type == "assistant":
                # Extract and print assistant text
                message = data.get("message", {})
                content = message.get("content", [])
                for item in content:
                    if item.get("type") == "text":
                        text = item.get("text", "")
                        if text:
                            print(text, end="", flush=True)
                    elif item.get("type") == "tool_use":
                        tool = item.get("name", "unknown")
                        print(f"\n{CYAN}[Tool: {tool}]{NC}", flush=True)

            elif msg_type == "user":
                # Tool results
                content = data.get("message", {}).get("content", [])
                for item in content:
                    if item.get("type") == "tool_result":
                        tool_id = item.get("tool_use_id", "")[:8]
                        print(f"{DIM}[Result]{NC} ", end="", flush=True)

            elif msg_type == "result":
                # Session complete
                print(f"\n{GREEN}[Session complete]{NC}", flush=True)
                is_error = data.get("is_error", False)
                sys.exit(1 if is_error else 0)

        except json.JSONDecodeError:
            # Not JSON, print as-is
            print(line, flush=True)
        except Exception as e:
            print(f"{YELLOW}[Parse error: {e}]{NC}", file=sys.stderr)

if __name__ == "__main__":
    try:
        process_stream()
    except KeyboardInterrupt:
        sys.exit(130)
    except BrokenPipeError:
        sys.exit(0)
'
        local exit_code=${PIPESTATUS[0]}
        set -e

        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # Log end time
        echo "=== Session ended at $(date) with exit code $exit_code ===" >> "$log_file"

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "Claude exited with code $exit_code after ${duration}s"
        save_state $retry "exited" $exit_code

        # Check for success
        if [ $exit_code -eq 0 ]; then
            if is_completed; then
                echo ""
                log_header "LOKI MODE COMPLETED SUCCESSFULLY!"
                save_state $retry "completed" 0
                return 0
            fi

            # Short session might be intentional exit
            if [ $duration -lt 30 ]; then
                log_warn "Session was short (${duration}s). Checking if complete..."
                sleep 5
                if is_completed; then
                    log_header "LOKI MODE COMPLETED!"
                    return 0
                fi
            fi
        fi

        # Handle retry
        local wait_time=$(calculate_wait $retry)
        log_warn "Will retry in ${wait_time}s..."
        log_info "Press Ctrl+C to cancel"

        # Countdown
        local remaining=$wait_time
        while [ $remaining -gt 0 ]; do
            printf "\r${YELLOW}Resuming in ${remaining}s...${NC}    "
            sleep 10
            remaining=$((remaining - 10))
        done
        echo ""

        ((retry++))
    done

    log_error "Max retries ($MAX_RETRIES) exceeded"
    save_state $retry "failed" 1
    return 1
}

#===============================================================================
# Cleanup Handler
#===============================================================================

cleanup() {
    echo ""
    log_warn "Received interrupt signal"
    stop_kanban
    stop_status_monitor
    save_state ${RETRY_COUNT:-0} "interrupted" 130
    log_info "State saved. Run again to resume."
    exit 130
}

#===============================================================================
# Main Entry Point
#===============================================================================

main() {
    trap cleanup INT TERM

    echo ""
    echo -e "${BOLD}${BLUE}"
    echo "  ██╗      ██████╗ ██╗  ██╗██╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗"
    echo "  ██║     ██╔═══██╗██║ ██╔╝██║    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝"
    echo "  ██║     ██║   ██║█████╔╝ ██║    ██╔████╔██║██║   ██║██║  ██║█████╗  "
    echo "  ██║     ██║   ██║██╔═██╗ ██║    ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  "
    echo "  ███████╗╚██████╔╝██║  ██╗██║    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗"
    echo "  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
    echo -e "${NC}"
    echo -e "  ${CYAN}Autonomous Multi-Agent Startup System${NC}"
    echo -e "  ${CYAN}Version: $(cat "$PROJECT_DIR/VERSION" 2>/dev/null || echo "2.x.x")${NC}"
    echo ""

    # Parse arguments
    PRD_PATH="${1:-}"

    # Validate PRD if provided
    if [ -n "$PRD_PATH" ] && [ ! -f "$PRD_PATH" ]; then
        log_error "PRD file not found: $PRD_PATH"
        exit 1
    fi

    # Check prerequisites (unless skipped)
    if [ "$SKIP_PREREQS" != "true" ]; then
        if ! check_prerequisites; then
            exit 1
        fi
    else
        log_warn "Skipping prerequisite checks (LOKI_SKIP_PREREQS=true)"
    fi

    # Check skill installation
    if ! check_skill_installed; then
        exit 1
    fi

    # Initialize .loki directory
    init_loki_dir

    # Start Vibe Kanban dashboard (if enabled)
    if [ "$VIBE_KANBAN" = "true" ]; then
        if start_kanban_server; then
            start_kanban_sync
        fi
    else
        log_info "Vibe Kanban disabled (LOKI_VIBE_KANBAN=false)"
    fi

    # Start status monitor (background updates to .loki/STATUS.txt)
    start_status_monitor

    # Run autonomous loop
    local result=0
    run_autonomous "$PRD_PATH" || result=$?

    # Cleanup
    stop_kanban
    stop_status_monitor

    exit $result
}

# Run main
main "$@"
