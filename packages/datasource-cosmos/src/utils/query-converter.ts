import { SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import {
  ConditionTree,
  ConditionTreeBranch,
  ConditionTreeLeaf,
  Operator,
  Sort,
} from '@forestadmin/datasource-toolkit';

export default class QueryConverter {
  private parameterCounter = 0;
  private parameters: SqlParameter[] = [];

  /**
   * Reset the converter state for a new query
   */
  private reset(): void {
    this.parameterCounter = 0;
    this.parameters = [];
  }

  /**
   * Add a parameter and return its name
   */
  private addParameter(value: unknown): string {
    const paramName = `@param${this.parameterCounter}`;
    this.parameterCounter += 1;
    // Cosmos DB parameters need to be cast as any since the Azure SDK accepts broader
    // types than what TypeScript JSONValue allows (e.g., nested objects, arrays with
    // mixed types). This is safe because Cosmos DB will serialize these values.
    this.parameters.push({
      name: paramName,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cosmos DB SDK
      value: value as any,
    });

    return paramName;
  }

  /**
   * Convert a single condition to SQL WHERE clause fragment
   */
  private makeWhereClause(field: string, operator: Operator, value?: unknown): string {
    // Use 'c' as the root alias for Cosmos DB queries
    // Convert arrow notation (->) back to dot notation (.) for Cosmos DB
    const cosmosField = field.replace(/->/g, '.');
    const fieldPath = field === 'id' ? 'c.id' : `c.${cosmosField}`;

    switch (operator) {
      // Presence
      case 'Present':
        return `IS_DEFINED(${fieldPath}) AND ${fieldPath} != null`;

      case 'Missing':
        return `(NOT IS_DEFINED(${fieldPath}) OR ${fieldPath} = null)`;

      // Equality
      case 'Equal':
        if (value === null || value === undefined) {
          return `(NOT IS_DEFINED(${fieldPath}) OR ${fieldPath} = null)`;
        }

        return `${fieldPath} = ${this.addParameter(value)}`;

      case 'NotEqual':
        if (value === null || value === undefined) {
          return `IS_DEFINED(${fieldPath}) AND ${fieldPath} != null`;
        }

        return `${fieldPath} != ${this.addParameter(value)}`;

      case 'In': {
        const values = Array.isArray(value) ? value : [value];
        if (values.length === 0) return '1 = 0'; // Always false

        if (values.some(v => v === null || v === undefined)) {
          const nonNullValues = values.filter(v => v !== null && v !== undefined);

          if (nonNullValues.length === 0) {
            return `(NOT IS_DEFINED(${fieldPath}) OR ${fieldPath} = null)`;
          }

          const paramName = this.addParameter(nonNullValues);

          return (
            `(ARRAY_CONTAINS(${paramName}, ${fieldPath}) OR ` +
            `NOT IS_DEFINED(${fieldPath}) OR ${fieldPath} = null)`
          );
        }

        const paramName = this.addParameter(values);

        return `ARRAY_CONTAINS(${paramName}, ${fieldPath})`;
      }

      case 'NotIn': {
        const values = Array.isArray(value) ? value : [value];
        if (values.length === 0) return '1 = 1'; // Always true
        const paramName = this.addParameter(values);

        return `NOT ARRAY_CONTAINS(${paramName}, ${fieldPath})`;
      }

      // Ranges
      case 'LessThan':
        return `${fieldPath} < ${this.addParameter(value)}`;

      case 'GreaterThan':
        return `${fieldPath} > ${this.addParameter(value)}`;

      // Strings
      case 'Like':

      // fallthrough
      case 'ILike': {
        const pattern = String(value).replace(/^%/, '').replace(/%$/, '');
        const paramName = this.addParameter(pattern);

        if (operator === 'ILike') {
          return `CONTAINS(LOWER(${fieldPath}), LOWER(${paramName}))`;
        }

        return `CONTAINS(${fieldPath}, ${paramName})`;
      }

      case 'Contains': {
        const paramName = this.addParameter(value);

        return `CONTAINS(${fieldPath}, ${paramName})`;
      }

      case 'NotContains': {
        const paramName = this.addParameter(value);

        return `NOT CONTAINS(${fieldPath}, ${paramName})`;
      }

      case 'StartsWith': {
        const paramName = this.addParameter(value);

        return `STARTSWITH(${fieldPath}, ${paramName})`;
      }

      case 'EndsWith': {
        const paramName = this.addParameter(value);

        return `ENDSWITH(${fieldPath}, ${paramName})`;
      }

      // Array operations
      case 'IncludesAll': {
        const values = Array.isArray(value) ? value : [value];
        const conditions = values.map(v => {
          const paramName = this.addParameter(v);

          return `ARRAY_CONTAINS(${fieldPath}, ${paramName})`;
        });

        return `(${conditions.join(' AND ')})`;
      }

      default:
        throw new Error(`Unsupported operator: "${operator}".`);
    }
  }

  /**
   * Recursively convert a condition tree to SQL WHERE clause
   */
  private getWhereClauseFromConditionTree(conditionTree?: ConditionTree): string {
    if (!conditionTree) return '';

    if ((conditionTree as ConditionTreeBranch).aggregator !== undefined) {
      const { aggregator, conditions } = conditionTree as ConditionTreeBranch;

      if (aggregator === null) {
        throw new Error('Invalid (null) aggregator.');
      }

      if (!Array.isArray(conditions) || conditions.length === 0) {
        throw new Error('Conditions must be a non-empty array.');
      }

      const operator = aggregator === 'And' ? ' AND ' : ' OR ';
      const clauses = conditions
        .map(condition => this.getWhereClauseFromConditionTree(condition))
        .filter(clause => clause !== '');

      if (clauses.length === 0) return '';
      if (clauses.length === 1) return clauses[0];

      return `(${clauses.join(operator)})`;
    }

    if ((conditionTree as ConditionTreeLeaf).operator !== undefined) {
      const { field, operator, value } = conditionTree as ConditionTreeLeaf;

      // Check for relation fields (not supported yet)
      const isRelation = field.includes(':');

      if (isRelation) {
        throw new Error('Relation ConditionTree not yet supported for Cosmos DB.');
      }

      return this.makeWhereClause(field, operator, value);
    }

    throw new Error('Invalid ConditionTree.');
  }

  /**
   * Convert condition tree to a complete SQL query spec
   */
  public getSqlQuerySpec(
    conditionTree?: ConditionTree,
    sort?: Sort,
    projection?: string[],
  ): SqlQuerySpec {
    // Reset state for new query
    this.reset();

    // Build SELECT clause
    // Cosmos DB doesn't handle well selecting individual nested properties
    // (e.g., c.accountingBalance.currency). Instead, select parent objects.
    const selectClause =
      projection && projection.length > 0
        ? (() => {
            const fieldsToSelect = new Set<string>();

            projection.forEach(field => {
              if (field.includes('->')) {
                // For nested fields like 'accountingBalance->currency',
                // add the parent object 'accountingBalance' instead
                const parentField = field.split('->')[0];
                fieldsToSelect.add(parentField);
              } else {
                // Regular field, add as-is
                fieldsToSelect.add(field);
              }
            });

            return Array.from(fieldsToSelect)
              .map(field => {
                if (field === 'id') {
                  return 'c.id';
                }

                const cosmosField = field.replace(/->/g, '.');

                return `c.${cosmosField}`;
              })
              .join(', ');
          })()
        : 'c';

    // Build WHERE clause
    const whereClause = this.getWhereClauseFromConditionTree(conditionTree);
    const whereFragment = whereClause ? `WHERE ${whereClause}` : '';

    // Build ORDER BY clause
    const orderByClause = this.getOrderByClause(sort);
    const orderByFragment = orderByClause ? `ORDER BY ${orderByClause}` : '';

    // Combine into full query
    const query = `SELECT ${selectClause} FROM c ${whereFragment} ${orderByFragment}`.trim();

    return {
      query,
      parameters: this.parameters,
    };
  }

  /**
   * Convert sort to ORDER BY clause
   */
  public getOrderByClause(sort?: Sort): string {
    if (!sort || sort.length === 0) return '';

    const sortClauses = sort.map(({ field, ascending }) => {
      // Convert arrow notation (->) to dot notation (.) for Cosmos DB
      const cosmosField = field.replace(/->/g, '.');
      const fieldPath = `c.${cosmosField}`;
      const direction = ascending ? 'ASC' : 'DESC';

      return `${fieldPath} ${direction}`;
    });

    return sortClauses.join(', ');
  }

  /**
   * Get WHERE clause only (for use in subqueries or COUNT operations)
   */
  public getWhereClause(conditionTree?: ConditionTree): {
    where: string;
    parameters: SqlParameter[];
  } {
    this.reset();
    const where = this.getWhereClauseFromConditionTree(conditionTree);

    return { where, parameters: this.parameters };
  }
}
