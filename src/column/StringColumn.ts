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

  createSingle(row: LeafNode<IRow>, index: number, document: Document) {
    const n = this.common(document);
    return this.updateSingle(n, row, index);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number) {
    node.textContent = <string>row.item[this.column.name];
    return node;
  }

  createGroup(row: InnerNode, index: number, document: Document) {
    const n = this.common(document);
    return this.updateGroup(n, row, index);
  }

  updateGroup(node: HTMLElement, row: InnerNode, index: number) {
    node.textContent = `${row.name} #${row.length}`;
    return node;
  }
}

