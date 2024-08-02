import {ConditionTree, ConditionTreeLeaf } from "@forestadmin/datasource-toolkit";
import {
  PublicObjectSearchRequest
} from "@hubspot/api-client/lib/codegen/crm/companies/models/PublicObjectSearchRequest";
import ConditionTreeBranch, {Aggregator} from "@forestadmin/datasource-toolkit/dist/src/interfaces/query/condition-tree/nodes/branch";
import getOperator from "./get-operator";
import { Filter } from "@hubspot/api-client/lib/codegen/crm/deals";

function getConditions(conditions: ConditionTreeLeaf[]): Filter[] {
  return conditions.reduce((acc, condition) => {
    const { value, operator,values } = getOperator(condition.value, condition.operator)
    const filter: Filter = {
      value,
      values,
      operator,
      propertyName: condition.field,
    }

    acc.push(filter);

    return acc;
  }, [])
}

export default function translateFilter(conditionTree: ConditionTree): PublicObjectSearchRequest {
  let aggregator: Aggregator;
  const result: PublicObjectSearchRequest = {
    filterGroups: [],
    limit: null,
    after: null,
    query: null,
    sorts: null,
    properties: null,
  }

  if (conditionTree instanceof ConditionTreeBranch) {
    const conditions = getConditions(conditionTree.conditions as ConditionTreeLeaf[]);
    if (conditionTree.aggregator === "Or") {
      result.filterGroups = conditions.reduce((acc, condition) => {
        acc.push({ filters: [condition]});

        return acc;
      }, [])
    }
  } else {
    const conditions = getConditions([conditionTree] as ConditionTreeLeaf[]);
    result.filterGroups = [{ filters: conditions}]
    result.filterGroups = conditions.reduce((acc, condition) => {
      acc[0].filters.push(condition);

      return acc;
    }, [{ filters: []}])
  }

  return result;
}