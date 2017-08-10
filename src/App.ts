/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import LineUpRenderer from './lineup/LineUpRenderer';
import {columns, data} from './data/index';
import {toDesc} from './lineup/index';
import DebugInterface from './DebugInterface';
import {defaultRuleSet, IRuleSet} from './rule/index';

interface ITaggleRenderer {
  update(): void;
}

export default class App {
  private readonly renderer: ITaggleRenderer;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;

  constructor(parent: HTMLElement) {
    this.renderer = createRenderer(parent);

    this.debug = new DebugInterface(parent, () => this.update(), (ruleSet) => {
      this.ruleSet = ruleSet;
    });

  }

  update() {
    this.renderer.update();
    //TODO
    //this.debug.update();
  }


}

function createRenderer(parent: HTMLElement) {
  const r = new LineUpRenderer(parent, data, {});
  columns.map(toDesc).forEach((desc: any) => {
    const col = r.create(desc);
    if (col) {
      r.ranking.push(col);
    }
  });
  return r;
}
