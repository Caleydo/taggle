/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import EngineRankingRenderer from 'lineupjs/src/ui/engine/EngineRankingRenderer';
import {
  default as Column,
  ICategoricalStatistics,
  IColumnDesc,
  IFlatColumn,
  IStatistics
} from 'lineupjs/src/model/Column';
import RenderColumn from 'lineupjs/src/ui/engine/RenderColumn';
import {createDOM, createDOMGroup} from 'lineupjs/src/renderer/index';
import {default as NumberColumn, isNumberColumn} from 'lineupjs/src/model/NumberColumn';
import {AEventDispatcher, debounce} from 'lineupjs/src/utils';
import {nonUniformContext} from 'lineupengine/src/logic';
import StringColumn from 'lineupjs/src/model/StringColumn';
import {filters as defaultFilters} from 'lineupjs/src/dialogs';
import {renderers as defaultRenderers} from 'lineupjs/src/renderer';
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
import {IColumn} from '../data/index';
import {ICallbacks, ITaggleRenderer} from '../App';
import {IRuleSet} from '../rule/index';
import {IAggregateGroupColumnDesc} from 'lineupjs/src/model/AggregateGroupColumn';
import {defaultGroup, IGroup} from 'lineupjs/src/model/Group';
import SidePanel from 'lineupjs/src/ui/panel/SidePanel';
import {IGroupData, IGroupItem, IRankingBodyContext} from 'lineupjs/src/ui/engine/interfaces';

export interface ILineUpRendererOptions {
  idPrefix: string;
  summary: boolean;
  renderer: object;
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
  }
  return base;
}


export default class LineUpRenderer<T> extends AEventDispatcher implements IDataProvider, ITaggleRenderer {
  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics>();

  readonly node: HTMLElement;
  readonly ctx: IRankingBodyContext;
  private readonly renderer: EngineRankingRenderer;

  private readonly columns: IColumnDesc[];
  readonly ranking: Ranking;
  private selection = new Set<number>();
  private readonly columnTypes: { [columnType: string]: typeof Column } = models();
  private uid = 0;

  private readonly options: ILineUpRendererOptions = {
    idPrefix: `lu${Math.random().toString(36).slice(-8).substr(0, 3)}`, //generate a random string with length3;
    summary: true,
    renderer: {}
  };

  private tree: InnerNode;
  private defaultRowHeight: number = 20;
  private flat: (InnerNode | LeafNode<T>)[] = [];
  private leaves: LeafNode<T>[] = [];
  private readonly panel: SidePanel;

