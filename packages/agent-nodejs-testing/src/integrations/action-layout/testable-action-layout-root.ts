import { NotFoundElementError, NotRightElementError } from './errors';
import TestableActionLayoutBase from './testable-action-layout-base';
import TestableActionLayoutPage from './testable-action-layout-page';

export default class TestableActionLayoutRoot extends TestableActionLayoutBase {
  page(n: number) {
    if (n < 0 || n >= this.layout.length) throw new NotFoundElementError(n);
    if (!this.isPage(n)) throw new NotRightElementError('a page', this.layout[n]);

    return new TestableActionLayoutPage(this.layout[n]);
  }
}
