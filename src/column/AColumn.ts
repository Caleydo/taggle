import {setColumn} from 'lineupengine/src/style';
import {LeafNode, InnerNode} from '../tree';
import ITaggleColumn from './ITaggleColumn';
import {IRow, IColumn} from '../data';

export abstract class AColumn implements ITaggleColumn {
  constructor(public readonly index: number, public readonly column: IColumn, public readonly frozen: boolean = false, public readonly width = 100) {

  }

  get name() {
    return this.column ? this.column.name : '';
  }

  get id() {
    return `col${this.index}`;
  }

  filter(row: LeafNode<IRow>) {
    return true;
  }

  common(document: Document) {
    const d = document.createElement('div');
    if (this.frozen) {
      d.classList.add('frozen');
    }
    d.dataset.id = this.id;
    setColumn(d, this);
    return d;
  }

  createHeader(document: Document) {
    const d = this.common(document);
    d.textContent = this.name;
    d.title = this.name;
    return d;
  }

  abstract createSingle(row: LeafNode<IRow>, index: number, document: Document): HTMLElement;
  abstract updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number): HTMLElement;

  abstract createGroup(row: InnerNode, index: number, document: Document): HTMLElement;
  abstract updateGroup(node: HTMLElement, row: InnerNode, index: number): HTMLElement;
}

export default AColumn;
