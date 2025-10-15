import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type ExportOptions = {
  filters?: PlainFilter; // Filters to apply to the query
  sort?: PlainSortClause; // Sort clause for the query
  search?: string; // Search term for the query
  projection?: string[]; // Fields to include in the response
};

export type SelectOptions = ExportOptions & {
  pagination?: {
    size?: number; // number of items per page
    number?: number; // current page number
  };
};