  constructor(parent: Element, columns: IColumn[], private readonly callbacks: ICallbacks, options: Partial<ILineUpRendererOptions> = {}) {
    super();
    Object.assign(this.options, options);
    this.node = parent.ownerDocument.createElement('main');
    this.node.classList.add('lu');
    parent.appendChild(this.node);


    const bodyOptions: any = this.options.renderer;

    function findOption(key: string, defaultValue: any): any {
      if (key in bodyOptions) {
        return bodyOptions[key];
      }
      if (key.indexOf('.') > 0) {
        const p = key.substring(0, key.indexOf('.'));
        key = key.substring(key.indexOf('.') + 1);
        if (p in bodyOptions && key in bodyOptions[p]) {
          return bodyOptions[p][key];
        }
      }
      return defaultValue;
    }

    this.ctx = {
      provider: this,
      filters: Object.assign({}, defaultFilters),
      linkTemplates: <string[]>[],
      autoRotateLabels: false,
      searchAble: (col: Column) => col instanceof StringColumn,
      option: findOption,
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
    this.renderer = new EngineRankingRenderer(this.node, this.options.idPrefix, this.ctx);

    this.ranking = new Ranking('taggle', 4);

    this.ranking.push(this.create(createAggregateDesc())!);
    this.ranking.push(this.create(createRankDesc())!);
    this.ranking.push(this.create(createSelectionDesc())!);

    this.columns = columns.map(toDesc);
    this.columns.forEach((desc: any) => {
      const col = this.create(desc);
      if (col) {
        this.ranking.push(col);
      }
    });

    this.ranking.on(`${Ranking.EVENT_DIRTY_ORDER}.provider`, debounce(() => this.reorder(), 100, null));
    this.ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.provider`, debounce(() => this.updateHist(), 100, null));
    const that = this;
    this.ranking.on(`${Ranking.EVENT_DIRTY}.body`, debounce(function (this: { primaryType: string }) {
      if (this.primaryType !== Column.EVENT_WIDTH_CHANGED) {
        that.updateImpl();
      }
    }));
    this.ranking.on(`${Ranking.EVENT_ADD_COLUMN}.body,${Ranking.EVENT_REMOVE_COLUMN}.body`, debounce(() => {
      this.updateImpl();
    }));


    this.panel = new SidePanel(this.ctx, parent.ownerDocument);
    parent.parentElement!.appendChild(this.panel.node);
  }

  protected createEventList() {
    return super.createEventList().concat([ADataProvider.EVENT_ADD_RANKING, ADataProvider.EVENT_REMOVE_RANKING, ADataProvider.EVENT_ADD_DESC]);
  }

  getColumns() {
    return this.columns;
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

  protected reorder() {
    this.sortAndGroup(this.ranking, this.tree);
    this.callbacks.update();
  }

  initTree(tree: InnerNode) {
    this.leaves = tree.flatLeaves();
    this.updateHist();
  }

  private sortAndGroup(ranking: Ranking, tree: InnerNode) {
    //create a flat hierarchy out of it
    const group = ranking.getGroupCriteria();
    if (!group) {
      // create a flat tree
      // slice since inplace sorting
      LineUpRenderer.sort(ranking, tree, this.leaves.slice());
      return;
    }

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

    const inner = Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
    tree.children = inner;
    inner.forEach((group) => {
      // sort within the group
      LineUpRenderer.sort(ranking, group, <LeafNode<T>[]>group.children);
    });
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

  private isGroup(index: number) {
    return this.flat[index].type === 'inner';
  }

  private getGroup(index: number) {
    return <IGroupData>this.flat[index];
  }

  private getRow(index: number): IGroupItem {
    return <IGroupItem>this.flat[index];
  }

  private updateHist() {
    if (!this.options.summary) {
      return;
    }

    const arr = this.leaves.map((l) => l.item);
    const indices = this.leaves.map((l) => l.dataIndex);
    const cols = this.ranking.flatColumns;
    cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
      const stats = computeStats(arr, indices, col.getValue.bind(col), [0, 1]);
      this.histCache.set(col.id, stats);
    });
    cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn & Column) => {
      const stats = computeHist(arr, indices, col.getCategories.bind(col), col.categories);
      this.histCache.set(col.id, stats);
    });

    this.panel.update(this.ctx);
  }

  rebuild(tree: InnerNode, ruleSet: IRuleSet) {
    this.tree = tree;
    this.defaultRowHeight = typeof ruleSet.leaf.height === 'number' ? ruleSet.leaf.height : 20;
    this.node.dataset.ruleSet = ruleSet.name;

    this.flat = this.tree.flatChildren();
    this.updateImpl();
  }

  private updateImpl() {
    const ranking = this.ranking;

    const flatCols: IFlatColumn[] = [];
    ranking.flatten(flatCols, 0, 1, 0);
    const cols = flatCols.map((c) => c.col);
    const columns = cols.map((c, i) => {
      const single = createDOM(c, defaultRenderers, this.ctx);
      const group = createDOMGroup(c, defaultRenderers, this.ctx);
      const renderers = {single, group, singleId: c.getRendererType(), groupId: c.getGroupRenderer()};
      return new RenderColumn(c, renderers, i);
    });

    if (this.histCache.size === 0) {
      this.updateHist();
    }

    cols.forEach((c) => c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
      this.renderer.updateColumnWidths();
    }));

    (<any>this.ctx).totalNumberOfRows = this.flat.length;
    const rowContext = nonUniformContext(this.flat.map((d) => d.height), this.defaultRowHeight);

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
        return this.leaves[index].relativeIndex + 1;
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
        this.callbacks.update();
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
