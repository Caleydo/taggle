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
import {default as RenderColumn, IRankingContextContainer} from 'lineupjs/src/ui/engine/RenderColumn';
import {createDOM} from 'lineupjs/src/renderer/index';
import {default as NumberColumn, isNumberColumn} from 'lineupjs/src/model/NumberColumn';
import {debounce} from 'lineupjs/src/utils';
import {nonUniformContext} from 'lineupengine/src/logic';
import StringColumn from 'lineupjs/src/model/StringColumn';
import {filters as defaultFilters} from 'lineupjs/src/dialogs';
import {renderers as defaultRenderers} from 'lineupjs/src/renderer';
import {IDataProvider, IDataRow} from 'lineupjs/src/provider/ADataProvider';
import Ranking from 'lineupjs/src/model/Ranking';
import {ISelectionColumnDesc} from 'lineupjs/src/model/SelectionColumn';
import {IValueColumnDesc} from 'lineupjs/src/model/ValueColumn';
import {createRankDesc, createSelectionDesc, isCategoricalColumn, models} from 'lineupjs/src/model';
import {computeHist, computeStats} from 'lineupjs/src/provider/math';
import {ICategoricalColumn} from 'lineupjs/src/model/CategoricalColumn';
import 'lineupjs/src/style.scss';
import InnerNode from '../tree/InnerNode';
import LeafNode from '../tree/LeafNode';
import {IColumn} from '../data/index';
import {ICallbacks, ITaggleRenderer} from '../App';
import {IRuleSet} from '../rule/index';

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


export default class LineUpRenderer<T> implements IDataProvider, ITaggleRenderer {
  private readonly histCache = new Map<string, IStatistics | ICategoricalStatistics>();

  readonly node: HTMLElement;
  readonly ctx: IRankingContextContainer;
  private readonly renderer: EngineRankingRenderer;

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
  private leaves: LeafNode<T>[] = [];

  constructor(parent: Element, columns: IColumn[], private readonly callbacks: ICallbacks, options: Partial<ILineUpRendererOptions> = {}) {
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
      idPrefix: this.options.idPrefix,
      getRow: (index: number) => this.getRow(index)
    };
    this.renderer = new EngineRankingRenderer(this.node, this.options.idPrefix, this.ctx);

    this.ranking = new Ranking('taggle', 4);

    this.ranking.push(this.create(createRankDesc())!);
    this.ranking.push(this.create(createSelectionDesc())!);

    columns.map(toDesc).forEach((desc: any) => {
      const col = this.create(desc);
      if (col) {
        this.ranking.push(col);
      }
    });

    this.ranking.on(`${Ranking.EVENT_DIRTY_ORDER}.provider`, debounce(() => this.reorder(), 100, null));
    this.ranking.on(`${Ranking.EVENT_ORDER_CHANGED}.provider`, debounce(() => this.updateHist(), 100, null));
  }

  protected reorder() {
    this.ranking.setOrder(LineUpRenderer.sort(this.ranking, this.tree));
    this.callbacks.update();
  }

  initTree(tree: InnerNode) {
    this.leaves = tree.flatLeaves();
    this.ranking.setOrder(LineUpRenderer.sort(this.ranking, tree));
  }

  private get orderedLeaves() {
    const base = this.leaves;
    return this.ranking.getOrder().map((i) => base[i]);
  }

  private static sort(ranking: Ranking, tree: InnerNode) {
    //create a flat hierarchy out of it
    const leaves = tree.flatLeaves();
    leaves.forEach((d) => {
      d.filtered = !ranking.filter(d.v, d.dataIndex);
      d.parent = tree;
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

    tree.children = leaves;
    return leaves.filter((d) => !d.filtered).map((d) => d.dataIndex);
  }

  private getRow(index: number): IDataRow {
    //relative index
    const dataIndex = this.ranking.getOrder()[index];
    return this.leaves[dataIndex];
  }

  private updateHist() {
    if (!this.options.summary) {
      return;
    }

    const arr = this.leaves;
    const cols = this.ranking.flatColumns;
    cols.filter((d) => d instanceof NumberColumn && !d.isHidden()).forEach((col: NumberColumn) => {
      const stats = computeStats(arr, arr.map((a) => a.dataIndex), col.getValue.bind(col), [0, 1]);
      this.histCache.set(col.id, stats);
    });
    cols.filter((d) => isCategoricalColumn(d) && !d.isHidden()).forEach((col: ICategoricalColumn&Column) => {
      const stats = computeHist(arr, arr.map((a) => a.dataIndex), col.getCategories.bind(col), col.categories);
      this.histCache.set(col.id, stats);
    });
  }

  rebuild(tree: InnerNode, ruleSet: IRuleSet) {
    this.tree = tree;
    const defaultRowHeight = typeof ruleSet.leaf.height === 'number' ? ruleSet.leaf.height : 20;

    this.updateImpl(defaultRowHeight);
  }

  private updateImpl(defaultRowHeight: number) {
    const ranking = this.ranking;
    const that = this;
    ranking.on(`${Ranking.EVENT_DIRTY}.body`, debounce(function (this: { primaryType: string }) {
      if (this.primaryType !== Column.EVENT_WIDTH_CHANGED) {
        that.updateImpl(defaultRowHeight);
      }
    }));

    const flatCols: IFlatColumn[] = [];
    ranking.flatten(flatCols, 0, 1, 0);
    const cols = flatCols.map((c) => c.col);
    const columns = cols.map((c, i) => {
      const renderer = createDOM(c, defaultRenderers, this.ctx);
      return new RenderColumn(c, c.getRendererType(), renderer, i);
    });

    if (this.histCache.size === 0) {
      this.updateHist();
    }

    cols.forEach((c) => c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
      this.renderer.updateColumnWidths();
    }));

    const rowContext = nonUniformContext(this.orderedLeaves.map((d) => d.height), defaultRowHeight);

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
    this.renderer.updateSelection(Array.from(this.selection));
    this.callbacks.selectionChanged();
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
      (<IValueColumnDesc<number>>desc).accessor = (_row: any, index: number) => this.ranking.getOrder().indexOf(index);
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

  searchAndJump(_search: string|RegExp, _col: Column) {
    // TODO
  }
}
