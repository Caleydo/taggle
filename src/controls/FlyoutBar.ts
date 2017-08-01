/**
 * Created by Martin on 01.08.2017.
 */
import * as d3 from 'd3';
export default class FlyoutBar {
  private readonly $div: d3.Selection<any>;
  constructor(root: HTMLElement) {
    this.$div = d3.select(root).append('div').classed('flyout', true).append('h1').text('spodfjisdf');
    this.$div.on('click', this.handleClick);
  }

  handleClick() {
    d3.select('div.treevis').style('display', 'block');
    d3.select('div.flyout').style('display', 'none');
  }
}
