/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode, visit} from '../tree';
import {EAggregationType} from '../tree';

export default class CollapsibleList {
  private readonly $parentDiv: d3.Selection<any>;
  private $table: d3.Selection<any>;

  constructor($root: d3.Selection<any>, private readonly rebuild: (name?: string|null, additional?: boolean)=>void) {
    this.$parentDiv = $root.classed('treevis', true);
    this.createTable();
  }

  get node() {
    return this.$parentDiv;
  }

  protected createTable() {
    this.$table = this.$parentDiv.append('table');
    this.$table.html(`<thead>
                <tr>
                  <th colspan="0">Visual Tree</th>
                  <th>Aggr.</th>
                  <th>Vis Type</th>
                  <th>Height (px)</th>
                  <th>DOI (0...1)</th>
                </tr>
                </thead>
                <tbody></tbody>`);
  }

  render(root: InnerNode) {
    const buildTable = ($table: d3.Selection<INode>, arr: INode[], treeColumnCount: number) => {
      console.assert($table && arr && treeColumnCount > -1);
      $table.select('thead tr th').attr('colspan', treeColumnCount);
      const $tr = $table.select('tbody').selectAll('tr')
          .data(arr);

      // enter phase
      $tr.enter().append('tr')
        .classed('collapsed', false);

      // update phase
      $tr.attr('data-level', (d) => d.level);
      $tr.attr('data-type', (d) => d.type);
      const $trComplete = $tr.html((d) => this.buildRow(d, treeColumnCount));
      this.addTreeClickhandler($trComplete);
      this.updateAggregatedColumn($trComplete);
      this.updateRendererColumn($trComplete);
      this.updateHeightColumn($trComplete);
      this.setReadonly($tr);

      // exit phase
      $tr.exit().remove();
    };

    console.assert(root.parent === null);

    const arr: INode[] = [];
    const treeDepth = CollapsibleList.flat(root, arr); // convert tree to list
    buildTable(this.$table, arr, treeDepth+1);
  }

  private buildRow(d: INode, treeColumnCount: number) {
    let resultRow = `${'<td class="hierarchy"></td>'.repeat(d.level)}<td class="clickable">${d.level === 0 ? 'root' : d}</td>${'<td></td>'.repeat(treeColumnCount - d.level - 1)}`;

    // aggregated row
    resultRow += d.type === 'inner' ? `<td><input type="checkbox" class="aggregated" ${(<InnerNode>d).aggregation === EAggregationType.AGGREGATED ? 'checked' : ''}></td>` : '<td/>';

    // used renderer row
    resultRow += `<td><select class="visType"></select></td>`;

    // height row
    resultRow += `<td><input class="height" type="number" value="${d.height}"></td>`;

    // DOI row
    resultRow += `<td><input class="doi" type="number" step="0.01" value="${d.doi}"></td>`;

    return resultRow;
  }

  private static flat(root: INode, result: INode[]) {
    console.assert(root);
    let depth = 0;
    visit<any>(root, (inner: InnerNode) => {
      result.push(inner);
      return true;
    }, (n) => {
      result.push(n);
      if(n.level > depth) {
        depth = n.level;
      }
    });
    return depth;
  }

  private addTreeClickhandler($tr: d3.Selection<INode>) {
    const invertCollapsedState = (node: d3.Selection<any>) => {
      const state = node.classed('collapsed');
      node.classed('collapsed', !state);
    };

    $tr.select('.clickable')
    .on('click', function(this: HTMLElement, d: INode) { // hides all child nodes
      if(d.type === 'leaf' || !this.parentNode) { //should never happen
        return;
      }
      const $firstItem = d3.select(this.parentNode);
      invertCollapsedState($firstItem);
      const collapse = $firstItem.classed('collapsed');

      // filter all children and subchildren from current node
      $tr.filter((s) => s.parents.includes(<InnerNode>d))
        .classed('hidden', collapse)
        .classed('collapsed', false);
    });
  }

  private updateAggregatedColumn($tr: d3.Selection<INode>) {
    const that = this;
    $tr.select('.aggregated')
    .on('click', function(this: HTMLInputElement, d: INode) {
      (<InnerNode>d).aggregation = this.checked ? EAggregationType.AGGREGATED : EAggregationType.UNIFORM;
      that.rebuild();
    });
  }

  private updateRendererColumn($tr: d3.Selection<INode>) {
    $tr.select('.visType').html((d) =>
      (d.type === 'inner' ? InnerNode : LeafNode)
        .visTypes
        .map((r) => `<option ${r === d.visType ? 'selected' : ''}>${CollapsibleList.mapVisTypeName(r, d.type)}</option>`)
        .join('')
    );
    const that = this;
    $tr.select('.visType')
    .on('change', function(this: HTMLSelectElement, d: INode) {
      d.visType = CollapsibleList.mapVisTypeName(this.value, d.type);
      that.rebuild();
    });
  }

  private updateHeightColumn($tr: d3.Selection<INode>) {
    const that = this;
    $tr.select('.height')
    .on('keyup', function(this: HTMLSelectElement, d: INode) {
      if((<KeyboardEvent>d3.event).key === 'Enter') {
        d.height = parseInt(this.value, 10);
        that.rebuild();
      }
    });
  }

  private static mapVisTypeName(visType: string, nodeType: 'inner'|'leaf') {
    switch(visType) {
      case 'default': return nodeType === 'inner' ? 'histogram' : 'bar';
      case 'histogram': return 'default';
      case 'mean-bar' : return 'mean';
      case 'mean': return 'mean-bar';
      case 'bar': return 'default';
      case 'compact': return 'compact bar';
      case 'compact bar': return 'compact';
      default: return visType;
    }
  }

  private setReadonly($tr: d3.Selection<INode>) {
    $tr.classed('readonly-cells', false);
    // have an aggregated parent
    const $result = $tr.filter((n) => n.parents.some((x) => x.aggregation === EAggregationType.AGGREGATED));
    $result.classed('readonly-cells', true);
    $result.selectAll('td input, td select').attr('disabled', 'disabled');
  }
}
