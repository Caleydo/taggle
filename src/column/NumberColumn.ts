import {LeafNode, InnerNode} from '../tree';
import AColumn from './AColumn';
import {IRow, IColumn} from '../data';

export default class NumberColumn extends AColumn {
  private maxValue: number = 1;
  private readonly range: [number, number];

  constructor(index: number, column: IColumn, rebuild: (name: string|null, additional: boolean)=>void, width = 100) {
    super(index, column, rebuild, false, width);
    this.range = this.column.value.range!;
    this.maxValue = this.range[1];
  }

  createHeader(document: Document) {
    const d = this.common(document);
    d.title = this.name;
    d.innerHTML = `<span>${this.name}</span><br><input type="range" min="${this.range[0]}" max="${this.range![1]}" value="${this.maxValue}" step="0.1">`;
    (<HTMLInputElement>d.lastElementChild).onchange = (evt) => {
      const v = (<HTMLInputElement>evt.target).value;
      this.maxValue = parseFloat(v);
      this.rebuild(null, false);
    };
    (<HTMLElement>d.firstElementChild).onclick = () => this.rebuild(this.name, false);
    return d;
  }

  filter(row: LeafNode<IRow>) {
    const v = <number>row.item[this.name];
    if (isNaN(v)) {
      return this.maxValue >= this.range[1];
    }
    return v <= this.maxValue;
  }

  private rescale(v: number) {
    return (v - this.range[0]) / (this.range[1] - this.range[0]);
  }

  createSingle(document: Document, row: LeafNode<IRow>) {
    const n = this.common(document);
    n.innerHTML = `<div class="bar"></div>`;
    return this.updateSingle(n, row);
  }

  updateSingle(node: HTMLElement, row: LeafNode<IRow>) {
    node.dataset.group = row.parent!.name;
    const bar = <HTMLElement>node.children[0];
    const v = <number>row.item[this.name];
    const showLabel = row.visType === 'default';
    if (isNaN(v)) {
      bar.style.width = '0';
      bar.textContent = showLabel ? 'NaN' : '';
    } else {
      bar.style.width = `${Math.round(this.rescale(v) * 100)}%`;
      bar.textContent = showLabel ? v.toFixed(2) : '';
    }
    return node;
  }

  createGroup(document: Document, row: InnerNode) {
    const n = this.common(document);
    if (row.visType === 'default') {
      n.innerHTML = `<div class="bin"></div><div class="bin"></div><div class="bin"></div><div class="bin"></div><div class="bin"></div>`;
    } else {
      n.innerHTML = `<div class="bar"></div>`;
    }
    return this.updateGroup(n, row);
  }

  updateGroup(node: HTMLElement, row: InnerNode) {
    node.dataset.group = row.name;
    if (row.visType === 'default') {
      const hist = <number[]>row.aggregate[this.name];
      const max = Math.max(...hist);
      hist.forEach((bin, i) => {
        const binNode = <HTMLElement>node.children[i];
        binNode.style.height = `${Math.round(bin * 100 / max)}%`;
        binNode.title = `#${bin}`;
      });
    } else {
      const children = row.flatLeaves<IRow>().map((c) => <number>c.item[this.name]).filter((v) => !isNaN(v));
      const mean = children.reduce((a, c) => a + c,  0) / children.length;
      const bar = <HTMLElement>node.children[0];
      bar.style.width = `${Math.round(this.rescale(mean) * 100)}%`;
      bar.textContent = mean.toFixed(2);
    }
    return node;
  }
}

export function computeHist(leaves: LeafNode<IRow>[], column: IColumn) {
  const range = column.value.range!;
  const bins = [0, 0, 0, 0, 0];

  leaves.forEach((leaf) => {
    const bin = Math.round(((<number>leaf.item[column.name] - range[0])/(range[1] - range[0])) * 5) % 5;
    if (!isNaN(bin)) {
      bins[bin] ++;
    }
  });

  return bins;
}
