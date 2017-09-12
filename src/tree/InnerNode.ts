import {INode} from './';
import {flat, flatLeaves} from './utils';
import LeafNode from './LeafNode';
import ANode from './ANode';
import {IGroupData} from 'lineupjs/src/ui/engine/interfaces';
import {IGroupParent} from 'lineupjs/src/model/Group';

export enum EAggregationType {
  AGGREGATED,
  NON_UNIFORM,
  UNIFORM
}

export default class InnerNode extends ANode implements IGroupData, IGroupParent {
  /**
   * @deprecated
   */
  static readonly visTypes = ['default', 'mean'];

  readonly type: 'inner' = 'inner';
  children: INode[] = [];
  aggregation: EAggregationType = EAggregationType.UNIFORM;
  aggregatedHeight = 40;
  aggregatedDoi = 0.5;

  aggregate: any;

  constructor(public readonly name: string, public readonly color: string = 'gray') {
    super();
  }

  get rows() {
    return this.flatLeaves();
  }

  get filtered(): boolean {
    return this.children.every((c) => c.filtered);
  }

  get subGroups() {
    return <InnerNode[]>this.children.filter((g) => g.type === 'inner');
  }

  toString() {
    return this.name;
  }

  flatChildren(): INode[] {
    const result: INode[] = [];
    return this.children.reduce((r, child) => flat(child, r), result);
  }

  get length() {
    return 1 + this.children.length;
  }

  get flatLength(): number {
    return 1 + this.children.reduce((r, n) => r + n.flatLength, 0);
  }

  get flatLeavesLength(): number {
    return this.children.reduce((r, n) => r + n.flatLeavesLength, 0);
  }

  flatLeaves<T>(): LeafNode<T>[] {
    const result: LeafNode<T>[] = [];
    return this.children.reduce((r, child) => flatLeaves(child, r), result);
  }

  get height() {
    if (this.aggregation === EAggregationType.AGGREGATED) {
      return this.aggregatedHeight;
    }
    return this.children.reduce((a, n) => a + n.height, 0);
  }

  get doi(): number {
    if (this.aggregation === EAggregationType.AGGREGATED) {
      return this.aggregatedDoi;
    }
    return this.children.reduce((a, n) => Math.max(a, n.doi), 0);
  }

  set height(value: number) {
    switch (this.aggregation) {
      case EAggregationType.AGGREGATED:
        this.aggregatedHeight = value;
        break;
      case EAggregationType.UNIFORM:
        const hi = value / this.children.length;
        this.children.forEach((n) => n.height = hi);
        break;
      case EAggregationType.NON_UNIFORM:
        const sizes = this.children.map((c) => c.flatLeavesLength);
        const total = sizes.reduce((a, c) => a + c, 0);
        this.children.forEach((c, i) => {
          if (c.type === 'inner') {
            c.aggregation = EAggregationType.AGGREGATED;
          }
          c.height = sizes[i] / total * value;
        });
        break;
    }
  }

}
