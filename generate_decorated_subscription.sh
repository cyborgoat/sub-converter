#!/usr/bin/env bash
set -euo pipefail

RAW_OUTPUT="${1:-subscription.yaml}"
FINAL_OUTPUT="${2:-subscription.decorated.yaml}"

python3 decode_subscription.py -o "${RAW_OUTPUT}"
python3 decorate_subscription.py --input "${RAW_OUTPUT}" --output "${FINAL_OUTPUT}"

echo "Generated ${FINAL_OUTPUT}"
