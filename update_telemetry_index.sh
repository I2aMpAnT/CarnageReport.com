#!/bin/bash
# Update the telemetry index file with all available theater CSV files

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATS_DIR="$SCRIPT_DIR/stats"
INDEX_FILE="$STATS_DIR/telemetry_index.json"

# Find all theater CSV files and create JSON array
echo "[" > "$INDEX_FILE"
first=true
for file in "$STATS_DIR"/*_theater.csv; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$INDEX_FILE"
        fi
        echo -n "  \"$filename\"" >> "$INDEX_FILE"
    fi
done
echo "" >> "$INDEX_FILE"
echo "]" >> "$INDEX_FILE"

echo "Updated telemetry index with $(grep -c '.csv' "$INDEX_FILE") files"
