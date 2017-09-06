/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data, IColumn} from './data/index';
import DebugInterface from './DebugInterface';
import {
  applyDynamicRuleSet, applyStaticRuleSet, defaultRuleSet, IRuleSetInstance, IRuleSetLike,
  IStaticRuleSet
} from './rule/index';
import InnerNode from './tree/InnerNode';
import {fromArray} from './tree/utils';

export interface ITaggleRenderer {
  initTree(tree: InnerNode, ruleSet: IStaticRuleSet): void;
  rebuild(tree: InnerNode, ruleSet: IStaticRuleSet, ruleSetInstance: IRuleSetInstance): void;
  readonly availableHeight: number;
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

  private ruleSet: IRuleSetLike = defaultRuleSet;
  private isDynamicLeafHeight: boolean;
  private readonly tree: InnerNode;

  constructor(parent: HTMLElement, clazz: ITaggleRendererClass) {

    this.renderer = new clazz(parent, columns, {
      update: () => this.update(),
      selectionChanged: () => {
        if (this.isDynamicLeafHeight) {
          this.update();
        }
      }
    });

    this.tree = fromArray(data, 20);
    this.renderer.initTree(this.tree, this.ruleSet);
    const instance = applyStaticRuleSet(this.ruleSet, this.tree, this.renderer.availableHeight);
    this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';

    this.debug = new DebugInterface(parent, () => this.update(), (rule) => {
      this.ruleSet = rule;
      this.renderer.initTree(this.tree, this.ruleSet);
      const instance = applyStaticRuleSet(rule, this.tree, this.renderer.availableHeight);
      this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';
      this.update();
    });

    window.addEventListener('resize', () => this.update());
  }

  update() {
    const instance = applyDynamicRuleSet(this.ruleSet, this.tree, this.renderer.availableHeight);
    this.renderer.rebuild(this.tree, this.ruleSet, instance);
    this.debug.update(this.tree);

    //instance.violations
  }
}
