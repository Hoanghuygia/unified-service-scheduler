#!/usr/bin/env bash

set -euo pipefail

# cURL test harness for Unified Service Scheduler API.
#
# Example usage:
#   chmod +x scripts/curl-test-harness.sh
#   ./scripts/curl-test-harness.sh
#
# Run against a deployed host:
#   BASE_URL="https://your-api.example.com" ./scripts/curl-test-harness.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
JSON_HEADER="Content-Type: application/json"

# Optional static IDs used by example payloads and query params.
# TODO: Replace these with valid IDs from your database if needed.
EXAMPLE_DEALERSHIP_ID="8ec56f3e-4e8d-4fef-a31a-9f89e843e70f"
EXAMPLE_VEHICLE_ID="c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6"
EXAMPLE_SERVICE_TYPE_ID="4c4f1960-a95b-4e60-b45f-e58bde8d0ec0"
EXAMPLE_TECHNICIAN_ID="1ce6c8d6-6309-49ea-a0b7-24855e0d7f39"
EXAMPLE_SERVICE_BAY_ID="59e82402-1c7f-4477-8f1a-a07f938ac8f8"

INVALID_UUID="00000000-0000-0000-0000-000000000000"

# Runtime state populated from API responses where possible.
RESERVATION_ID=""
APPOINTMENT_ID=""
LAST_RESPONSE_RAW=""
LAST_RESPONSE_BODY=""
LAST_STATUS_CODE=""

TOTAL_CASES=0
FAILED_CURL_CALLS=0

declare -a CASE_NAMES=()

print_banner() {
  printf '\n%s\n' "============================================================"
  printf '%s\n' "$1"
  printf '%s\n' "============================================================"
}

print_section() {
  printf '\n%s\n' "------------------------------------------------------------"
  printf 'SECTION: %s\n' "$1"
  printf '%s\n' "------------------------------------------------------------"
}

print_case() {
  TOTAL_CASES=$((TOTAL_CASES + 1))
  CASE_NAMES+=("$1")
  printf '\n[%02d] %s\n' "$TOTAL_CASES" "$1"
}

extract_body_from_raw_response() {
  local raw="$1"
  local body

  body=$(printf '%s' "$raw" | awk 'BEGIN { p=0 } /^\r?$/ { p=1; next } p { print }')
  if [ -z "$body" ]; then
    body="$raw"
  fi

  printf '%s' "$body"
}

extract_status_code() {
  local raw="$1"
  local code

  code=$(printf '%s\n' "$raw" | awk '/^HTTP\// { code=$2 } END { if (code != "") print code }')
  printf '%s' "${code:-unknown}"
}

extract_value_from_body() {
  local key="$1"
  local body="$2"

  if command -v jq >/dev/null 2>&1; then
    # Try root level first, then nested under data.
    local value
    value=$(printf '%s' "$body" | jq -r --arg k "$key" '(.[$k] // .data[$k] // empty)' 2>/dev/null || true)
    if [ -n "$value" ] && [ "$value" != "null" ]; then
      printf '%s' "$value"
      return 0
    fi
  fi

  # Fallback parser if jq is unavailable.
  # NOTE: This is a best-effort regex extraction and may fail with complex JSON formatting.
  local value
  value=$(printf '%s' "$body" | sed -nE "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]+)\".*/\\1/p" | head -n1)
  printf '%s' "$value"
}

