"""Low-level helpers shared across the package."""

from __future__ import annotations

import re
from typing import Any
from urllib.parse import parse_qsl, unquote


def pad_base64(value: str) -> str:
    trimmed = re.sub(r"\s+", "", value.strip()).replace("-", "+").replace("_", "/")
    if not trimmed:
        return trimmed
    padding = (-len(trimmed)) % 4
    return trimmed + ("=" * padding)


def parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def clean_query(parsed_query: str) -> dict[str, str]:
    if not parsed_query:
        return {}
    return {k: v for k, v in parse_qsl(parsed_query, keep_blank_values=True)}


def decode_name(fragment: str) -> str | None:
    if not fragment:
        return None
    return unquote(fragment.strip()) or None
