/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import LineUpRenderer from './LineUpRenderer';
import {columns, data, IColumn, IRow} from '../data/index';
import DebugInterface from '../DebugInterface';
import {applyStaticRuleSet, defaultRuleSet, IRuleSet} from '../rule/index';
import InnerNode from '../tree/InnerNode';
import {fromArray} from '../tree/utils';

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
  private readonly renderer: LineUpRenderer<IRow>;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;
  private readonly tree: InnerNode;

  constructor(parent: HTMLElement) {
    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = fromArray(data, defaultRowHeight);
    applyStaticRuleSet(this.ruleSet, this.tree);

    this.renderer = new LineUpRenderer(parent, this.tree, {}, {});
    columns.map(toDesc).forEach((desc: any) => {
      const col = this.renderer.create(desc);
      if (col) {
        this.renderer.ranking.push(col);
      }
    });

    this.debug = new DebugInterface(parent, () => this.update(), (ruleSet) => {
      this.ruleSet = ruleSet;
      applyStaticRuleSet(ruleSet, this.tree);
      this.update();
    });

  }

  update() {
    this.renderer.update();
    this.debug.update(this.tree);
  }
}
