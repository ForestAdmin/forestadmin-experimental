import { Operator } from "@forestadmin/datasource-toolkit/dist/src/interfaces/query/condition-tree/nodes/operators";
//TODO fix this type, we are taking operators from deals but it is not the only collection from hubspot
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/deals";

class NotSupportedOperatorError extends Error {
  constructor(operator: Operator) {
    super(`Operator: ${operator} is not supported`);
  }
}

type ConversionResult = { values?: string[], value?: string, operator: FilterOperatorEnum };
type Converter = (value) => ConversionResult;

function stringifyValue(value: any): string {
  return value.toString ? value.toString() : `${value}`;
}

function stringifyValues(value: any | any[]): string[] {
  if (Array.isArray(value)) {
    return value.map(v => stringifyValue(v));
  }
}

const OPERATOR_MAP_TRANSFORMER: { [key in Operator]: Converter} = {
  Equal: (value: any) => ({ value: stringifyValue(value), operator: 'EQ' }),
  NotEqual: (value: any) => ({ value: stringifyValue(value), operator: 'NEQ' }),
  LessThan: (value: number) => ({ value: stringifyValue(value), operator: 'LT' }),
  GreaterThan: (value: number) => ({ value: stringifyValue(value), operator: 'GT' }),
  In: (value: any[]) => ({ values: stringifyValues(value), operator: 'IN' }),
  After: (value: Date) => ({ value: stringifyValue(value), operator: 'GT' }),
  Before: (value: Date) => ({ value: stringifyValue(value), operator: 'LT' }),
  Blank: (value: any) => ({ value: stringifyValue(value), operator: 'NOT_HAS_PROPERTY' }),
  Contains: (value: any) => { throw new NotSupportedOperatorError('Contains') },
  NotContains: (value: any) => { throw new NotSupportedOperatorError('NotContains') },
  AfterXHoursAgo: (value: any) => { throw new NotSupportedOperatorError('AfterXHoursAgo') },
  BeforeXHoursAgo: (value: any) => { throw new NotSupportedOperatorError('BeforeXHoursAgo') },
  IContains: (value: any) => { throw new NotSupportedOperatorError('IContains') },
  ILike: (value: any) => { throw new NotSupportedOperatorError('ILike') },
  IEndsWith: (value: any) => { throw new NotSupportedOperatorError('IEndsWith') },
  EndsWith: (value: string) => ({ value: stringifyValue(`*${value}`), operator: 'EQ' }),
  Future: (value: any) => { throw new NotSupportedOperatorError('Future') },
  Like: (value: any) => { throw new NotSupportedOperatorError('Like') },
  IncludesAll: (value: any) => { throw new NotSupportedOperatorError('IncludesAll') },
  Match: (value: any) => { throw new NotSupportedOperatorError('Match') },
  IncludesNone: (value: any) => { throw new NotSupportedOperatorError('IncludesNone') },
  ShorterThan: (value: any) => { throw new NotSupportedOperatorError('ShorterThan') },
  IStartsWith: (value: any) => { throw new NotSupportedOperatorError('IStartsWith') },
  LongerThan: (value: any) => { throw new NotSupportedOperatorError('LongerThan') },
  Missing: (value: any) => { throw new NotSupportedOperatorError('Missing') },
  NotIContains: (value: any) => { throw new NotSupportedOperatorError('NotIContains') },
  NotIn: (value: any) => { throw new NotSupportedOperatorError('NotIn') },
  Past: (value: any) => { throw new NotSupportedOperatorError('Past') },
  Present: (value: any) => { throw new NotSupportedOperatorError('Present') },
  PreviousMonth: (value: any) => { throw new NotSupportedOperatorError('PreviousMonth') },
  PreviousMonthToDate: (value: any) => { throw new NotSupportedOperatorError('PreviousMonthToDate') },
  PreviousQuarter: (value: any) => { throw new NotSupportedOperatorError('PreviousQuarter') },
  PreviousWeek: (value: any) => { throw new NotSupportedOperatorError('PreviousWeek') },
  PreviousXDays: (value: any) => { throw new NotSupportedOperatorError('PreviousXDaysToDate') },
  PreviousQuarterToDate: (value: any) => { throw new NotSupportedOperatorError('PreviousQuarterToDate') },
  PreviousWeekToDate: (value: any) => { throw new NotSupportedOperatorError('PreviousWeekToDate') },
  PreviousXDaysToDate: (value: any) => { throw new NotSupportedOperatorError('PreviousXDaysToDate') },
  PreviousYear: (value: any) => { throw new NotSupportedOperatorError('PreviousYearToDate') },
  PreviousYearToDate: (value: any) => { throw new NotSupportedOperatorError('PreviousYearToDate') },
  StartsWith: (value: string) => ({ value: stringifyValue(`${value}*`), operator: 'EQ' }),
  Today: (value: any) => { throw new NotSupportedOperatorError('Today') },
  Yesterday: (value: any) => { throw new NotSupportedOperatorError('Yesterday') },
}

export default function getOperator<T>(value: T, operator: Operator): ConversionResult {
  return OPERATOR_MAP_TRANSFORMER[operator](value);
}