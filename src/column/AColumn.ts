import {LeafNode, InnerNode} from '../tree';
import ITaggleColumn from './ITaggleColumn';
import {IRow, IColumn} from '../data';
import {INode} from '../tree';

export abstract class AColumn implements ITaggleColumn {
  constructor(public readonly index: number, public readonly column: IColumn, protected readonly rebuild: (name?: string, node?: INode)=>void, public readonly frozen: boolean = false, public readonly width = 100) {

  }

  get name() {
    return this.column ? this.column.name : '';
  }

  get id() {
    return `col${this.index}`;
  }

  filter(_row: LeafNode<IRow>) {
    return true;
  }

  common(document: Document) {
    const node = document.createElement('div');
    if (this.frozen) {
      node.classList.add('frozen');
    }
    node.classList.add(this.column.value.type);
    node.dataset.id = this.id;
    return node;
  }

  createHeader(document: Document) {
    const node = this.common(document);
    node.textContent = this.name;
    node.title = this.name;
    if (this.name !== '') {
      node.onclick = () => this.rebuild(this.name);
    }
    return node;
  }

  updateHeader(node: HTMLElement) {
    node.title = this.name;
  }

  abstract createSingle(document: Document, row: LeafNode<IRow>, index: number): HTMLElement;
  abstract updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number): HTMLElement;

  abstract createGroup(document: Document, row: InnerNode, index: number): HTMLElement;
  abstract updateGroup(node: HTMLElement, row: InnerNode, index: number): HTMLElement;
}

export default AColumn;