run_request() {
  local method="$1"
  local endpoint="$2"
  local payload="${3:-}"

  printf 'Endpoint: %s %s%s\n' "$method" "$BASE_URL" "$endpoint"

  if [ -n "$payload" ]; then
    printf 'Payload:\n%s\n' "$payload"
  else
    printf 'Payload: <none>\n'
  fi

  local raw
  local curl_exit=0

  if [ -n "$payload" ]; then
    set +e
    raw=$(curl -sS -i -X "$method" "$BASE_URL$endpoint" -H "$JSON_HEADER" -d "$payload" 2>&1)
    curl_exit=$?
    set -e
  else
    set +e
    raw=$(curl -sS -i -X "$method" "$BASE_URL$endpoint" 2>&1)
    curl_exit=$?
    set -e
  fi

  LAST_RESPONSE_RAW="$raw"
  LAST_RESPONSE_BODY=$(extract_body_from_raw_response "$raw")
  LAST_STATUS_CODE=$(extract_status_code "$raw")

  if [ "$curl_exit" -ne 0 ]; then
    FAILED_CURL_CALLS=$((FAILED_CURL_CALLS + 1))
    printf 'cURL error (exit %s). Raw output:\n%s\n' "$curl_exit" "$raw"
    return 0
  fi

  printf 'Response:\n%s\n' "$raw"
  printf 'Detected HTTP status: %s\n' "$LAST_STATUS_CODE"
}

run_get() {
  local endpoint="$1"
  run_request "GET" "$endpoint"
}

run_post() {
  local endpoint="$1"
  local payload="$2"
  run_request "POST" "$endpoint" "$payload"
}

run_patch() {
  local endpoint="$1"
  local payload="${2:-}"
  run_request "PATCH" "$endpoint" "$payload"
}

capture_reservation_id() {
  local body="$1"
  local candidate=""

  candidate=$(extract_value_from_body "reservationId" "$body")
  if [ -z "$candidate" ]; then
    candidate=$(extract_value_from_body "id" "$body")
  fi

  if [ -n "$candidate" ]; then
    RESERVATION_ID="$candidate"
    printf 'Captured RESERVATION_ID=%s\n' "$RESERVATION_ID"
  else
    printf 'Could not auto-capture reservation ID. You may copy it manually from response JSON.\n'
  fi
}

capture_appointment_id() {
  local body="$1"
  local candidate=""

  candidate=$(extract_value_from_body "appointmentId" "$body")
  if [ -z "$candidate" ]; then
    candidate=$(extract_value_from_body "id" "$body")
  fi

  if [ -n "$candidate" ]; then
    APPOINTMENT_ID="$candidate"
    printf 'Captured APPOINTMENT_ID=%s\n' "$APPOINTMENT_ID"
  else
    printf 'Could not auto-capture appointment ID. You may copy it manually from response JSON.\n'
  fi
}

print_banner "Unified Service Scheduler cURL Test Harness"
printf 'Base URL: %s\n' "$BASE_URL"
if command -v jq >/dev/null 2>&1; then
  printf 'JSON parser: jq detected (ID extraction is more reliable)\n'
else
  printf 'JSON parser: jq not found (using fallback regex extraction)\n'
  printf 'Tip: install jq for better JSON parsing.\n'
fi

print_section "1) Health check"
print_case "GET /health"
run_get "/health"

print_section "2) Create reservation"

print_case "POST /reservations (happy path)"
# TODO: Replace IDs below with records that exist in your environment.
read -r -d '' CREATE_RESERVATION_VALID_PAYLOAD <<'JSON' || true
{
  "vehicleId": "c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6",
  "serviceTypeIds": ["4c4f1960-a95b-4e60-b45f-e58bde8d0ec0"],
  "dealershipId": "8ec56f3e-4e8d-4fef-a31a-9f89e843e70f",
  "desiredTime": "2026-03-21T10:00:00.000Z"
}
JSON
run_post "/reservations" "$CREATE_RESERVATION_VALID_PAYLOAD"
capture_reservation_id "$LAST_RESPONSE_BODY"

print_case "POST /reservations (invalid payload)"
read -r -d '' CREATE_RESERVATION_INVALID_PAYLOAD <<'JSON' || true
{
  "vehicleId": "not-a-uuid",
  "serviceTypeIds": [],
  "dealershipId": "also-not-a-uuid",
  "desiredTime": "not-a-date"
}
JSON
run_post "/reservations" "$CREATE_RESERVATION_INVALID_PAYLOAD"

print_section "3) Cancel reservation"

if [ -n "$RESERVATION_ID" ]; then
  print_case "PATCH /reservations/:reservationId/cancel (using captured reservation ID)"
  run_patch "/reservations/$RESERVATION_ID/cancel"
