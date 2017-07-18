/**
 * Created by Samuel Gratzl on 13.07.2017.
 */
import {APrefetchRenderer, IRenderContext} from 'lineupengine/src/APrefetchRenderer';
import {nonUniformContext} from 'lineupengine/src/logic';
import {StyleManager, TEMPLATE} from 'lineupengine/src/style';
import {fromArray, INode, LeafNode, InnerNode, EAggregationType} from './tree';
import {StringColumn, computeCategoricalHist, computeNumericalHist, ITaggleColumn, NumberColumn, HierarchyColumn, CategoricalColumn} from './column';
import {data, columns, IRow} from './data';

function setTemplate(root: HTMLElement) {
  root.innerHTML = TEMPLATE;
  return root;
}


export default class TestRenderer extends APrefetchRenderer {
  private readonly style: StyleManager;
  protected _context: IRenderContext;

  private readonly columns: ITaggleColumn[];
  private readonly tree: InnerNode;
  private flat: INode[] = [];

  private readonly defaultRowHeight: number;

  constructor(private readonly root: HTMLElement) {
    super(<HTMLElement>setTemplate(root).querySelector('main > article'));
    root.id = 'taggle';
    root.classList.add('lineup-engine');

    this.defaultRowHeight = 20;
    this.tree = this.createTree(this.defaultRowHeight, [{renderer: 'default', height: 100}, {renderer: 'mean', height: this.defaultRowHeight}]);

    this.columns = [new HierarchyColumn(0, null, () => this.rebuild())];
    this.columns.push(...columns.map((col, i) => {
      switch(col.value.type) {
        case 'string': return new StringColumn(i + 1, col, true, 200);
        case 'categorical': return new CategoricalColumn(i + 1, col, 150);
        case 'int':
        case 'real': return new NumberColumn(i + 1, col, false, 150, () => this.rebuild());
      }
    }));
    this.style = new StyleManager(root, `#taggle`, this.defaultRowHeight);

    this.rebuildData();
  }

  private createTree(leafHeight: number, groupHeights: [{renderer: string, height: number}]): InnerNode {
    console.log(data.map((r) => r.Continent));
    const root = fromArray(data, leafHeight, (row: IRow) => {
      return <string>row.Continent || 'Others';
    });

    root.children.sort((a: any, b: any) => a.name.localeCompare(b.name));
    root.children.forEach((n) => {
      const inner = <InnerNode>n;
      if (Math.random() < 0.3) {
        inner.aggregation = EAggregationType.AGGREGATED;
      }

      const group = groupHeights[Math.floor(Math.random() * groupHeights.length)];
      inner.renderer = group.renderer;
      inner.aggregatedHeight = group.height;
      inner.aggregate = {};
      columns.forEach((col) => {
        if (col.value.type === 'int' || col.value.type === 'real') {
          inner.aggregate[col.name] = computeNumericalHist(inner.flatLeaves<IRow>(), col);
        } else if (col.value.type === 'categorical') {
          inner.aggregate[col.name] = computeCategoricalHist(inner.flatLeaves<IRow>(), col);
        }
      });
    });

    return root;
  }

  private getRow(index: number): INode {
    return this.flat[index];
  }


  run() {
    const header = <HTMLElement>this.root.querySelector('header');
    const headerNode = <HTMLElement>header.querySelector('article');

    this.style.update(this.columns, 150);
    this.columns.forEach((c) => headerNode.appendChild(c.createHeader(headerNode.ownerDocument)));

    //wait till layouted
    setTimeout(super.init.bind(this), 100, header);
  }

  protected onScrolledHorizontally(scrollLeft: number) {
    this.style.updateFrozenColumnsShift(this.columns, scrollLeft);
  }

  protected get context(): IRenderContext {
    return this._context;
  }

  protected createRow(node: HTMLElement, index: number) {
    const row = this.getRow(index);
    const document = node.ownerDocument;

    node.dataset.type = row.type;
    if (row.renderer !== 'default') {
      node.dataset.renderer = row.renderer;
    }

    this.columns.forEach((col, i) => {
      const child = row.type === 'leaf' ? col.createSingle(<LeafNode<IRow>>row, index, document) : col.createGroup(<InnerNode>row, index, document);
      node.appendChild(child);
    });
  }

  private rebuild() {
    this.rebuildData();
    this.recreate();
  }

  private rebuildData() {
    this.tree.flatLeaves<IRow>().forEach((n) => n.filtered = !this.columns.every((c) => c.filter(n)));
    this.flat = this.tree.flatChildren();
    const exceptions = nonUniformContext(this.flat.map((n) => n.height), this.defaultRowHeight);
    const scroller = <HTMLElement>this.root.querySelector('main');

    this._context = Object.assign({
      scroller
    }, exceptions);
  }

  protected updateRow(node: HTMLElement, index: number) {
    const row = this.getRow(index);
    const document = node.ownerDocument;

    const was = node.dataset.type;
    const renderer = node.dataset.renderer || 'default';
    const changed = was !== row.type || renderer !== row.renderer;

    node.dataset.type = row.type;
    if (row.renderer !== 'default') {
      node.dataset.renderer = row.renderer;
    }

    this.columns.forEach((col, i) => {
      const child = <HTMLElement>node.children[i];
      if (changed) {
        const replacement = row.type === 'leaf' ? col.createSingle(<LeafNode<IRow>>row, index, document) : col.createGroup(<InnerNode>row, index, document);
        node.replaceChild(replacement, child);
      } else {
        if (row.type === 'leaf') {
          col.updateSingle(child, <LeafNode<IRow>>row, index);
        } else {
          col.updateGroup(child, <InnerNode>row, index);
        }
      }
    });
  }
}
