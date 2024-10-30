import { ForestServerActionFormLayoutElement } from '@forestadmin/forestadmin-client';

import { NotRightElementError } from './errors';

export default class TestableActionLayoutInput {
  protected readonly layoutItem: ForestServerActionFormLayoutElement;

  constructor(layoutItem: ForestServerActionFormLayoutElement) {
    this.layoutItem = layoutItem;
  }

  getInputId() {
    if (this.layoutItem?.component !== 'input') {
      throw new NotRightElementError('input', this.layoutItem);
    }

    return this.layoutItem.fieldId;
  }
}
