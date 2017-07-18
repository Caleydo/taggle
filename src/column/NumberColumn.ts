import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';

export default class NumberColumn extends AColumn {
  private maxValue: number = 1;

  constructor(index: number, column: IColumn, frozen: boolean = false, width = 100, private readonly rebuilder: ()=>void) {
    super(index, column, frozen, width);
    this.maxValue = this.column.value.range[1];
  }

  createHeader(document: Document) {
    const d = this.common(document);
    d.title = this.name;
    d.innerHTML = `<span>${this.name}</span><br><input type="range" min="${this.column.value.range[0]}" max="${this.column.value.range[1]}" value="${this.column.value.range[1]}" step="0.1">`;
    (<HTMLInputElement>d.lastElementChild).onchange = (evt) => {
      const v = (<HTMLInputElement>evt.target).value;
      this.maxValue = parseFloat(v);
      this.rebuilder();
    };
    return d;
  }

  filter(row: LeafNode<IRow>) {
    const v = <number>row.item[this.name];
    return isNaN(v) || v <= this.maxValue;
  }

  private rescale(v: number) {
    const range = this.column.value.range;
    return (v - range[0]) / (range[1] - range[0]);
  }

  createSingle(row: LeafNode<IRow>, index: number, document: Document) {
    const n = this.common(document);
    n.innerHTML = `<div class="bar"></div>`;
    return this.updateSingle(n, row, index);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>, index: number) {
    node.dataset.group = row.parent.name;
    const bar = <HTMLElement>node.children[0];
    const v = <number>row.item[this.name];
    if (isNaN(v)) {
      bar.style.width = '0';
      bar.textContent = 'NaN';
    } else {
      bar.style.width = `${Math.round(this.rescale(v) * 100)}%`;
      bar.textContent = v.toFixed(2);
    }
    return node;
  }

  createGroup(row: InnerNode, index: number, document: Document) {
    const n = this.common(document);
    if (row.renderer === 'default') {
      n.innerHTML = `<div class="bin"></div><div class="bin"></div><div class="bin"></div><div class="bin"></div><div class="bin"></div>`;
    } else {
      n.innerHTML = `<div class="bar"></div>`;
    }
    return this.updateGroup(n, row, index);
  }

  updateGroup(node: HTMLElement, row: InnerNode, index: number) {
    node.dataset.group = row.name;
    if (row.renderer === 'default') {
      const hist = <number[]>row.aggregate[this.name];
      const max = Math.max(...hist);
      hist.forEach((bin, i) => {
        const binNode = <HTMLElement>node.children[i];
        binNode.style.transform = `translateY(${Math.round((max - bin) * 100 / max)}%)`;
        binNode.textContent = `#${bin}`;
      });
    } else {
      const children = row.flatLeaves<IRow>();
      const mean = children.reduce((a, c) => a + <number>c.item[this.name],  0) / children.length;
      const bar = <HTMLElement>node.children[0];
      bar.style.width = `${Math.round(this.rescale(mean) * 100)}%`;
      bar.textContent = mean.toFixed(2);
    }
    return node;
  }
}

export function computeHist(leaves: LeafNode<IRow>[], column: IColumn) {
  const bins = [0, 0, 0, 0, 0];

  const minmax = column.value.range;

  leaves.forEach((leaf) => {
    const bin = Math.round(((<number>leaf.item[column.name] - minmax[0])/(minmax[1] - minmax[0])) * 5) % 5;
    if (!isNaN(bin)) {
      bins[bin] ++;
    }
  });

  return bins;
}
