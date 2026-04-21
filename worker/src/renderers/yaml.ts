/**
 * YAML rendering for Clash config
 */

import { ClashConfig } from '../utils/types';

function escapeYamlString(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    // Check if string needs quoting
    if (/^[0-9]+$/.test(value) || value.includes(':') || value.includes('#') || 
        value.includes('"') || value.includes("'") || value.trim() !== value) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  return String(value);
}

function renderYamlObject(obj: any, indent: number = 0): string {
  const spaces = ' '.repeat(indent);
  const nextIndent = ' '.repeat(indent + 2);
  const lines: string[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        lines.push(`${spaces}-`);
        const itemLines = renderYamlObject(item, indent + 2).split('\n');
        for (const line of itemLines) {
          lines.push(line);
        }
      } else {
        lines.push(`${spaces}- ${escapeYamlString(item)}`);
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const value = obj[key];
      if (value === null || value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        lines.push(`${spaces}${key}:`);
        if (value.length === 0) {
          lines.push(`${nextIndent}[]`);
        } else if (typeof value[0] === 'object' && value[0] !== null) {
          for (const item of value) {
            lines.push(`${nextIndent}-`);
            const itemLines = renderYamlObject(item, indent + 4).split('\n');
            for (const line of itemLines) {
              lines.push(line);
            }
          }
        } else {
          for (const item of value) {
            lines.push(`${nextIndent}- ${escapeYamlString(item)}`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        lines.push(`${spaces}${key}:`);
        const nestedLines = renderYamlObject(value, indent + 2).split('\n');
        for (const line of nestedLines) {
          lines.push(line);
        }
      } else {
        lines.push(`${spaces}${key}: ${escapeYamlString(value)}`);
      }
    }
  }

  return lines.join('\n');
}

export function renderYaml(obj: ClashConfig): string {
  return renderYamlObject(obj, 0);
}
