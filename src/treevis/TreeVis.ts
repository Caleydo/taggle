/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, LeafNode, visit} from '../tree';
import {EAggregationType} from '../tree';

export default class TreeVis {
  private readonly $parentDiv: d3.Selection<any>;
  private readonly $table: d3.Selection<any>;
  private tree: InnerNode;

  constructor($root: d3.Selection<any>, private readonly rebuild: ()=>void) {
    this.$parentDiv = $root.classed('treevis', true);
    this.$table = TreeVis.createTable(this.$parentDiv);
  }

  get node() {
    return this.$parentDiv;
  }

  private static createTable($parent: d3.Selection<any>) {
    const $table = $parent.append('table');
    $table.html(`<thead>
                <tr>
                  <th colspan="0">Visual Tree</th>
                  <th>Aggr.</th>
                  <th>Vis Type</th>
                  <th>Height (px)</th>
                  <th>DOI (0...1)</th>
                </tr>
                <tr class="properties">
                </tr>
                </thead>
                <tbody></tbody>`);
    return $table;
  }

  render(root: InnerNode) {
	  this.tree = root;
    const buildTableBody = ($table: d3.Selection<INode>, arr: INode[], treeColumnCount: number) => {
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
      $tr.html((d) => this.buildRow(d, treeColumnCount));
      this.addTreeClickhandler($tr);
      this.updateAggregatedColumn($tr);
      this.updateRendererColumn($tr);
      this.updateInputColumn($tr);
      this.setReadonly($tr);
      this.setCollapsedState($tr);

      // exit phase
      $tr.exit().remove();
    };

    console.assert(root.parent === null);

    const arr: INode[] = [];
    const treeDepth = TreeVis.flat(root, arr); // convert tree to list
    const treeColumnCount = treeDepth + 1;
    this.updatePropertyRow(treeColumnCount);
    buildTableBody(this.$table, arr, treeColumnCount);
  }

  private unaggrItemsOnLevel(level: number) {
    const arr: INode[] = [];
    TreeVis.flat(this.tree, arr);
    const arrLeaves = arr.filter((n) => n.level === level && n.type === 'leaf');
    const unaggrInners = arr.filter((n) => n.level === level && n.type === 'inner' && n.aggregation !== EAggregationType.AGGREGATED);
    return arrLeaves.concat(unaggrInners);
  }

  private aggrItemsOnLevel(level: number) {
    const arr: INode[] = [];
    TreeVis.flat(this.tree, arr);
    return arr.filter((n) => n.level === level && n.type === 'inner' && n.aggregation === EAggregationType.AGGREGATED);
  }

  private updatePropertyRow(treeColumnCount: number) {
    const $tr = this.$table.select('thead .properties');
    const $th = $tr.selectAll('th').data(d3.range(treeColumnCount));

    $th.enter().append('th');

    $th.html((_, index: number) =>
      `<div class="popup">
        <i class="fa fa-cog" aria-hidden="true"></i>
        <div class="popupcontent">
          <form action="" class="property_form">
            <div>
              <label for="hi${index}1">Height (unaggr.):</label>
              <input type="number" id="hi${index}1" class='heightInput' ${this.unaggrItemsOnLevel(index).length === 0 ? 'disabled' : ''}>
            </div>
            <div>
              <label for="hi${index}2">Height (aggr): </label>
              <input type="number" id="hi${index}2" class='aggrheightInput' ${this.aggrItemsOnLevel(index).length === 0 ? 'disabled' : ''}>
            </div>
            <div>
              <button class="submit_button" type="submit">Apply</button>
            </div>
          </form>
        </div>
      </div>`
    );
    $th.exit().remove();
    this.addFormhandler($th);
  }

