import { ForestServerActionFormLayoutElement } from '@forestadmin/forestadmin-client';

import TestableActionLayoutElementsContainer from './testable-action-layout-base';

export default class TestableActionLayoutPage extends TestableActionLayoutElementsContainer {
  readonly nextButtonLabel: string;
  readonly previousButtonLabel: string;

  constructor(layout: ForestServerActionFormLayoutElement) {
    if (layout.component !== 'page') throw new Error('This is not a page');

    super(layout.elements);
    this.nextButtonLabel = layout.nextButtonLabel;
    this.previousButtonLabel = layout.previousButtonLabel;
  }
}
