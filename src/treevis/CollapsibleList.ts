/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode, visit} from '../tree';
import {IRow} from '../data';

export default class CollapsibleList {
  private readonly $node: d3.Selection<any>;

  constructor(root: HTMLElement, private readonly maxLeafVisCount = 5) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  render(root: InnerNode) {
    const switchState = (val: string, selection: d3.Selection<any>) => {
      const hiddenVal = selection.classed(val);
      selection.classed(val, !hiddenVal);
    };

    const buildTable = ($node: d3.Selection<INode>, arr: INode[], treeColumnCount: number) => {
      const $table = $node.append('table');
      console.assert($node && arr && treeColumnCount > -1);
      console.log(this.maxLeafVisCount);
      const $rows = $table.selectAll('tr')
          .data(arr);

      $table.append('tr').
      append('th').attr('colspan', treeColumnCount).text('Visual Tree');

      const $tr = $rows.enter().append('tr')
        .html((d) => {
          return `${this.buildRow(treeColumnCount, d)}`;
        });

      // collapses all nodes that are on a deeper level
      $tr.select('.clickable').on('click', function(this: HTMLElement) {
        if(!this.parentNode) { //should never happen
          return;
        }
        const $this = d3.select(this.parentNode);
        const thisLevel = $this.datum().level;

        // visit all siblings
        // hide all siblings until a sibling was found that is on the same level
        let sibling = this.parentNode.nextSibling;
        if(!sibling) {
          return;
        }
        let $sibling = d3.select(sibling);
        let nextLevel = $sibling.datum().level;
        while(thisLevel !== nextLevel) {
          switchState('hidden', $sibling);
          sibling = sibling.nextSibling;
          if(!sibling) {
            break;
          }
          $sibling = d3.select(sibling);
          nextLevel = $sibling.datum().level;
        }
      });
      $rows.exit().remove();
    };

    // create new dummy root
    console.assert(root.parent === null);

    const arr: INode[] = [];
    const treeDepth = this.flat(root, arr); // convert tree to list
    buildTable(this.$node, arr, treeDepth+1);
  }

  private buildRow(treeColumnCount: number, node: INode) {
    let htmlString = '';
    for(let i = 0; i < treeColumnCount; i++) {
      if(i === node.level) {
        const text = node.level === 0 ? 'root' : node.toString();
         htmlString = htmlString.concat(`<td class="clickable">${text}</td>`);
         continue;
      }
      htmlString = htmlString.concat(`<td></td>`);
    }
    return htmlString;
  }

  private flat(root: INode, arr: INode[]) {
    console.assert(root);
    let depth = 0;
    visit<IRow>(root, (inner: InnerNode) => {
      arr.push(inner);
      return true;
    }, (n) => {
      arr.push(n);
      if(n.level > depth) {
        depth = n.level;
      }
    });
    return depth;
  }
}
