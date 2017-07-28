/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, visit} from '../tree';
import {EAggregationType} from '../tree';

export default class CollapsibleList {
  private readonly $table: d3.Selection<any>;
  private readonly renderers = ['default', 'mean'];
  constructor(root: HTMLElement, private readonly rebuild: (name?: string|null, additional?: boolean)=>void,) {
    this.$table = d3.select(root).append('div').classed('treevis', true).append('table');
    this.$table.html(`<thead>
                <tr>
                  <th colspan="0">Visual Tree</th>
                  <th>Aggregated</th>
                  <th>Used Renderer</th>
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
      const $trComplete = $tr.html((d) => this.buildRow(d, treeColumnCount));
      this.addTreeClickhandler($trComplete);
      this.updateAggregatedColumn($trComplete);
      this.updateRendererColumn($trComplete);

      // exit phase
      $tr.exit().remove();
    };

    console.assert(root.parent === null);

    const arr: INode[] = [];
    const treeDepth = CollapsibleList.flat(root, arr); // convert tree to list
    buildTable(this.$table, arr, treeDepth+1);
  }

  private buildRow(d: INode, treeColumnCount: number) {
    let resultRow = `${'<td></td>'.repeat(d.level)}<td class="clickable">${d.level === 0 ? 'root' : d}</td>${'<td></td>'.repeat(treeColumnCount - d.level - 1)}`;
    resultRow += d.type === 'inner' ? `<td><input type="checkbox" class="aggregated" ${(<InnerNode>d).aggregation === EAggregationType.AGGREGATED ? 'checked' : ''} /></td>` : '<td/>';
    resultRow += `<td><select class="renderer"></select></td>`;
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
    $tr.select('.renderer').html((d) => `${this.renderers.map((r) => `<option ${r === d.renderer ? 'selected' : ''}>${r}</option>`).join('')}`);
    const that = this;
    $tr.select('.renderer')
    .on('change', function(this: HTMLSelectElement, d: INode) {
      d.renderer = this.value;
      that.rebuild();
    });
  }
}
