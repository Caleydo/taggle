/**
 * Created by Samuel Gratzl on 13.07.2017.
 */
import {APrefetchRenderer, IRenderContext} from 'lineupengine/src/APrefetchRenderer';
import {nonUniformContext} from 'lineupengine/src/logic';
import {StyleManager, TEMPLATE} from 'lineupengine/src/style';
import {fromArray, INode, LeafNode, InnerNode, EAggregationType} from './tree';
import {StringColumn, computeHist, ITaggleColumn, NumberColumn, HierarchyColumn, CategoricalColumn} from './column';

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

  constructor(private readonly root: HTMLElement, numberOfRows = 1000) {
    super(<HTMLElement>setTemplate(root).querySelector('main > article'));
    root.id = 'taggle';
    root.classList.add('lineup-engine');

    this.defaultRowHeight = 20;
    this.tree = this.createTree(numberOfRows, this.defaultRowHeight, [{renderer: 'default', height: 100}, {renderer: 'mean', height: this.defaultRowHeight}]);

    {
      let i = 0;
      this.columns = [
        new HierarchyColumn(i++, () => this.rebuild()),
        new StringColumn(i++, 'String', true, 200),
        new NumberColumn(i++, 'Number', false, 200),
        new CategoricalColumn(i++, 'Categorical', 200)
      ];
    }
    this.style = new StyleManager(root, `#taggle`, this.defaultRowHeight);

    this.rebuildData();
  }

  private createTree(numberOfRows: number, leafHeight: number, groupHeights: [{renderer: string, height: number}]): InnerNode {
    const arr = Array.from(new Array(numberOfRows).keys()).map(() => Math.random());
    const root = fromArray(arr, leafHeight, (row: number) => String(Math.floor(Math.random()*5)));

    root.children.sort((a: any, b: any) => a.name.localeCompare(b.name));
    root.children.forEach((n) => {
      const inner = <InnerNode>n;
      if (Math.random() < 0.3) {
        inner.aggregation = EAggregationType.AGGREGATED;
      }

      const group = groupHeights[Math.floor(Math.random() * groupHeights.length)];
      inner.renderer = group.renderer;
      inner.aggregatedHeight = group.height;
      inner.aggregate = computeHist(inner.flatLeaves<number>());
    });

    return root;
  }

  private getRow(index: number): INode {
    return this.flat[index];
  }


  run() {
    const header = <HTMLElement>this.root.querySelector('header');
    const headerNode = <HTMLElement>header.querySelector('article');

    this.style.update(this.columns, 100);
    this.columns.forEach((c) => headerNode.appendChild(c.createHeader(headerNode.ownerDocument)));

    //wait till layouted
    setTimeout(super.init.bind(this), 100, headerNode);
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
      const child = row.type === 'leaf' ? col.createSingle(<LeafNode<number>>row, index, document) : col.createGroup(<InnerNode>row, index, document);
      node.appendChild(child);
    });
  }

  private rebuild() {
    this.rebuildData();
    this.recreate();
  }

  private rebuildData() {
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
        const replacement = row.type === 'leaf' ? col.createSingle(<LeafNode<number>>row, index, document) : col.createGroup(<InnerNode>row, index, document);
        node.replaceChild(replacement, child);
      } else {
        if (row.type === 'leaf') {
          col.updateSingle(child, <LeafNode<number>>row, index);
        } else {
          col.updateGroup(child, <InnerNode>row, index);
        }
      }
    });
  }
}
