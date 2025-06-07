import {
  ForestServerActionFormElementFieldReference,
  ForestServerActionFormLayoutElement,
} from '@forestadmin/forestadmin-client';

import ActionLayoutInput from './action-layout-input';
import { NotFoundElementError, NotRightElementError } from './errors';

export default class ActionLayoutElement {
  protected readonly layoutItem: ForestServerActionFormLayoutElement;

  constructor(layoutItem: ForestServerActionFormLayoutElement) {
    this.layoutItem = layoutItem;
  }

  getHtmlBlockContent() {
    if (this.layoutItem?.component !== 'htmlBlock') {
      throw new NotRightElementError('an htmlBlock', this.layoutItem);
    }

    return this.layoutItem.content;
  }

  getInputId(): string {
    if (!this.isInput()) {
      throw new NotRightElementError('an input', this.layoutItem);
    }

    return new ActionLayoutInput(
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

    return new ActionLayoutInput(this.layoutItem.fields[n]);
  }

  protected isInput() {
    return this.layoutItem?.component === 'input';
  }
}
