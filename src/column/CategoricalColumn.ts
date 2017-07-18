import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';


export default class CategoricalColumn extends AColumn {
  constructor(index: number, name: string, width = 100) {
    super(index, name, false, width);
  }

  createSingle(row: LeafNode<number>, index: number, document: Document) {
    const n = this.common(document);
    n.classList.add('cat');
    return this.updateSingle(n, row, index);
  }

  static isEven(node: LeafNode<number>) {
    return Math.round(node.item * 10) %2 === 0;
  }


  updateSingle(node: HTMLElement, row: LeafNode<number>, index: number) {
    const even = CategoricalColumn.isEven(row);
    if(even) {
      node.classList.remove('odd');
      node.classList.add('even');
    } else {
      node.classList.add('odd');
      node.classList.remove('even');
    }
    return node;
  }

  createGroup(row: InnerNode, index: number, document: Document) {
    const n = this.common(document);
    n.classList.add('cat');
    n.innerHTML = `<div class="even"></div><div class="odd"></div>`;
    return this.updateGroup(n, row, index);
  }

  updateGroup(node: HTMLElement, row: InnerNode, index: number) {
    let evens = 0;
    let odds = 0;
    row.flatLeaves<number>().forEach((n) => {
      const even = CategoricalColumn.isEven(n);
      if (even) {
        evens ++;
      } else {
        odds ++;
      }
    });

    node.firstElementChild.textContent = String(evens);
    node.lastElementChild.textContent = String(odds);

    return node;
  }
}

