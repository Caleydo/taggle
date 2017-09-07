import {LeafNode, InnerNode} from '../../tree';
import AColumn from './AColumn';
import {IRow} from '../../data';
import {IColumn} from '../../interfaces';


export default class CategoricalColumn extends AColumn {

  private readonly categories: {name: string, color: string}[];

  constructor(index: number, column: IColumn, rebuild: (name?: string|null, additional?: boolean)=>void, width = 100) {
    super(index, column, rebuild, false, width);

    this.categories = column.value.categories!;
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    return this.updateSingle(n, row);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    const v = String(row.item[this.name]);
    node.textContent = row.visType === 'default' ? v : '';
    node.style.backgroundColor = (this.categories.find((c) => c.name === v) || { color: 'magenta'}).color;
    return node;
  }

  createGroup(document: Document, row: InnerNode) {
    const n = this.common(document);
    if (row.visType === 'default') {
      n.innerHTML = this.categories.map((c) => `<div class="bin" style="background-color: ${c.color}"></div>`).join('');
    } else {
      n.innerHTML = ``;
    }
    return this.updateGroup(n, row);
  }

  updateGroup(node: HTMLElement, row: InnerNode) {
    const hist = <number[]>row.aggregate[this.name];
    const max = Math.max(...hist);
    if (row.visType === 'default') {
      hist.forEach((bin, i) => {
        const binNode = <HTMLElement>node.children[i];
        binNode.style.height = `${Math.round(bin * 100 / max)}%`;
        binNode.title = `#${bin}`;
      });
    } else {
      const maxBin = hist.findIndex((d) => d === max);
      node.textContent = `#${maxBin}: ${max}`;
      node.style.backgroundColor = this.categories[maxBin].color;
    }
    return node;
  }
}

