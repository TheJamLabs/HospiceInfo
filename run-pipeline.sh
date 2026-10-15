#!/usr/bin/env bash
# Autonomous pipeline driver for the Qwen Code agent pipeline.
#
# Usage:
#   ./run-pipeline.sh "Ship feature X per .agents/requirements.md"
#   ./run-pipeline.sh "" <session-id>        # resume an interrupted run
#                                              (session id = first line of
#                                              pipeline.stream.jsonl)
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OBJECTIVE="${1:-}"
SESSION_ID="${2:-}"
# 9B lead matches the dsh supervision preset; switch to
# vllm:Qwen/Qwen3.8-27B-FP8 if dispatch quality is too brittle.
LEAD_MODEL="${LEAD_MODEL:-vllm-2:QuantTrio/Qwen3.5-9B-AWQ}"

# Keep the run alive through transient 429/529 provider hiccups
export QWEN_CODE_UNATTENDED_RETRY=1
# Uncomment in a trusted VM/container after reviewing the trade-off:
# export QWEN_CODE_SUPPRESS_YOLO_WARNING=1

COMMON=(
  --model "$LEAD_MODEL"
  --append-system-prompt "$(cat .qwen/lead.md)"
  --approval-mode auto-edit
  --output-format stream-json
  --max-session-turns 400
  --max-wall-time 6h
  # --max-tool-calls 2000   # optional extra bound (limits top-level calls
                            # only; subagent inner calls are not counted)
)

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

if [[ -n "$SESSION_ID" ]]; then
  RESUME_ARGS=(--resume "$SESSION_ID")
  PROMPT="/goal resume"
else
  [[ -n "$OBJECTIVE" ]] || { echo "usage: $0 <objective> [session-id]" >&2; exit 2; }
  RESUME_ARGS=()
  PROMPT="/goal ${OBJECTIVE}"
fi

log "starting pipeline - goal: ${OBJECTIVE:-<resuming session $SESSION_ID>}"

qwen ${RESUME_ARGS[@]+"${RESUME_ARGS[@]}"} -p "$PROMPT" "${COMMON[@]}" \
  2> pipeline.err | tee pipeline.stream.jsonl
EXIT=${PIPESTATUS[0]}

case "$EXIT" in
  0)   log "pipeline finished (exit 0). State: .agents/pipeline.md" ;;
  53)  log "turn budget exhausted (exit 53) - raise --max-session-turns, then resume with the session id from pipeline.stream.jsonl" ;;
  55)  log "wall-clock or tool budget exhausted (exit 55) - raise --max-wall-time, then resume" ;;
  130) log "interrupted (exit 130) - resume with the session id" ;;
  *)   log "failed with exit $EXIT - see pipeline.err" ;;
esac
exit "$EXIT"