/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {
  default as Column,
  ICategoricalStatistics,
  IColumnDesc,
  IFlatColumn,
  IStatistics
} from 'lineupjs/src/model/Column';
import RenderColumn from 'lineupjs/src/ui/engine/RenderColumn';
import {createDOM, createDOMGroup, renderers as defaultRenderers} from 'lineupjs/src/renderer';
import {default as NumberColumn} from 'lineupjs/src/model/NumberColumn';
import {isNumberColumn} from 'lineupjs/src/model/INumberColumn';
import {AEventDispatcher, debounce, findOption, IEventContext} from 'lineupjs/src/utils';
import {nonUniformContext} from 'lineupengine/src/logic';
import StringColumn from 'lineupjs/src/model/StringColumn';
import {filters as defaultFilters} from 'lineupjs/src/dialogs';
import {defaultSummaries} from 'lineupjs/src/ui/engine/summary';
import {default as ADataProvider, IDataProvider} from 'lineupjs/src/provider/ADataProvider';
import Ranking from 'lineupjs/src/model/Ranking';
import {ISelectionColumnDesc} from 'lineupjs/src/model/SelectionColumn';
import {IValueColumnDesc} from 'lineupjs/src/model/ValueColumn';
import {
  createAggregateDesc,
  createRankDesc,
  createSelectionDesc,
  isCategoricalColumn,
  models
} from 'lineupjs/src/model';
import {computeHist, computeStats} from 'lineupjs/src/provider/math';
import {ICategoricalColumn} from 'lineupjs/src/model/CategoricalColumn';
import InnerNode, {EAggregationType} from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {ICallbacks, IColumn, ITaggleRenderer} from '../interfaces';
import {IStaticRuleSet} from '../rule/index';
import {IAggregateGroupColumnDesc} from 'lineupjs/src/model/AggregateGroupColumn';
import {defaultGroup, IGroup} from 'lineupjs/src/model/Group';
import SidePanel from 'lineupjs/src/ui/panel/SidePanel';
import {IGroupData, IGroupItem, IRankingBodyContext, isGroup} from 'lineupjs/src/ui/engine/interfaces';
import OrderedSet from 'lineupjs/src/provider/OrderedSet';
import MultiLevelRenderColumn from 'lineupjs/src/ui/engine/MultiLevelRenderColumn';
import {isMultiLevelColumn} from 'lineupjs/src/model/CompositeColumn';
import {IStratification, matrixSplicer} from './splicer';
import Renderer from './Renderer';
import TaggleSidePanel from './TaggleSidePanel';

export interface ILineUpRendererOptions {
  idPrefix: string;
  summary: boolean;
  renderer: object;
  panel: boolean;
  defaultColumns: string[];
  columnPadding: number;
  stratifications: IStratification[];
  rowPadding: number;
  groupPadding: number;
}

export function toDesc(col: IColumn): any {
  const base: any = {type: 'string', column: col.name, label: col.name};
  switch (col.value.type) {
    case 'categorical':
      base.type = 'categorical';
      base.categories = col.value.categories;
      break;
    case 'int':
    case 'real':
      base.type = 'number';
      base.domain = col.value.range;
      break;
    case 'matrix':
      base.type = 'numbers';
      base.domain = col.value.range;
      base.dataLength = col.dataLength;
      base.colorRange = ['white', 'black'];
  }
  return base;
}


export default class LineUpRenderer<T> extends AEventDispatcher implements IDataProvider, ITaggleRenderer {
  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics>();

  readonly node: HTMLElement;
  readonly ctx: IRankingBodyContext;
  private readonly renderer: Renderer;

  private readonly columns: IColumnDesc[];
  readonly ranking: Ranking;
  private readonly selection = new OrderedSet<number>();
  private readonly columnTypes: { [columnType: string]: typeof Column } = models();
  private uid = 0;

  private readonly options: Readonly<ILineUpRendererOptions> = {
    idPrefix: `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`, //generate a random string with length3;
    summary: true,
    renderer: {},
    panel: true,
    defaultColumns: [],
    columnPadding: 3,
    stratifications: [],
    rowPadding: 2,
    groupPadding: 10
  };

