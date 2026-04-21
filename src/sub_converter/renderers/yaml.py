"""Stdlib-only YAML serialiser for Clash config dicts."""

from __future__ import annotations

import json
from typing import Any


def yaml_scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(str(value), ensure_ascii=False)


def to_yaml(value: Any, indent: int = 0) -> str:
    space = "  " * indent

    if isinstance(value, dict):
        lines: list[str] = []
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                lines.append(f"{space}{key}:")
                lines.append(to_yaml(item, indent + 1))
            else:
                lines.append(f"{space}{key}: {yaml_scalar(item)}")
        return "\n".join(lines) if lines else f"{space}{{}}"

    if isinstance(value, list):
        lines = []
        for item in value:
            if isinstance(item, dict):
                item_lines = list(item.items())
                if not item_lines:
                    lines.append(f"{space}- {{}}")
                    continue
                first_key, first_value = item_lines[0]
                if isinstance(first_value, (dict, list)):
                    lines.append(f"{space}- {first_key}:")
                    lines.append(to_yaml(first_value, indent + 2))
                else:
                    lines.append(f"{space}- {first_key}: {yaml_scalar(first_value)}")
                for key, nested in item_lines[1:]:
                    if isinstance(nested, (dict, list)):
                        lines.append(f"{space}  {key}:")
                        lines.append(to_yaml(nested, indent + 2))
                    else:
                        lines.append(f"{space}  {key}: {yaml_scalar(nested)}")
            elif isinstance(item, list):
                lines.append(f"{space}-")
                lines.append(to_yaml(item, indent + 1))
            else:
                lines.append(f"{space}- {yaml_scalar(item)}")
        return "\n".join(lines) if lines else f"{space}[]"

    return f"{space}{yaml_scalar(value)}"
