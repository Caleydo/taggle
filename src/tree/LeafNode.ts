import ANode from './ANode';
import {IDataRow} from 'lineupjs/src/provider/ADataProvider';

export default class LeafNode<T> extends ANode implements IDataRow {
  readonly type: 'leaf' = 'leaf';
  height = 20;

  doi: number = 0.5;
  static readonly visTypes = ['default', 'compact'];

  constructor(public readonly item: T, public readonly dataIndex: number) {
    super();
  }

  get v() {
    return this.item;
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