  private tree: InnerNode;
  private flat: (InnerNode | LeafNode<T>)[] = [];
  private leaves: LeafNode<T>[] = [];
  private panel: SidePanel|null;
  private ruleSet: IStaticRuleSet;
  private readonly updateAbles: ((ctx: IRankingBodyContext)=>void)[] = [];

  private readonly debouncedUpdate = debounce(() => this.callbacks.update(), 50);

  constructor(parent: Element, columns: IColumn[], private readonly callbacks: ICallbacks, options: Partial<ILineUpRendererOptions> = {}) {
    super();
    Object.assign(this.options, options);
    this.node = parent.ownerDocument.createElement('main');
    this.node.classList.add('lu', 'taggle');
    parent.appendChild(this.node);

    this.ctx = {
      provider: this,
      filters: Object.assign({}, defaultFilters),
      summaries: this.options.summary ? Object.assign({
        'numbers': matrixSplicer(this.options.stratifications)
      }, defaultSummaries) : {},
      linkTemplates: <string[]>[],
      autoRotateLabels: false,
      searchAble: (col: Column) => col instanceof StringColumn,
      option: findOption(Object.assign({useGridLayout: true}, this.options.renderer)),
      statsOf: (col: Column) => {
        const r = this.histCache.get(col.id);
        if (r == null || r instanceof Promise) {
          return null;
        }
        return r;
      },
      renderer: (col: Column) => createDOM(col, defaultRenderers, this.ctx),
      groupRenderer: (col: Column) => createDOMGroup(col, defaultRenderers, this.ctx),
      idPrefix: this.options.idPrefix,
      totalNumberOfRows: 0,
      isGroup: (index: number) => this.isGroup(index),
      getGroup: (index: number) => this.getGroup(index),
      getRow: (index: number) => this.getRow(index)
    };
    this.renderer = new Renderer(this.node, this.options.idPrefix, this.ctx, (row, rowIndex) => this.updateCustom(row, rowIndex));

    this.ranking = new Ranking('taggle', 4);

    this.ranking.push(this.create(createAggregateDesc())!);
    this.ranking.push(this.create(createRankDesc())!);
    this.ranking.push(this.create(createSelectionDesc())!);

    this.columns = columns.map(toDesc);

    // if nothing is specified show all columns
    const defaultColumns = (this.options.defaultColumns.length > 0) ? this.options.defaultColumns : this.columns.map((d:any) => d.column);
    defaultColumns.forEach((colName:string) => {
      const desc = this.columns.find((d) => (<any>d).column === colName);
      if(!desc) {
        return;
      }
      const col = this.create(desc);
      if (col) {
        this.ranking.push(col);
      }
    });

    const that = this;
    this.ranking.on(`${Ranking.EVENT_DIRTY_ORDER}.provider`, debounce(function(this: IEventContext) {
      if (this.primaryType === Column.EVENT_RENDERER_TYPE_CHANGED) {
        return; // handled by dirty
      }
      that.reorder(this.primaryType);
    }, 100));
    this.ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.provider`, debounce(() => this.updateHist(), 100));
    this.ranking.on(`${Ranking.EVENT_ADD_COLUMN}.provider`, debounce((col: Column) => this.updateHistOf(col), 100));
    this.ranking.on(`${Ranking.EVENT_DIRTY}.body`, debounce(function (this: IEventContext) {
      if (this.primaryType !== Column.EVENT_WIDTH_CHANGED && this.primaryType !== Ranking.EVENT_ORDER_CHANGED) {
        that.updateImpl();
      }
    }));
    this.ranking.on(`${Ranking.EVENT_ADD_COLUMN}.body,${Ranking.EVENT_REMOVE_COLUMN}.body`, debounce(() => {
      this.updateImpl();
    }));

    if (!that.options.panel) {
      this.panel = null;
      return;
    }

    this.panel = new TaggleSidePanel(this.ctx, parent.ownerDocument);
    this.updateAbles.push((ctx) => this.panel!.update(ctx));
    const next = parent.parentElement!.querySelector('aside');
    if (next) {
      next.appendChild(this.panel.node);
    } else {
      this.panel.node.classList.add('panel');
      parent.parentElement!.appendChild(this.panel.node);
    }
  }

  pushUpdateAble(updateAble: (ctx: IRankingBodyContext)=>void) {
    this.updateAbles.push(updateAble);
  }

  private updateCustom(row: HTMLElement, rowIndex: number) {
    const data = this.flat[rowIndex];
    row.dataset.lod = this.ruleSet.levelOfDetail(data);
  }

  protected createEventList() {
    return super.createEventList().concat([ADataProvider.EVENT_ADD_RANKING, ADataProvider.EVENT_REMOVE_RANKING, ADataProvider.EVENT_ADD_DESC, ADataProvider.EVENT_CLEAR_DESC]);
  }

  getColumns() {
    return this.columns;
  }

  pushDesc(column: IColumnDesc) {
    this.columns.push(column);
    this.fire(ADataProvider.EVENT_ADD_DESC, column);
  }

  clearColumns() {
    this.columns.splice(0, this.columns.length);
    this.fire(ADataProvider.EVENT_CLEAR_DESC);
  }

  getRankings() {
    return [this.ranking];
  }

  getLastRanking() {
    return this.ranking;
  }

  get availableHeight() {
    return this.node.querySelector('main')!.clientHeight;
  }

  protected reorder(eventType: string) {
    if (!this.tree) {
      return;
    }
    this.sortAndGroup(this.ranking, this.tree, eventType === Ranking.EVENT_GROUP_CRITERIA_CHANGED);
    this.callbacks.update();
  }

  initTree(tree: InnerNode, ruleSet: IStaticRuleSet) {
    this.ruleSet = ruleSet;
    this.leaves = tree.flatLeaves<any>();
    // ensure order
    this.leaves.sort((a, b) => a.dataIndex - b.dataIndex);
    this.ranking.setMaxSortCriteria(ruleSet.sortLevels);
    this.ranking.setMaxGroupColumns(ruleSet.stratificationLevels);
    this.updateHist();
  }

  private sortAndGroup(ranking: Ranking, tree: InnerNode, doGrouping: boolean) {
    //create a flat hierarchy out of it
    const group = ranking.getGroupCriteria();
    if (group.length === 0 || this.ruleSet.stratificationLevels < 1) {
      // create a flat tree
      // slice since inplace sorting
      tree.children = this.leaves.slice();
      LineUpRenderer.sort(ranking, tree, <LeafNode<T>[]>tree.children);
      return;
    }

    if (doGrouping) {
      const groups = new Map<string, InnerNode>();
      this.leaves.forEach((node) => {
        const group = ranking.grouper(node.v, node.dataIndex) || defaultGroup;
        if (!groups.has(group.name)) {
          const inner = new InnerNode(group.name, group.color);
          inner.parent = tree;
          groups.set(group.name, inner);
        }
        const ggroup = groups.get(group.name)!;
        node.parent = ggroup;
        ggroup.children.push(node);
      });
      tree.children = Array.from(groups.values());
    }

    tree.children.forEach((group: InnerNode) => {
      // sort within the group
      LineUpRenderer.sort(ranking, group, <LeafNode<T>[]>group.children);
    });
    tree.children.sort((a: InnerNode, b: InnerNode) => ranking.groupComparator(a, b));
  }

  private static sort(ranking: Ranking, parent: InnerNode, leaves: LeafNode<any>[]) {
    leaves.forEach((d) => {
      d.filtered = !ranking.filter(d.v, d.dataIndex);
      d.parent = parent;
    });

    //sort by the ranking column
    leaves.sort((a, b) => {
      const af = a.filtered;
      const bf = b.filtered;
      //filtered are last always
      if (af || bf) {
        return af ? (bf ? 0 : +1) : -1;
      }
      return ranking.comparator(a.v, b.v, a.dataIndex, b.dataIndex);
    });

    parent.children = leaves;
  }

  isAggregated(_ranking: Ranking, group: IGroup) {
    return (<InnerNode>group).aggregation === EAggregationType.AGGREGATED;
  }

  private isGroup(index: number) {
    return this.flat[index].type === 'inner';
  }

  private getGroup(index: number) {
    return <IGroupData>this.flat[index];
  }

  private getRow(index: number): IGroupItem {
    return <IGroupItem>this.flat[index];
  }

  getRows(): T[] {
    return this.flat.reduce((act, c) => {
      if (c.type === 'inner') {
        (<InnerNode>c).flatLeaves<T>().forEach((n) => {
          if (n.filtered) {
            return;
          }
          act.push(n.item);
        });
      } else {
        act.push((<LeafNode<T>>c).item);
      }
      return act;
    }, <T[]>[]);
  }

  private updateHist() {
    if (!this.options.summary) {
      return;
    }
    const arr = this.leaves.map((l) => l.item);
    const indices = this.leaves.map((l) => l.dataIndex);
    const cols = this.ranking.flatColumns;
    cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
      const stats = computeStats(arr, indices, col.getNumber.bind(col), col.isMissing.bind(col), [0, 1]);
      this.histCache.set(col.id, stats);
    });
    cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn & Column) => {
      const stats = computeHist(arr, indices, col.getCategories.bind(col), col.categories);
      this.histCache.set(col.id, stats);
    });

    this.updateAbles.forEach((u) => u(this.ctx));
  }

  private updateHistOf(column: Column) {
    if (!this.options.summary || column.isHidden() || !((column instanceof NumberColumn) || isCategoricalColumn(column))) {
      return;
    }
    const arr = this.leaves.map((l) => l.item);
    const indices = this.leaves.map((l) => l.dataIndex);
    if (column instanceof NumberColumn) {
      const stats = computeStats(arr, indices, column.getNumber.bind(column), column.isMissing.bind(column), [0, 1]);
      this.histCache.set(column.id, stats);
    }
    if(isCategoricalColumn(column)) {
      const stats = computeHist(arr, indices, column.getCategories.bind(column), column.categories);
      this.histCache.set(column.id, stats);
    }

    this.updateAbles.forEach((u) => u(this.ctx));
  }

  rebuild(tree: InnerNode, ruleSet: IStaticRuleSet) {
    this.tree = tree;
    this.ruleSet = ruleSet;
    this.node.dataset.ruleSet = ruleSet.name;
    this.ranking.setMaxSortCriteria(ruleSet.sortLevels);
    this.ranking.setMaxGroupColumns(ruleSet.stratificationLevels);
    this.ranking.setGroups(tree.children[0] instanceof InnerNode ? <InnerNode[]>tree.children : [tree]);
    this.flat = this.tree.flatChildren();
    this.updateImpl();
  }

  private updateImpl() {
    const ranking = this.ranking;

    const flatCols: IFlatColumn[] = [];
    ranking.flatten(flatCols, 0, 1, 0);
    const cols = flatCols.map((c) => c.col);
    const columnPadding = this.options.columnPadding === undefined ? 3 : this.options.columnPadding;
    const columns = cols.map((c, i) => {
      const single = createDOM(c, defaultRenderers, this.ctx);
      const group = createDOMGroup(c, defaultRenderers, this.ctx);
      const renderers = {single, group, singleId: c.getRendererType(), groupId: c.getGroupRenderer()};
      if (isMultiLevelColumn(c)) {
        return new MultiLevelRenderColumn(c, renderers, i, columnPadding);
      }
      return new RenderColumn(c, renderers, i);
    });

    if (this.histCache.size === 0) {
      this.updateHist();
    }

    cols.forEach((c) => c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
      this.renderer.updateColumnWidths();
    }));

    const groupPadding = this.options.groupPadding;
    const rowPadding = this.options.rowPadding;

    (<any>this.ctx).totalNumberOfRows = this.flat.length;
    const rowContext = nonUniformContext(this.flat.map((d) => d.height), NaN, (index) => {
      if (index >= 0 && this.flat[index] && (isGroup(this.flat[index]) || (<IGroupItem>this.flat[index]).meta === 'last')) {
          return groupPadding + rowPadding;
        }
        return rowPadding;
    });

    this.renderer.render(columns, rowContext);
  }

  takeSnapshot() {
    // dummy
  }

  toggleSelection(dataIndex: number, additional: boolean = false) {
    if (this.isSelected(dataIndex)) {
      if (additional) {
        this.selection.delete(dataIndex);
      } else {
        this.selection.clear();
      }
      this.updateSelections();
      return false;
    }
    if (!additional) {
      this.selection.clear();
    }
    this.selection.add(dataIndex);
    this.updateSelections();
    return true;
  }

  private updateSelections() {
    this.leaves.forEach((l) => l.selected = this.selection.has(l.dataIndex));
    this.renderer.updateSelection(Array.from(this.selection));
    this.callbacks.selectionChanged();
  }

  selectAllOf(ranking: Ranking) {
    console.assert(ranking === this.ranking);
    this.setSelection(this.leaves.map((d) => d.dataIndex));
  }

  setSelection(dataIndices: number[]) {
    this.selection.clear();
    dataIndices.forEach((d) => this.selection.add(d));
    this.updateSelections();
  }

  getSelection() {
    return Array.from(this.selection);
  }

  isSelected(dataIndex: number) {
    return this.selection.has(dataIndex);
  }

  removeRanking() {
    // can't remove ranking
  }

  ensureOneRanking() {
    // nothing to do
  }

  find(id: string): Column | null {
    return this.ranking.find(id);
  }

  clone(col: Column): Column {
    const dump = col.dump(this.toDescRef);
    return this.restoreColumn(dump);
  }

  restoreColumn(dump: any): Column {
    const create = (d: any) => {
      const desc = this.fromDescRef(d.desc);
      const type = this.columnTypes[desc.type];
      this.fixDesc(desc);
      const c = new type('', desc);
      c.restore(d, create);
      c.assignNewId(this.nextId.bind(this));
      return c;
    };
    return create(dump);
  }

  private fixDesc(desc: IColumnDesc) {
    //hacks for provider dependent descriptors
    //generate the accessor
    (<any>desc).accessor = (<any>desc).accessor || ((row: any) => row[(<any>desc).column]);
    if (desc.type === 'rank') {
      (<IValueColumnDesc<number>>desc).accessor = (_row: any, index: number) => {
        return this.leaves[index].absoluteIndex + 1;
      };
    } else if (desc.type === 'selection') {
      (<ISelectionColumnDesc>desc).accessor = (_row: any, index: number) => this.isSelected(index);
      (<ISelectionColumnDesc>desc).setter = (_row: any, index: number, value: boolean) => {
        if (value) {
          this.selection.add(index);
        } else {
          this.selection.delete(index);
        }
        this.updateSelections();
      };
    } else if (desc.type === 'aggregate') {
      (<IAggregateGroupColumnDesc>desc).isAggregated = (_ranking: Ranking, group: IGroup) => (<InnerNode>group).aggregation === EAggregationType.AGGREGATED;
      (<IAggregateGroupColumnDesc>desc).setAggregated = (_ranking: Ranking, group: IGroup, value: boolean) => {
        const node = <InnerNode>group;
        node.aggregation = value ? EAggregationType.AGGREGATED : EAggregationType.UNIFORM;
        this.debouncedUpdate();
      };
    }
  }

  private nextId() {
    return `col${this.uid++}`;
  }

  create(desc: IColumnDesc): Column | null {
    this.fixDesc(desc);
    //find by type and instantiate
    const type = this.columnTypes[desc.type];
    if (type) {
      return new type(this.nextId(), desc);
    }
    return null;
  }

  toDescRef(desc: IColumnDesc): any {
    return desc;
  }

  fromDescRef(ref: any): IColumnDesc {
    return ref;
  }

  mappingSample(col: Column): number[] {
    console.assert(isNumberColumn(col));
    return this.leaves.map((d) => col.getValue(d.v, d.dataIndex));
  }

  searchAndJump(_search: string | RegExp, _col: Column) {
    // TODO
  }
}
