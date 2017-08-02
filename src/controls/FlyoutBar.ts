/**
 * Created by Martin on 01.08.2017.
 */
import * as d3 from 'd3';

export default class FlyoutBar {

  private readonly $contentDiv: d3.Selection<any>;

  private $body: d3.Selection<any>;

  constructor(root: HTMLElement) {
    const $parentDiv = d3.select(root).append('div').classed('flyout', true);
    $parentDiv.on('click', this.handleClick);
    $parentDiv.append('h1').text('Configure Tree');
    this.$contentDiv = $parentDiv.append('div').style('display', 'none').classed('content', true);
    this.createHeader();
    this.createBody();
  }

  get body() {
    return this.$body;
  }

  protected createBody() {
    this.$body = this.$contentDiv.append('div');
  }

  private handleClick = () => {
    this.$contentDiv.style('display', 'block');
  }

  protected createHeader() {
    const $closeButton = this.$contentDiv.append('div').classed('header', true).append('i').classed('fa fa-window-close', true);

    $closeButton.on('click', () => {
      this.$contentDiv.style('display', 'none');
      (<MouseEvent>d3.event).stopPropagation();
    });
  }
}
