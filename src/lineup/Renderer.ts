/**
 * Created by Samuel Gratzl on 18.07.2017.
 */
import {ACellRenderer, ICellRenderContext, nonUniformContext} from 'lineupengine/src';
import RenderColumn from 'lineupjs/src/ui/engine/RenderColumn';
import MultiLevelRenderColumn from 'lineupjs/src/ui/engine/MultiLevelRenderColumn';
import StackColumn from 'lineupjs/src/model/StackColumn';
import Column from 'lineupjs/src/model/Column';
import {IExceptionContext} from 'lineupengine/src/logic';
import {debounce} from 'lineupjs/src/utils';
import {IRankingBodyContext} from 'lineupjs/src/ui/engine/interfaces';
import SelectionManager from 'lineupjs/src/ui/engine/SelectionManager';
import {IGroupData, IGroupItem} from 'lineupjs/src/ui/engine/interfaces';

export default class Renderer extends ACellRenderer<RenderColumn> {
  protected _context: ICellRenderContext<RenderColumn>;

  private initialized: 'ready'|'waiting'|'no' = 'no';
  private readonly selection: SelectionManager;

  constructor(root: HTMLElement, id: string, private readonly ctx: IRankingBodyContext, private readonly extraRowUpdate?: (row: HTMLElement, rowIndex: number) => void) {
    super(root, `#${id}`);
    root.id = id;

    this.selection = new SelectionManager(this.ctx, this.body);
    this.selection.on(SelectionManager.EVENT_SELECT_RANGE, (from: number, to: number, additional: boolean) => {
      this.selection.selectRange({
        forEach: (c: (item: (IGroupItem|IGroupData))=>void) => {
          for(let i = from; i <= to; ++i) {
            c(this.ctx.isGroup(i) ? this.ctx.getGroup(i) : this.ctx.getRow(i));
          }
        }
      }, additional);
    });
  }

  protected get context() {
    return this._context;
  }

  protected createHeader(document: Document, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.createHeader(document, this.ctx);
  }

  protected updateHeader(node: HTMLElement, column: RenderColumn) {
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    return column.updateHeader(node, this.ctx);
  }

  protected createCell(document: Document, index: number, column: RenderColumn) {
    return column.createCell(index, document, this.ctx);
  }

  protected updateCell(node: HTMLElement, index: number, column: RenderColumn) {
    return column.updateCell(node, index, this.ctx);
  }

  updateHeaders() {
    if (!this._context) {
      return;
    }
    super.updateHeaders();
  }

  updateHeaderOf(i: number) {
    const node = <HTMLElement>this.header.children[i]!;
    const column = this._context.columns[i];
    if (column instanceof MultiLevelRenderColumn) {
      column.updateWidthRule(this.style);
    }
    this.updateHeader(node, column);
  }

  protected createRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    super.createRow(node, rowIndex, ...extras);
    const isGroup = this.ctx.isGroup(rowIndex);

    if (this.extraRowUpdate) {
      this.extraRowUpdate(node, rowIndex);
    }

    if (isGroup) {
      node.dataset.agg = 'group';
      return;
    }

    const {dataIndex, meta} = this.ctx.getRow(rowIndex);
    node.dataset.dataIndex = dataIndex.toString();
    node.dataset.agg = 'detail'; //or 'group'
    node.dataset.meta = meta || '';
    this.selection.add(node);
    this.selection.updateState(node, dataIndex);
  }

  protected updateRow(node: HTMLElement, rowIndex: number, ...extras: any[]): void {
    const isGroup = this.ctx.isGroup(rowIndex);
    const wasGroup = node.dataset.agg === 'group';

    if (this.extraRowUpdate) {
      this.extraRowUpdate(node, rowIndex);
    }

    if (isGroup !== wasGroup) {
      // change of mode clear the children to reinitialize them
      node.innerHTML = '';

      // adapt body
      node.dataset.agg = isGroup ? 'group' : 'detail';
      if (isGroup) {
        node.dataset.dataIndex = '';
        this.selection.remove(node);
      } else {
        this.selection.add(node);
      }
    }

    if (!isGroup) {
      const {dataIndex, meta} = this.ctx.getRow(rowIndex);
      node.dataset.dataIndex = dataIndex.toString();
      node.dataset.meta = meta || '';
      this.selection.updateState(node, dataIndex);
    }

    super.updateRow(node, rowIndex, ...extras);
  }

  updateSelection(dataIndices: number[]) {
    const selected = new Set(dataIndices);
    this.forEachRow((node: HTMLElement) => {
      this.selection.update(node, selected);
    }, true);
  }

  getStyleManager() {
    return this.style;
  }

  updateColumnWidths() {
    const context = this.context;
    this.style.update(context.defaultRowHeight, context.columns, context.column.defaultRowHeight);
    //no data update needed since just width changed
    context.columns.forEach((column) => {
      if (column instanceof MultiLevelRenderColumn) {
        column.updateWidthRule(this.style);
      }
    });
  }

  private updateColumn(index: number) {
    const column = this._context.columns[index];
    this.forEachRow((row, rowIndex) => {
      this.updateCell(<HTMLElement>row.children[index], rowIndex, column);
    });
  }

  setZoomFactor(zoomFactor: number) {
    if (this.initialized !== 'ready') {
      return;
    }
    this.body.style.fontSize = `${zoomFactor * 100}%`;
  }

  destroy() {
    this.root.remove();

    this._context.columns.forEach((c) => {
      c.c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, null);
      if (!(c instanceof MultiLevelRenderColumn)) {
        return;
      }
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, null);
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, null);
    });
  }

  render(columns: RenderColumn[], rowContext: IExceptionContext) {
    this._context = Object.assign({
      columns,
      column: nonUniformContext(columns.map((w) => w.width), 100),
    }, rowContext);

    columns.forEach((c, i) => {
      c.c.on(`${Column.EVENT_WIDTH_CHANGED}.body`, () => {
        this.updateColumnWidths();
      });
      if (!(c instanceof MultiLevelRenderColumn)) {
        return;
      }
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.body`, () => {
        c.updateWidthRule(this.getStyleManager());
      });
      c.c.on(`${StackColumn.EVENT_MULTI_LEVEL_CHANGED}.bodyUpdate`, debounce(() => this.updateColumn(i), 25));
    });

    if (this.initialized === 'ready') {
      super.recreate();
    } else if (this.initialized !== 'waiting') {
      this.initialized = 'waiting';
      setTimeout(() => {
          super.init();
          this.initialized = 'ready';
        }, 100);
    }
  }
}
