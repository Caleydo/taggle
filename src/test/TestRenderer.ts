/**
 * Created by Samuel Gratzl on 13.07.2017.
 */
import {ACellRenderer, ICellRenderContext} from 'lineupengine/src';
import {nonUniformContext} from 'lineupengine/src/logic';
import {EAggregationType, InnerNode, INode, LeafNode} from '../tree';
import {IRow, IColumn} from '../data';
import {ICallbacks, ITaggleRenderer} from '../App';
import HierarchyColumn from './column/HierarchyColumn';
import CategoricalColumn from './column/CategoricalColumn';
import NumberColumn from './column/NumberColumn';
import {StringColumn, ITaggleColumn} from './column';
import {reorderTree, restratifyTree} from '../data/utils';
import {IRuleSet} from '../rule/index';

export default class TestRenderer extends ACellRenderer<ITaggleColumn> implements ITaggleRenderer {
  protected _context: ICellRenderContext<ITaggleColumn>;

  private readonly columns: ITaggleColumn[];
  private flat: INode[] = [];
  private initialized: boolean = false;
  private groupBy: string[] = [];

  private tree: InnerNode;
  private ruleSet: IRuleSet;

  constructor(root: HTMLElement, columns: IColumn[], private readonly callbacks: ICallbacks) {
    super(root);
    root.id = 'taggle';
    this.columns = this.createColumns(columns);
  }

  private getRow(index: number): INode {
    return this.flat[index];
  }


  protected get context() {
    return this._context;
  }

  private createColumns(columns: IColumn[]) {
    const rebuilder = (name: string | null, additional: boolean) => this.resort(name, additional);
    const cols = <ITaggleColumn[]>[new HierarchyColumn(0, {name: '', value: {type: 'string'}}, rebuilder)];
    cols.push(...columns.map((col, i) => {
      switch (col.value.type) {
        case 'categorical':
          return new CategoricalColumn(i + 1, col, rebuilder, 150);
        case 'int':
        case 'real':
          return new NumberColumn(i + 1, col, rebuilder, 150);
        default:
          return new StringColumn(i + 1, col, rebuilder, 200);
      }
    }));
    return cols;
  }

  initTree(tree: InnerNode, ruleSet: IRuleSet) {
    const columns = this.columns.map((d) => d.column);
    // initial grouping and sorting
    if (ruleSet.stratificationLevels > 0) {
      restratifyTree(columns, tree, ['Continent']);
    }
    if (ruleSet.sortLevels > 0) {
      reorderTree(columns, tree, 'Population (2017)');
    }
    // random aggregation
    //visit<IRow>(root, (inner: InnerNode) => {
    //  if (Math.random() < 0.3) {
    //    inner.aggregation = EAggregationType.AGGREGATED;
    //  }
    //  const group = groupHeights[Math.floor(Math.random() * groupHeights.length)];
    //   inner.visType = group.renderer;
    //  inner.aggregatedHeight = group.height;
    //  return true;
    //}, () => undefined);
  }

  rebuild(tree: InnerNode, ruleSet: IRuleSet) {
    this.tree = tree;
    this.ruleSet = ruleSet;

    const defaultRowHeight = typeof ruleSet.leaf.height === 'number' ? ruleSet.leaf.height : 20;

    tree.flatLeaves<IRow>().forEach((n) => n.filtered = !this.columns.every((c) => c.filter(n)));
    this.flat = tree.aggregation === EAggregationType.AGGREGATED ? [tree] : tree.flatChildren();
    const exceptions = nonUniformContext(this.flat.map((n) => n.height), defaultRowHeight);
    const columnExceptions = nonUniformContext(this.columns.map((c) => c.width), 150);

    const scroller = <HTMLElement>this.root.querySelector('main');
    this._context = Object.assign({
      scroller,
      columns: this.columns,
      column: columnExceptions,
      htmlId: '#taggle'
    }, exceptions);

    if (!this.initialized) {
      this.initialized = true;
      this.init();
    } else {
      this.recreate();
    }
  }

  private selectRow(index: number, additional: boolean, node: HTMLElement) {
    const row = this.getRow(index);
    const was = row.selected;
    if (additional) {
      row.selected = !was;
      node.classList.toggle('selected');
      this.callbacks.selectionChanged();
      return;
    }
    //clear all
    this.flat.forEach((n) => n.selected = false);
    Array.from(this.body.querySelectorAll('.selected')).forEach((n) => n.classList.remove('selected'));
    //toggle single
    if (!was) {
      row.selected = true;
      node.classList.add('selected');
    }
    this.callbacks.selectionChanged();
  }

  protected createHeader(document: Document, column: ITaggleColumn) {
    return column.createHeader(document);
  }

  protected updateHeader(node: HTMLElement, column: ITaggleColumn) {
    column.updateHeader(node);
  }

  protected createCell(document: Document, index: number, column: ITaggleColumn) {
    const row = this.getRow(index);
    const cell = row.type === 'leaf' ? column.createSingle(document, <LeafNode<IRow>>row, index) : column.createGroup(document, <InnerNode>row, index);
    cell.dataset.type = row.type;
    if (row.visType !== 'default') {
      cell.dataset.visType = row.visType;
    }
    return cell;
  }

  protected updateCell(node: HTMLElement, index: number, column: ITaggleColumn) {
    const row = this.getRow(index);
    const document = node.ownerDocument;

    const was = node.dataset.type;
    const visType = node.dataset.visType || 'default';
    const changed = was !== row.type || visType !== row.visType;

    if (changed) {
      return this.createCell(document, index, column);
    }
    if (row.type === 'leaf') {
      column.updateSingle(node, <LeafNode<IRow>>row, index);
    } else {
      column.updateGroup(node, <InnerNode>row, index);
    }
    return node;
  }

  protected createRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    node.onclick = (evt) => {
      this.selectRow(rowIndex, evt.shiftKey || evt.altKey || evt.ctrlKey, node);
      evt.stopPropagation();
    };
    if (this.getRow(rowIndex).selected) {
      node.classList.add('selected');
    }
    return super.createRow(node, rowIndex, ...extras);
  }

  protected updateRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    node.onclick = (evt) => {
      this.selectRow(rowIndex, evt.shiftKey || evt.altKey || evt.ctrlKey, node);
      evt.stopPropagation();
    };
    node.classList.remove('selected');
    if (this.getRow(rowIndex).selected) {
      node.classList.add('selected');
    }
    return super.updateRow(node, rowIndex, ...extras);
  }


  private resort(groupOrSortBy: string | null, additional: boolean) {
    if (groupOrSortBy) {
      const columns = this.columns.map((d) => d.column);
      const column = columns.find((c) => c.name === groupOrSortBy)!;
      if (column.value.type === 'categorical') {
        this.groupBy = additional ? this.groupBy.concat([groupOrSortBy]) : [groupOrSortBy];
        if (this.groupBy.length > this.ruleSet.stratificationLevels) {
          this.groupBy = this.groupBy.slice(0, this.ruleSet.stratificationLevels);
        }
        if (this.groupBy.length > 0) {
          restratifyTree(columns, this.tree, this.groupBy);
        }
      } else if (this.ruleSet.sortLevels > 0) {
        // TODO support multi sorting
        reorderTree(columns, this.tree, groupOrSortBy);
      }
    }

    this.update();
  }
}
