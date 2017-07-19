/**
 * Created by Martin on 19.07.2017.
 */
import * as d3 from 'd3';
import {InnerNode, INode} from '../tree';

export default class CollapsibleList {
  private readonly $node: d3.Selection<any>;

  constructor(root: HTMLElement) {
    this.$node = d3.select(root).append('div').classed('treevis', true);
  }

  render(root: InnerNode) {
    const renderLevel = ($node: d3.Selection<INode>, node: INode) => {
      const $li = $node.append('ul').classed('hidden', true).selectAll('li').data(node.type === 'inner' ? node.children : [])
      $li.enter().append('li')
        .on('click', function(this: HTMLElement) {
          const $this = d3.select(this);
          const hiddenVal = $this.select('ul').classed('hidden');
          $this.select('ul').classed('hidden', !hiddenVal);
          (<MouseEvent>d3.event).stopPropagation();
        });
      $li.text((d) => d.type === 'inner' ? this.buildName(d) : (<any>d.item).AIDS_Countries);
      $li.each(function(this: HTMLElement, d: InnerNode) {
        renderLevel(d3.select(this), d);
      });
      $li.exit().remove();
    }

    renderLevel(this.$node, root);
    this.$node.select('ul').classed('hidden', false);
  }

  buildName(node: InnerNode) {
    return node.name +
        ' (Child Count: ' + node.length +
        ' | Current Height: ' + node.height +
        ' | Aggr. Height: ' + node.aggregatedHeight + ')';
  }
}

 function expand(this: EventTarget) {
	        d3.select(this)
	            .on("click", collapse)
	            .append("ul")
	            .selectAll("li")
	            .data(function (d) {
	            return d.children;
	        })
	            .enter()
	            .append("li")
	            .text(function (d) {
	            return <string>d;
	        });
	    }

	    function collapse(this: EventTarget) {
	        d3.select(this)
	            .on("click", expand)
	            .select("ul")
	            .remove();
	    }


