/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data, IColumn} from './data/index';
import DebugInterface from './DebugInterface';
import {applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSet} from './rule/index';
import InnerNode from './tree/InnerNode';
import {fromArray} from './tree/utils';

export interface ITaggleRenderer {
  initTree(tree: InnerNode, ruleSet: IRuleSet): void;
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

    this.renderer = new clazz(parent, columns, {
      update: () => this.update(),
      selectionChanged: () => {
        if (typeof this.ruleSet.leaf.height === 'function') {
          this.update();
        }
      }
    });

    const defaultRowHeight = typeof this.ruleSet.leaf.height === 'number' ? this.ruleSet.leaf.height : 20;
    this.tree = fromArray(data, defaultRowHeight);
    this.renderer.initTree(this.tree, this.ruleSet);
    applyStaticRuleSet(this.ruleSet, this.tree);

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