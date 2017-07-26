import {LeafNode, InnerNode, INode, EAggregationType} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';

const CARET_NO = '<i>&nbsp;</i>';
const CARET_DOWN = '<i>&#9660;</i>';
const CARET_RIGHT = '<i>&#9658;</i>';

export default class HierarchyColumn extends AColumn {
  constructor(index: number, column: IColumn, rebuild: (name: string|null, additional: boolean)=>void) {
    super(index, column, rebuild, true, 50);
  }

  common(document: Document) {
    const d = super.common(document);
    d.classList.add('hierarchy');
    return d;
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    return this.updateSingle(n, row);
  }

  private hierarchy(row: INode) {
    const p = row.parents;
    p.reverse();
    p.shift();
    return p.map((pi: InnerNode) => pi.isFirstChild ? CARET_DOWN : CARET_NO).join('');
  }

  private toggle(row: InnerNode, n: HTMLElement, index: number) {
    n.onclick = () => {
      const p = <InnerNode[]>row.path;
      p.reverse();
      const toggle = p[p.length === 1 ? 0 : index + 1];
      toggle.aggregation = toggle.aggregation === EAggregationType.UNIFORM ? EAggregationType.AGGREGATED : EAggregationType.UNIFORM;
      this.rebuild(null, false);
    };
  }


  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    node.innerHTML = row.isFirstChild ? this.hierarchy(row.parent!) + CARET_DOWN : '';
    Array.from(node.children).forEach(this.toggle.bind(this, row.parent));
    return node;
  }

  createGroup(document: Document, row: InnerNode) {
    const n = this.common(document);
    return this.updateGroup(n, row);
  }

  updateGroup(node: HTMLElement, row: InnerNode) {
    node.innerHTML = this.hierarchy(row) + CARET_RIGHT;
    Array.from(node.children).forEach(this.toggle.bind(this, row));
    return node;
  }
}

