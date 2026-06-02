#!/usr/bin/env bash
# Simple endpoint smoke test examples — fill TOKEN and IDs before running
# Usage: TOKEN=ey... bash scripts/test_endpoints.sh

API_BASE="http://localhost:3000/api"
TOKEN="${TOKEN:-REPLACE_ME}"
MEETING_ID="${MEETING_ID:-REPLACE_ME}"
BILL_ID="${BILL_ID:-REPLACE_ME}"
ITEM_ID="${ITEM_ID:-REPLACE_ME}"

echo "Run these manually after starting the server and setting TOKEN, MEETING_ID, BILL_ID, ITEM_ID"

echo "Create a session (Clerk/Committee Officer/Super Admin):"
cat <<'CURL'
curl -X POST "$API_BASE/meetings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Plenary Sitting","meetingType":"session","startTime":"2026-06-10T09:00:00Z","endTime":"2026-06-10T12:00:00Z","room":"Main Chamber","attendees":[]}'
CURL

echo "Mark attendance (array of {user:USER_ID,status}):"
cat <<'CURL'
curl -X POST "$API_BASE/meetings/$MEETING_ID/attendance" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"attendance":[{"user":"USER_ID","status":"Present"}]}'
CURL

echo "Add voting item to meeting:"
cat <<'CURL'
curl -X POST "$API_BASE/meetings/$MEETING_ID/voting-items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"votingItems":[{"question":"Approve budget?","options":["Yes","No","Abstain"]}]}'
CURL

echo "Cast vote on meeting voting item:"
cat <<'CURL'
curl -X POST "$API_BASE/meetings/$MEETING_ID/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"$ITEM_ID","option":"Yes"}'
CURL

echo "Cast vote on bill voting item:"
cat <<'CURL'
curl -X POST "$API_BASE/bills/$BILL_ID/vote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId":"$ITEM_ID","option":"Yes"}'
CURL

chmod +x scripts/test_endpoints.sh

echo "Created scripts/test_endpoints.sh — edit TOKEN/IDs then run it after starting the server."
