import { NotFoundElementError, NotRightElementError } from './errors';
import TestableActionLayoutInput from './testable-action-layout-input';

export default class TestableActionLayoutElement extends TestableActionLayoutInput {
  isSeparator() {
    return this.layoutItem?.component === 'separator';
  }

  isRow() {
    return this.layoutItem?.component === 'row';
  }

  isHTMLBlock() {
    return this.layoutItem?.component === 'htmlBlock';
  }

  getHtmlBlockContent() {
    if (this.layoutItem?.component !== 'htmlBlock') {
      throw new NotRightElementError('an htmlBlock', this.layoutItem);
    }

    return this.layoutItem.content;
  }

  rowElement(n: number) {
    if (this.layoutItem?.component !== 'row') {
      throw new NotRightElementError('a row', this.layoutItem);
    }

    if (n < 0 || n >= this.layoutItem.fields.length) throw new NotFoundElementError(0);

    return new TestableActionLayoutInput(this.layoutItem.fields[n]);
  }
}
