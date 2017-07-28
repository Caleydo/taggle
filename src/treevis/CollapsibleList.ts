/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, visit} from '../tree';

export default class CollapsibleList {
  private readonly $table: d3.Selection<any>;

  constructor(root: HTMLElement) {
    this.$table = d3.select(root).append('div').classed('treevis', true).append('table');
    this.$table.html(`<thead>
                <tr><td colspan="0">Visual Tree</td></tr>
              </thead>
              <tbody></tbody>`);
  }

  render(root: InnerNode) {
    const invertCollapsedState = (node: d3.Selection<any>) => {
      const state = node.classed('collapsed');
      node.classed('collapsed', !state);
    };

    const buildTable = ($table: d3.Selection<INode>, arr: INode[], treeColumnCount: number) => {
      console.assert($table && arr && treeColumnCount > -1);
      $table.select('thead tr td').attr('colspan', treeColumnCount);
      const $tr = $table.select('tbody').selectAll('tr')
          .data(arr);

      // enter phase
      $tr.enter().append('tr')
        .classed('collapsed', false);

      // update phase
      $tr
        .html((d) => `${'<td></td>'.repeat(d.level)}<td class="clickable">${d.level == 0 ? 'root' : d}</td>${'<td></td>'.repeat(treeColumnCount - d.level - 1)}`)
        .select('.clickable')
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

      // exit phase
      $tr.exit().remove();
    };

    console.assert(root.parent === null);

    const arr: INode[] = [];
    const treeDepth = CollapsibleList.flat(root, arr); // convert tree to list
    buildTable(this.$table, arr, treeDepth+1);
  }

  private buildRow(treeColumnCount: number, node: INode) {
    let htmlString = '';
    for(let i = 0; i < treeColumnCount; i++) {
      if(i === node.level) {
        const text = node.level === 0 ? 'root' : node.toString();
         htmlString = `${htmlString}<td class="clickable">${text}</td>`;
         continue;
      }
      htmlString = `${htmlString}<td></td>`;
    }
    return htmlString;
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
}