else
  print_case "PATCH /reservations/:reservationId/cancel (skipped: no captured reservation ID)"
  printf 'Skipping because reservation ID was not captured from create step.\n'
fi

print_case "PATCH /reservations/:reservationId/cancel (invalid/nonexistent ID)"
run_patch "/reservations/$INVALID_UUID/cancel"

print_section "4) Create appointment"

print_case "POST /appointments (happy path using captured reservationId when available)"
if [ -n "$RESERVATION_ID" ]; then
  read -r -d '' CREATE_APPOINTMENT_VALID_PAYLOAD <<JSON || true
{
  "reservationId": "$RESERVATION_ID"
}
JSON
else
  # TODO: Replace reservationId with an ACTIVE reservation ID from your DB.
  read -r -d '' CREATE_APPOINTMENT_VALID_PAYLOAD <<'JSON' || true
{
  "reservationId": "d8a43f44-e8d6-4fb2-8f59-d4d1df3efde9"
}
JSON
fi
run_post "/appointments" "$CREATE_APPOINTMENT_VALID_PAYLOAD"
capture_appointment_id "$LAST_RESPONSE_BODY"

print_case "POST /appointments (invalid payload)"
read -r -d '' CREATE_APPOINTMENT_INVALID_PAYLOAD <<'JSON' || true
{
  "reservationId": "invalid-reservation-id"
}
JSON
run_post "/appointments" "$CREATE_APPOINTMENT_INVALID_PAYLOAD"

print_section "5) Complete appointment"

if [ -n "$APPOINTMENT_ID" ]; then
  print_case "PATCH /appointments/:id/complete (using captured appointment ID)"
  run_patch "/appointments/$APPOINTMENT_ID/complete"
else
  print_case "PATCH /appointments/:id/complete (skipped: no captured appointment ID)"
  printf 'Skipping because appointment ID was not captured from create step.\n'
fi

print_case "PATCH /appointments/:id/complete (invalid/nonexistent ID)"
run_patch "/appointments/$INVALID_UUID/complete"

print_section "6) Cancel appointment"

if [ -n "$APPOINTMENT_ID" ]; then
  print_case "PATCH /appointments/:id/cancel (using captured appointment ID)"
  run_patch "/appointments/$APPOINTMENT_ID/cancel"
else
  print_case "PATCH /appointments/:id/cancel (skipped: no captured appointment ID)"
  printf 'Skipping because appointment ID was not captured from create step.\n'
fi

print_case "PATCH /appointments/:id/cancel (invalid/nonexistent ID)"
run_patch "/appointments/$INVALID_UUID/cancel"

print_section "7) Slots lookup"

print_case "GET /slots (with required and optional query params)"
# TODO: Confirm these IDs exist in your environment. dealershipId and endTime are required by DTO.
# TODO: Adjust endTime to suit your test window.
SLOTS_QUERY="/slots?dealershipId=$EXAMPLE_DEALERSHIP_ID&endTime=2026-03-21T20:00:00.000Z&page=1&limit=20&technicianId=$EXAMPLE_TECHNICIAN_ID&serviceBayId=$EXAMPLE_SERVICE_BAY_ID"
run_get "$SLOTS_QUERY"

print_case "GET /slots (invalid query params)"
run_get "/slots?dealershipId=not-a-uuid&endTime=not-a-date&page=0&limit=999"

print_section "Final summary"
printf 'Total test cases declared: %s\n' "$TOTAL_CASES"
printf 'cURL transport-level failures: %s\n' "$FAILED_CURL_CALLS"
printf 'Captured RESERVATION_ID: %s\n' "${RESERVATION_ID:-<none>}"
printf 'Captured APPOINTMENT_ID: %s\n' "${APPOINTMENT_ID:-<none>}"
printf 'Base URL tested: %s\n' "$BASE_URL"

printf '\nExecuted cases:\n'
for case_name in "${CASE_NAMES[@]}"; do
  printf ' - %s\n' "$case_name"
done

printf '\nDone. Review HTTP status lines and response bodies above for pass/fail expectations.\n'
