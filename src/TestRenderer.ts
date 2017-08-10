/**
 * Created by Samuel Gratzl on 13.07.2017.
 */
import {ACellRenderer, ICellRenderContext} from 'lineupengine/src';
import {nonUniformContext} from 'lineupengine/src/logic';
import {EAggregationType, InnerNode, INode, LeafNode} from './tree';
import {
  CategoricalColumn,
  HierarchyColumn,
  ITaggleColumn,
  NumberColumn,
  StringColumn
} from './column';
import {columns, data, IRow} from './data';
import DebugInterface from './DebugInterface';
import {applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSet} from './rule/index';
import {createTree, reorderTree, restratifyTree} from './utils';

export default class TestRenderer extends ACellRenderer<ITaggleColumn> {
  protected _context: ICellRenderContext<ITaggleColumn>;

  private readonly columns: ITaggleColumn[];
  private readonly tree: InnerNode;
  private flat: INode[] = [];
  private readonly debug: DebugInterface;

  private defaultRowHeight: number;
  private ruleSet: IRuleSet = defaultRuleSet;

  private groupBy: string[] = [];

  constructor(root: HTMLElement) {
    super(root);
    root.id = 'taggle';

    this.defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = createTree(data, columns, this.defaultRowHeight, this.ruleSet);

    const rebuilder = (name: string | null, additional: boolean) => this.rebuild(name, additional);
    this.columns = [new HierarchyColumn(0, {name: '', value: {type: 'string'}}, rebuilder)];
    this.columns.push(...columns.map((col, i) => {
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

    this.debug = new DebugInterface(this.root.parentElement!, () => this.rebuild(null, false), (rule) => {
      this.ruleSet = rule;
      this.defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
      applyStaticRuleSet(rule, this.tree);
      this.rebuild(null, false);
    });
    this.rebuildData();
  }


  private getRow(index: number): INode {
    return this.flat[index];
  }

  run() {
    this.debug.update(this.tree);
    //wait till layouted
    setTimeout(this.init.bind(this), 100);
  }

  protected get context() {
    return this._context;
  }

  private rebuild(groupOrSortBy: string | null, additional: boolean) {
    if (groupOrSortBy) {
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
    this.rebuildData();
    this.recreate();
    this.debug.update(this.tree);
  }

  private selectRow(index: number, additional: boolean, node: HTMLElement) {
    const row = this.getRow(index);
    const was = row.selected;
    if (additional) {
      row.selected = !was;
      node.classList.toggle('selected');
      this.rebuild(null, false);
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
    this.rebuild(null, false);
  }

  private rebuildData() {
    applyDynamicRuleSet(this.ruleSet, this.tree);
    this.tree.flatLeaves<IRow>().forEach((n) => n.filtered = !this.columns.every((c) => c.filter(n)));
    this.flat = this.tree.aggregation === EAggregationType.AGGREGATED ? [this.tree] : this.tree.flatChildren();
    const exceptions = nonUniformContext(this.flat.map((n) => n.height), this.defaultRowHeight);
    const columnExceptions = nonUniformContext(this.columns.map((c) => c.width), 150);
    const scroller = <HTMLElement>this.root.querySelector('main');

    this._context = Object.assign({
      scroller,
      columns: this.columns,
      column: columnExceptions,
      htmlId: '#taggle'
    }, exceptions);
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
}
