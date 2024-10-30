import { NotFoundElementError, NotRightElementError } from './errors';
import TestableActionLayoutElementsContainer from './testable-action-layout-base';
import TestableActionLayoutPage from './testable-action-layout-page';

export default class TestableActionLayoutRoot extends TestableActionLayoutElementsContainer {
  page(n: number) {
    if (n < 0 || n >= this.layout.length) throw new NotFoundElementError(n);
    if (!this.isPage(n)) throw new NotRightElementError('a page', this.layout[n]);

    return new TestableActionLayoutPage(this.layout[n]);
  }
}
