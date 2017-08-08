/**
 * Created by Martin on 01.08.2017.
 */
import * as d3 from 'd3';

export default class FlyoutBar {
  private $body: d3.Selection<any>;
  private readonly $node: d3.Selection<any>;

  constructor(root: HTMLElement) {
    const $parentDiv = d3.select(root).append('aside').classed('flyout', true);
    $parentDiv.append('h1').text('Configure Tree').on('click', this.handleClick);
    this.$node = $parentDiv;
    this.createHeader();
    this.createBody();
  }

  get body() {
    return this.$body;
  }

  protected createBody() {
    this.$body = this.$node.append('div');
  }

  private handleClick = () => {
    this.$node.classed('in', !this.$node.classed('in'));
    (<MouseEvent>d3.event).stopPropagation();
  }

  protected createHeader() {
    const $closeButton = this.$node.append('div').classed('header', true).append('i').classed('fa fa-window-close', true);
    $closeButton.on('click', this.handleClick);
  }
}
