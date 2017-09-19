import ANode from './ANode';
import {IGroupItem} from 'lineupjs/src/ui/engine/interfaces';
import {defaultGroup} from 'lineupjs/src/model/Group';

export default class LeafNode<T> extends ANode implements IGroupItem {
  /**
   * @deprecated
   */
  static readonly visTypes = ['default', 'compact'];

  readonly type: 'leaf' = 'leaf';
  height = 20;
  doi: number = 0.5;

  constructor(public readonly item: T, public readonly dataIndex: number) {
    super();
  }

  get v() {
    return this.item;
  }

  get group() {
    return this.parent || defaultGroup;
  }

  get relativeIndex() {
    if (!this.parent) {
      return 0;
    }
    return this.parent.children.indexOf(this);
  }

  set filtered(value: boolean) {
    this.doi = value ? 0 : 0.5;
  }

  get filtered() {
    return this.doi === 0;
  }

  get length() {
    return this.filtered ? 0 : 1;
  }

  get flatLength() {
    return this.length;
  }

  get flatLeavesLength() {
    return this.length;
  }

  toString() {
    // try to find a suitable string
    const val = Object.values(this.item).find((x) => typeof(x) === 'string');
    return val ? val : this.item.toString();
  }
}