  private addFormhandler($th: d3.Selection<any>) {
    const that = this;
    $th.select('.property_form')
      .on('submit', function(this: HTMLFormElement, _, index: number) {
        (<any>d3.event).stopPropagation();
        (<any>d3.event).preventDefault();
        const $this = d3.select(this);

        const unaggrVal = parseInt($this.select('.heightInput').property('value'), 10);
        const aggrVal = parseInt($this.select('.aggrheightInput').property('value'), 10);

        if(!isNaN(unaggrVal)) {
          that.unaggrItemsOnLevel(index).forEach((n: INode) => n.height = unaggrVal);
        }

        if(!isNaN(aggrVal)) {
          that.aggrItemsOnLevel(index).forEach((n: InnerNode) => n.height = aggrVal);
        }
        that.rebuild();
        return false;
      });
  }

  private buildRow(d: INode, treeColumnCount: number) {
    return `
        ${'<td class="hierarchy"></td>'.repeat(d.level)}
        <td class="clickable">
          ${d.level === 0 ? 'root' : d}</td>${'<td></td>'.repeat(treeColumnCount - d.level - 1)}
        ${d.type === 'inner' ? `<td><input type="checkbox" class="aggregated" ${(<InnerNode>d).aggregation === EAggregationType.AGGREGATED ? 'checked' : ''}></td>` : '<td/>'}
        <td><select class="visType" ${d.type === 'inner' && d.aggregation !== EAggregationType.AGGREGATED ? 'disabled="disabled"' : ''}></select></td>
        <td><input class="height" type="number" value="${Math.round(d.height)}"></td>
        <td><input class="doi" type="number" step="0.01" value="${d.doi}"></td>`;
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

    const that = this;
    $tr.select('.clickable')
    .on('click', function(this: HTMLElement, d: INode) { // hides all child nodes
      if(d.type === 'leaf' || !this.parentNode) { //should never happen
        return;
      }
      const $firstItem = d3.select(this.parentNode);
      invertCollapsedState($firstItem);
      that.setCollapsedForChildren($firstItem, $tr, d);
    });
  }

  private setCollapsedState($tr: d3.Selection<INode>) {
    const that = this;
    $tr.each(function(this: EventTarget, d: INode) {
      if (d.type === 'leaf') { // we are just interested in inner nodes
        return;
      }
      const element = d3.select(this);
      element.classed('collapsed', (<InnerNode> d).aggregation === EAggregationType.AGGREGATED);
      that.setCollapsedForChildren(element, $tr, d);
    });
  }

  private setCollapsedForChildren(element: d3.Selection<INode>, $tr: d3.Selection<INode>, d: InnerNode) {
      const collapse = element.classed('collapsed');
      // filter all children and subchildren from current node
      $tr.filter((s) => s.parents.includes(d))
        .classed('hidden', collapse)
        .classed('collapsed', false);
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
        .map((r) => `<option ${r === d.visType ? 'selected' : ''}>${TreeVis.mapVisTypeName(r, d.type)}</option>`)
        .join('')
    );
    const that = this;
    $tr.select('.visType')
    .on('change', function(this: HTMLSelectElement, d: INode) {
      d.visType = TreeVis.mapVisTypeName(this.value, d.type);
      that.rebuild();
    });
  }

  private updateInputColumn($tr: d3.Selection<INode>) {
    const that = this;

    const setValue = (element: HTMLInputElement) => {
      if(!element.parentNode || !element.parentNode.parentNode) {
        return;
      }
      const val = parseInt(element.value, 10);
      const d = d3.select(element.parentNode.parentNode!).datum();

      let attribute = '';
      if(element.className === 'height') {
        attribute = 'height';
      } else if(element.className === 'doi' && d.type === 'inner') {
        attribute = 'aggregatedDoi';
      } else if(element.className === 'doi' && d.type === 'leaf') {
        attribute = 'doi';
      } else {
        return;
      }
      if(d[attribute] !== val) {
        d[attribute] = val;
        that.rebuild();
      }
    };
    $tr.selectAll('input.height, input.doi')
    .on('blur', function(this: HTMLInputElement) {
      setValue(this);
    })
    .on('keyup', function(this: HTMLInputElement) {
       if((<KeyboardEvent>d3.event).key === 'Enter') {
         setValue(this);
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
