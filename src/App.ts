/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import LineUpRenderer from './lineup/LineUpRenderer';
import {columns, data} from './data/index';
import {toDesc} from './lineup/index';
import DebugInterface from './DebugInterface';



export default class App {
  private readonly renderer: LineUpRenderer<any>;
  private readonly debug: DebugInterface;

  constructor(parent: HTMLElement) {
    this.renderer = new LineUpRenderer(parent, data, {});

    this.debug = new DebugInterface(parent, () => this.update(), () => undefined);

    columns.map(toDesc).forEach((desc: any) => {
      const col = this.renderer.create(desc);
      if (col) {
        this.renderer.ranking.push(col);
      }
    });
  }

  update() {
    this.renderer.update();
    //TODO
    //this.debug.update();
  }


}
