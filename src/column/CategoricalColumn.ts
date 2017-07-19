import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';


export default class CategoricalColumn extends AColumn {

  private readonly categories: {name: string, color: string}[];

  constructor(index: number, column: IColumn, rebuild: (name?: string)=>void, width = 100) {
    super(index, column, rebuild, false, width);

    this.categories = column.value.categories!;
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    return this.updateSingle(n, row);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    const v = String(row.item[this.name]);
    node.textContent = v;
    node.style.backgroundColor = (this.categories.find((c) => c.name === v) || { color: 'magenta'}).color;
    return node;
  }

  createGroup(document: Document, row: InnerNode) {
    const n = this.common(document);
    n.innerHTML = this.categories.map((c) => `<div class="bin" style="background-color: ${c.color}"></div>`).join('');
    return this.updateGroup(n, row);
  }

  updateGroup(node: HTMLElement, row: InnerNode) {
    const hist = <number[]>row.aggregate[this.name];
    const max = Math.max(...hist);
    hist.forEach((bin, i) => {
      const binNode = <HTMLElement>node.children[i];
      binNode.style.transform = `translateY(${Math.round((max - bin) * 100 / max)}%)`;
      binNode.textContent = `#${bin}`;
    });
    return node;
  }
}

export function computeHist(leaves: LeafNode<IRow>[], column: IColumn) {
  const categories = column.value.categories!;
  const bins = categories.map(() => 0);

  leaves.forEach((leaf) => {
    const v = <string>leaf.item[column.name];
    const index = categories.findIndex((c) => c.name === v);
    if (index >= 0) {
      bins[index] ++;
    }
  });

  return bins;
}


