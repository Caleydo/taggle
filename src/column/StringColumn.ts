import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';

export default class StringColumn extends AColumn {
  constructor(index: number, column: IColumn, rebuild: (name: string|null, additional: boolean)=>void, width = 100) {
    super(index, column, rebuild, true, width);
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    return this.updateSingle(n, row);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    if (row.renderer === 'default') {
      node.textContent = <string>row.item[this.column.name];
    } else {
      node.textContent = '';
    }
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

