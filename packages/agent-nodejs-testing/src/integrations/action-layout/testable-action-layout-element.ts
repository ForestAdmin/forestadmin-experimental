import {
  ForestServerActionFormElementFieldReference,
  ForestServerActionFormLayoutElement,
} from '@forestadmin/forestadmin-client';

import { NotFoundElementError, NotRightElementError } from './errors';
import TestableActionLayoutInput from './testable-action-layout-input';

export default class TestableActionLayoutElement {
  protected readonly layoutItem: ForestServerActionFormLayoutElement;

  constructor(layoutItem: ForestServerActionFormLayoutElement) {
    this.layoutItem = layoutItem;
  }

  isSeparator() {
    return this.layoutItem?.component === 'separator';
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

  isInput() {
    return this.layoutItem?.component === 'input';
  }

  getInputId(): string {
    if (!this.isInput()) {
      throw new NotRightElementError('an input', this.layoutItem);
    }

    return new TestableActionLayoutInput(
      this.layoutItem as ForestServerActionFormElementFieldReference,
    ).getInputId();
  }

  isRow() {
    return this.layoutItem?.component === 'row';
  }

  rowElement(n: number) {
    if (this.layoutItem?.component !== 'row') {
      throw new NotRightElementError('a row', this.layoutItem);
    }

    if (n < 0 || n >= this.layoutItem.fields.length) throw new NotFoundElementError(0);

    return new TestableActionLayoutInput(this.layoutItem.fields[n]);
  }
}
