import type {
  ChartHandlerInterface,
  ContextVariablesInstantiatorInterface,
  ForestAdminClient,
  IpWhitelistConfiguration,
  ModelCustomizationService,
  UserInfo,
} from '@forestadmin/forestadmin-client';

export const CURRENT_USER: UserInfo = {
  id: 1,
  email: 'forest@forest.com',
  firstName: 'forest',
  lastName: 'admin',
  team: 'admin',
  renderingId: 1,
  role: 'Admin',
  permissionLevel: 'admin',
  tags: {},
};

export default class ForestAdminClientMock implements ForestAdminClient {
  readonly chartHandler: ChartHandlerInterface;

  readonly contextVariablesInstantiator: ContextVariablesInstantiatorInterface;

  readonly modelCustomizationService: ModelCustomizationService;

  readonly permissionService: any;

  readonly authService: any;

  constructor() {
    this.permissionService = {
      canOnCollection: () => true,
      canTriggerCustomAction: () => true,
      doesTriggerCustomActionRequiresApproval: () => false,
      canApproveCustomAction: () => true,
      canRequestCustomActionParameters: () => true,
      canExecuteChart: () => true,
      canExecuteSegmentQuery: () => true,
      getConditionalTriggerCondition: () => undefined,
      getConditionalRequiresApprovalCondition: () => undefined,
      getConditionalApproveCondition: () => undefined,
      getConditionalApproveConditions: () => undefined,
      getRoleIdsAllowedToApproveWithoutConditions: () => undefined,
    };
    this.authService = {
      init: () => Promise.resolve(undefined),
      getUserInfo: () => Promise.resolve<UserInfo>(CURRENT_USER),
      generateAuthorizationUrl: () => Promise.resolve(undefined),
      generateTokens: () => Promise.resolve({ accessToken: 'AUTH-TOKEN' }),
    };
  }

  close(): void {
    // Do nothing
  }

  getIpWhitelistConfiguration(): Promise<IpWhitelistConfiguration> {
    return Promise.resolve({ isFeatureEnabled: false, ipRules: [] });
  }

  getScope(): Promise<undefined> {
    return Promise.resolve<undefined>(undefined);
  }

  markScopesAsUpdated(): void {
    // Do nothing
  }

  onRefreshCustomizations(): void {
    // Do nothing
  }

  postSchema(): Promise<boolean> {
    return Promise.resolve(true);
  }

  subscribeToServerEvents(): Promise<void> {
    return Promise.resolve();
  }

  verifySignedActionParameters<TSignedParameters>(): TSignedParameters {
    return undefined;
  }
}
