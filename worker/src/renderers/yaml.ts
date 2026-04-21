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

export function renderYaml(value: any, indent: number = 0): string {
  const space = '  '.repeat(indent);

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const lines: string[] = [];
    for (const [key, item] of Object.entries(value)) {
      if (Array.isArray(item) || (item && typeof item === 'object')) {
        lines.push(`${space}${key}:`);
        lines.push(renderYaml(item, indent + 1));
      } else {
        lines.push(`${space}${key}: ${yamlScalar(item)}`);
      }
    }
    return lines.length > 0 ? lines.join('\n') : `${space}{}`;
  }

  if (Array.isArray(value)) {
    const lines: string[] = [];
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const entries = Object.entries(item);
        if (entries.length === 0) {
          lines.push(`${space}- {}`);
          continue;
        }

        const [firstKey, firstValue] = entries[0];
        if (Array.isArray(firstValue) || (firstValue && typeof firstValue === 'object')) {
          lines.push(`${space}- ${firstKey}:`);
          lines.push(renderYaml(firstValue, indent + 2));
        } else {
          lines.push(`${space}- ${firstKey}: ${yamlScalar(firstValue)}`);
        }

        for (const [key, nested] of entries.slice(1)) {
          if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
            lines.push(`${space}  ${key}:`);
            lines.push(renderYaml(nested, indent + 2));
          } else {
            lines.push(`${space}  ${key}: ${yamlScalar(nested)}`);
          }
        }
      } else if (Array.isArray(item)) {
        lines.push(`${space}-`);
        lines.push(renderYaml(item, indent + 1));
      } else {
        lines.push(`${space}- ${yamlScalar(item)}`);
      }
    }
    return lines.length > 0 ? lines.join('\n') : `${space}[]`;
  }

  return `${space}${yamlScalar(value)}`;
}
