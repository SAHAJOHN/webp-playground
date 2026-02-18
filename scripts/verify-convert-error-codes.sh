#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
API_URL="${BASE_URL%/}/api/convert"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

PASS_COUNT=0
FAIL_COUNT=0

print_result() {
  local ok="$1"
  local name="$2"
  local expected_status="$3"
  local expected_code="$4"
  local actual_status="$5"
  local body_file="$6"

  if [ "$ok" = "true" ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    printf "PASS %-28s status=%s code=%s\n" "$name" "$expected_status" "$expected_code"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
    printf "FAIL %-28s expected status=%s code=%s got status=%s body=%s\n" \
      "$name" "$expected_status" "$expected_code" "$actual_status" "$(cat "$body_file")"
  fi
}

assert_case() {
  local name="$1"
  local expected_status="$2"
  local expected_code="$3"
  local body_file="$4"
  local actual_status="$5"

  local body
  body="$(tr -d '\n' < "$body_file")"

  if [ "$actual_status" = "$expected_status" ] && echo "$body" | grep -q "\"code\":\"$expected_code\""; then
    print_result "true" "$name" "$expected_status" "$expected_code" "$actual_status" "$body_file"
  else
    print_result "false" "$name" "$expected_status" "$expected_code" "$actual_status" "$body_file"
  fi
}

printf "Verifying API error codes against %s\n" "$API_URL"

# Fixture: fake jpg text content (invalid signature for image conversion)
printf "not-a-real-image" > "$TMP_DIR/fake.jpg"

# Fixture: oversized file (16MB > 15MB limit)
dd if=/dev/zero of="$TMP_DIR/oversize.jpg" bs=1m count=16 status=none

# Case 1: SVG blocked
SVG_BODY="$TMP_DIR/svg.json"
SVG_STATUS=$(curl -sS -o "$SVG_BODY" -w "%{http_code}" -X POST \
  -F "file=@public/next.svg" \
  -F "format=webp" \
  "$API_URL")
assert_case "SVG_BLOCKED" "400" "SVG_BLOCKED" "$SVG_BODY" "$SVG_STATUS"

# Case 2: Invalid file signature
SIG_BODY="$TMP_DIR/signature.json"
SIG_STATUS=$(curl -sS -o "$SIG_BODY" -w "%{http_code}" -X POST \
  -F "file=@$TMP_DIR/fake.jpg" \
  -F "format=webp" \
  "$API_URL")
assert_case "INVALID_FILE_SIGNATURE" "400" "INVALID_FILE_SIGNATURE" "$SIG_BODY" "$SIG_STATUS"

# Case 3: File too large
SIZE_BODY="$TMP_DIR/size.json"
SIZE_STATUS=$(curl -sS -o "$SIZE_BODY" -w "%{http_code}" -X POST \
  -F "file=@$TMP_DIR/oversize.jpg" \
  -F "format=webp" \
  "$API_URL")
assert_case "FILE_TOO_LARGE" "400" "FILE_TOO_LARGE" "$SIZE_BODY" "$SIZE_STATUS"

# Case 4: No file provided
NOFILE_BODY="$TMP_DIR/nofile.json"
NOFILE_STATUS=$(curl -sS -o "$NOFILE_BODY" -w "%{http_code}" -X POST \
  -F "format=webp" \
  "$API_URL")
assert_case "NO_FILE_PROVIDED" "400" "NO_FILE_PROVIDED" "$NOFILE_BODY" "$NOFILE_STATUS"

# Case 5: Invalid output format
FORMAT_BODY="$TMP_DIR/format.json"
FORMAT_STATUS=$(curl -sS -o "$FORMAT_BODY" -w "%{http_code}" -X POST \
  -F "file=@$TMP_DIR/fake.jpg" \
  -F "format=tiff" \
  "$API_URL")
assert_case "INVALID_OUTPUT_FORMAT" "400" "INVALID_OUTPUT_FORMAT" "$FORMAT_BODY" "$FORMAT_STATUS"

printf "\nSummary: pass=%d fail=%d\n" "$PASS_COUNT" "$FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
