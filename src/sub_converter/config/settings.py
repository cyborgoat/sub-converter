"""Environment configuration and source-type resolution."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


def load_env_file(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or key in os.environ:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ[key] = value


def parse_source_type(value: Any) -> str:
    source_type = str(value or "auto").strip().lower()
    if source_type not in {"auto", "url", "base64"}:
        raise ValueError("source type must be 'auto', 'url', or 'base64'")
    return source_type


def is_probable_url(value: str) -> bool:
    parsed = urlparse(value.strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)
