/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import LineUpRenderer from './LineUpRenderer';
import {columns, data, IColumn} from '../data/index';
import DebugInterface from '../DebugInterface';
import {defaultRuleSet, IRuleSet} from '../rule/index';

export function toDesc(col: IColumn): any {
  const base: any = {type: 'string', column: col.name, label: col.name};
  switch (col.value.type) {
  case 'categorical':
    base.type = 'categorical';
    base.categories = col.value.categories;
    break;
  case 'int':
  case 'real':
    base.type = 'number';
    base.domain = col.value.range;
    break;
  }
  return base;
}

export default class LineUp {
  private readonly renderer: LineUpRenderer<any>;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;

  constructor(parent: HTMLElement) {
    this.renderer = new LineUpRenderer(parent, data, {});
    columns.map(toDesc).forEach((desc: any) => {
      const col = this.renderer.create(desc);
      if (col) {
        this.renderer.ranking.push(col);
      }
    });

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
