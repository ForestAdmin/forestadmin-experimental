import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type SelectOptions = {
  filters?: PlainFilter; // Filters to apply to the query
  sort?: PlainSortClause; // Sort clause for the query
  search?: string; // Search term for the query
  pagination?: {
    size?: number; // number of items per page
    number?: number; // current page number
  };
  projection?: string[]; // Fields to include in the response
};
