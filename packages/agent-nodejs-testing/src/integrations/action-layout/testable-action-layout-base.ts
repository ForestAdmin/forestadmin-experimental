import { ForestServerActionFormLayoutElement } from '@forestadmin/forestadmin-client';

import { NotFoundElementError, NotRightElementError } from './errors';
import TestableActionLayoutElement from './testable-action-layout-element';

export default abstract class TestableActionLayoutBase {
  protected readonly layout: ForestServerActionFormLayoutElement[];

  constructor(layout: ForestServerActionFormLayoutElement[]) {
    this.layout = layout;
  }

  element(n: number) {
    if (n < 0 || n >= this.layout.length) throw new NotFoundElementError(n);
    if (this.isPage(n)) throw new NotRightElementError('an element', this.layout[n]);

    return new TestableActionLayoutElement(this.layout[n]);
  }

  protected isPage(n: number) {
    return this.layout[n]?.component === 'page';
  }
}
