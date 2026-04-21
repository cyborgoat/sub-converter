/**
 * YAML rendering for Clash config
 */

function yamlScalar(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return JSON.stringify(String(value));
}

const INDENTS = ['', '  ', '    ', '      ', '        ', '          ', '            ', '              '];

function indentOf(level: number): string {
  if (level < INDENTS.length) {
    return INDENTS[level];
  }
  return '  '.repeat(level);
}

function renderYamlInto(lines: string[], value: any, indent: number): void {
  const space = indentOf(indent);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    let hasEntry = false;
    for (const key in value) {
      const item = value[key];
      hasEntry = true;
      if (Array.isArray(item) || (item && typeof item === 'object')) {
        lines.push(`${space}${key}:`);
        renderYamlInto(lines, item, indent + 1);
      } else {
        lines.push(`${space}${key}: ${yamlScalar(item)}`);
      }
    }
    if (!hasEntry) {
      lines.push(`${space}{}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`${space}[]`);
      return;
    }

    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const keys = Object.keys(item);
        if (keys.length === 0) {
          lines.push(`${space}- {}`);
          continue;
        }

        const firstKey = keys[0];
        const firstValue = item[firstKey];
        if (Array.isArray(firstValue) || (firstValue && typeof firstValue === 'object')) {
          lines.push(`${space}- ${firstKey}:`);
          renderYamlInto(lines, firstValue, indent + 2);
        } else {
          lines.push(`${space}- ${firstKey}: ${yamlScalar(firstValue)}`);
        }

        const nestedSpace = indentOf(indent) + '  ';
        for (let j = 1; j < keys.length; j++) {
          const key = keys[j];
          const nested = item[key];
          if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
            lines.push(`${nestedSpace}${key}:`);
            renderYamlInto(lines, nested, indent + 2);
          } else {
            lines.push(`${nestedSpace}${key}: ${yamlScalar(nested)}`);
          }
        }
      } else if (Array.isArray(item)) {
        lines.push(`${space}-`);
        renderYamlInto(lines, item, indent + 1);
      } else {
        lines.push(`${space}- ${yamlScalar(item)}`);
      }
    }
    return;
  }

  lines.push(`${space}${yamlScalar(value)}`);
}

export function renderYaml(value: any): string {
  const lines: string[] = [];
  renderYamlInto(lines, value, 0);
  return lines.join('\n');
}
