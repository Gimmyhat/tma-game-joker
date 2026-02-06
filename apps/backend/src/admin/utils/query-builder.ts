import { BadRequestException } from '@nestjs/common';

export type FilterOperator = 'eq' | 'like' | 'in' | 'range' | 'bool';

export type FilterCondition = {
  field: string;
  op: FilterOperator;
  value?: unknown;
};

export type FilterGroup = {
  op: 'and' | 'or';
  filters: FilterNode[];
};

export type FilterNode = FilterCondition | FilterGroup;

export type SortItem = {
  field: string;
  direction?: 'asc' | 'desc';
};

export type FieldType = 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'id';

export type FieldSchema = Record<
  string,
  {
    type: FieldType;
    map?: (condition: FilterCondition) => Record<string, unknown>;
  }
>;

export function parseFiltersParam(param?: string): FilterNode | undefined {
  if (!param) return undefined;
  const parsed = parseJson(param, 'filters');
  return normalizeFilterNode(parsed);
}

export function parseSortParam(param?: string): SortItem[] | undefined {
  if (!param) return undefined;
  const parsed = parseJson(param, 'sort');
  if (!Array.isArray(parsed)) {
    throw new BadRequestException('sort must be an array');
  }
  return parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new BadRequestException('sort items must be objects');
    }
    const { field, direction } = item as SortItem;
    if (!field || typeof field !== 'string') {
      throw new BadRequestException('sort.field must be a string');
    }
    if (direction && direction !== 'asc' && direction !== 'desc') {
      throw new BadRequestException('sort.direction must be asc or desc');
    }
    return { field, direction };
  });
}

export function buildWhereFromFilter(
  filter: FilterNode | undefined,
  schema: FieldSchema,
): Record<string, unknown> | undefined {
  if (!filter) return undefined;
  return buildWhere(filter, schema);
}

export function buildOrderBy(
  sort: SortItem[] | undefined,
  schema: FieldSchema,
): Array<Record<string, 'asc' | 'desc'>> | undefined {
  if (!sort || sort.length === 0) return undefined;
  return sort.map((item) => {
    const fieldConfig = schema[item.field];
    if (!fieldConfig) {
      throw new BadRequestException(`Unsupported sort field: ${item.field}`);
    }
    return { [item.field]: item.direction ?? 'asc' } as Record<string, 'asc' | 'desc'>;
  });
}

export function mergeWhere<T extends Record<string, unknown>>(
  ...parts: Array<T | undefined>
): T | undefined {
  const valid = parts.filter((part) => part && Object.keys(part).length > 0) as T[];
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return { AND: valid } as unknown as T;
}

function parseJson(param: string, name: string): unknown {
  try {
    return JSON.parse(param);
  } catch {
    throw new BadRequestException(`${name} must be valid JSON`);
  }
}

function normalizeFilterNode(input: unknown): FilterNode {
  if (Array.isArray(input)) {
    return { op: 'and', filters: input.map(normalizeFilterNode) };
  }

  if (!input || typeof input !== 'object') {
    throw new BadRequestException('filters must be an object or array');
  }

  const node = input as Record<string, unknown>;

  if (node.op === 'and' || node.op === 'or') {
    if (!Array.isArray(node.filters)) {
      throw new BadRequestException('filters.op group must include filters array');
    }
    return {
      op: node.op,
      filters: node.filters.map(normalizeFilterNode),
    };
  }

  if (typeof node.field !== 'string' || typeof node.op !== 'string') {
    throw new BadRequestException('filters must include field and op');
  }

  if (!['eq', 'like', 'in', 'range', 'bool'].includes(node.op)) {
    throw new BadRequestException(`Unsupported filter op: ${node.op}`);
  }

  return {
    field: node.field,
    op: node.op as FilterOperator,
    value: node.value,
  };
}

function buildWhere(filter: FilterNode, schema: FieldSchema): Record<string, unknown> {
  if ('filters' in filter) {
    const parts = filter.filters.map((node) => buildWhere(node, schema));
    return filter.op === 'or' ? { OR: parts } : { AND: parts };
  }

  const fieldConfig = schema[filter.field];
  if (!fieldConfig) {
    throw new BadRequestException(`Unsupported filter field: ${filter.field}`);
  }

  const normalized = normalizeCondition(filter, fieldConfig.type);

  if (fieldConfig.map) {
    return fieldConfig.map(normalized);
  }

  return buildConditionWhere(normalized, fieldConfig.type);
}

function normalizeCondition(condition: FilterCondition, type: FieldType): FilterCondition {
  const { op, value } = condition;

  if (op === 'range') {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('range filter requires { from?, to? }');
    }
    return { ...condition, value: normalizeRangeValue(value as Record<string, unknown>, type) };
  }

  if (op === 'in') {
    if (!Array.isArray(value)) {
      throw new BadRequestException('in filter requires array value');
    }
    return { ...condition, value: value.map((item) => normalizeSingleValue(item, type)) };
  }

  return { ...condition, value: normalizeSingleValue(value, type, op) };
}

function normalizeSingleValue(value: unknown, type: FieldType, op?: FilterOperator): unknown {
  if (op === 'like') {
    if (typeof value !== 'string') {
      throw new BadRequestException('like filter requires string value');
    }
    return value;
  }

  if (type === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new BadRequestException('boolean filter requires true/false');
    }
    return value;
  }

  if (type === 'number') {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException('number filter requires numeric value');
    }
    return parsed;
  }

  if (type === 'date') {
    const parsed = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('date filter requires valid date');
    }
    return parsed;
  }

  if (type === 'string' || type === 'enum' || type === 'id') {
    if (value === undefined) {
      throw new BadRequestException('filter value is required');
    }
    return value;
  }

  return value;
}

function normalizeRangeValue(
  value: Record<string, unknown>,
  type: FieldType,
): { from?: unknown; to?: unknown } {
  const from = value.from !== undefined ? normalizeSingleValue(value.from, type) : undefined;
  const to = value.to !== undefined ? normalizeSingleValue(value.to, type) : undefined;
  return { from, to };
}

function buildConditionWhere(condition: FilterCondition, type: FieldType): Record<string, unknown> {
  const { field, op, value } = condition;

  if (op === 'like') {
    return {
      [field]: {
        contains: value as string,
        mode: 'insensitive',
      },
    };
  }

  if (op === 'range') {
    const range = value as { from?: unknown; to?: unknown };
    const payload: Record<string, unknown> = {};
    if (range.from !== undefined) payload.gte = range.from;
    if (range.to !== undefined) payload.lte = range.to;
    return { [field]: payload };
  }

  if (op === 'in') {
    return { [field]: { in: value as unknown[] } };
  }

  if (op === 'bool') {
    if (type !== 'boolean') {
      throw new BadRequestException('bool filter is only valid for boolean fields');
    }
    return { [field]: value };
  }

  return { [field]: value };
}
