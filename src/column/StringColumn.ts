import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';

export default class StringColumn extends AColumn {
  constructor(index: number, column: IColumn, frozen: boolean = false, width = 100) {
    super(index, column, frozen, width);
  }

  common(document: Document) {
    const d = super.common(document);
    d.classList.add('string');
    return d;
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    return this.updateSingle(n, row);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    node.textContent = <string>row.item[this.column.name];
    return node;
  }

  createGroup(document: Document, row: InnerNode) {
    const n = this.common(document);
    return this.updateGroup(n, row);
  }

  updateGroup(node: HTMLElement, row: InnerNode) {
    node.textContent = `${row.name} #${row.length}`;
    return node;
  }
}

