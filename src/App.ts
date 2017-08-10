/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data, IColumn} from './data/index';
import DebugInterface from './DebugInterface';
import {applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSet} from './rule/index';
import InnerNode from './tree/InnerNode';
import {createTree} from './data/utils';

export interface ITaggleRenderer {
  rebuild(tree: InnerNode, ruleSet: IRuleSet): void;
}

export interface ITaggleRendererClass {
  new(parent: HTMLElement, columns: IColumn[], callbacks: ICallbacks): ITaggleRenderer;
}

export interface ICallbacks {
  update(): void;
  selectionChanged(): void;
}

export default class App {
  private readonly renderer: ITaggleRenderer;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSet = defaultRuleSet;
  private readonly tree: InnerNode;

  constructor(parent: HTMLElement, clazz: ITaggleRendererClass) {
    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = createTree(data, columns, defaultRowHeight, this.ruleSet);

    this.renderer = new clazz(parent, columns, {
      update: () => this.update(),
      selectionChanged: () => undefined
    });

    this.debug = new DebugInterface(parent, () => this.update(), (rule) => {
      this.ruleSet = rule;
      applyStaticRuleSet(rule, this.tree);
      this.update();
    });
  }

  update() {
    applyDynamicRuleSet(this.ruleSet, this.tree);
    this.renderer.rebuild(this.tree, this.ruleSet);
    this.debug.update(this.tree);
  }
}
