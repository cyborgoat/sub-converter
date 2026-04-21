"""VMess (vmess://) parser."""

from __future__ import annotations

import base64
import json
from typing import Any

from sub_converter.utils import pad_base64


def parse_vmess(url: str) -> dict[str, Any]:
    payload = url[len("vmess://"):]
    decoded = base64.b64decode(pad_base64(payload)).decode("utf-8", errors="strict")
    data = json.loads(decoded)
    data["scheme"] = "vmess"
    data["raw"] = url
    if "ps" in data and "name" not in data:
        data["name"] = data["ps"]
    return data
