import ANode from './ANode';

export default class LeafNode<T> extends ANode {
  readonly type: 'leaf' = 'leaf';
  height = 20;

  filtered: boolean = false;

  constructor(public readonly item: T) {
    super();
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
    return this.item.toString();
  }
}
