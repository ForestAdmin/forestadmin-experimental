import type { CollectionCustomizer } from '@forestadmin/agent';
import { ActionContextSingle } from '@forestadmin/agent';
import { TSchema } from '@forestadmin/datasource-customizer';

export type CollectionCustomizerFunction = (collection: CollectionCustomizer, ...args: any[]) => void;

export type TestableAction = {
  name: Parameters<CollectionCustomizer['addAction']>['0'];
  definition: Parameters<CollectionCustomizer['addAction']>['1'];
};

export type TestableHook = {
  position: Parameters<CollectionCustomizer['addHook']>['0'];
  type: Parameters<CollectionCustomizer['addHook']>['1'];
  handler: Parameters<CollectionCustomizer['addHook']>['2'];
};

export type TestableField = {
  name: Parameters<CollectionCustomizer['addField']>['0'];
  definition: Parameters<CollectionCustomizer['addField']>['1'];
};

export type TestableImportedField = {
  name: Parameters<CollectionCustomizer['importField']>['0'];
  options: Parameters<CollectionCustomizer['importField']>['1'];
};

export type TestableSearchReplacement = Parameters<CollectionCustomizer['replaceSearch']>['0'];

export type TestableAddedManyToOneRelation = {
  name: Parameters<CollectionCustomizer['addManyToOneRelation']>['0'];
  foreignCollection: Parameters<CollectionCustomizer['addManyToOneRelation']>['1'];
  options: Parameters<CollectionCustomizer['addManyToOneRelation']>['2'];
};

export type ActionContext = ActionContextSingle<TSchema, any> & {
  formValues: any;
};

export type Context = Record<string, any>;
