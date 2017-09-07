/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import {columns, data, IColumn} from './data/index';
import DebugInterface from './DebugInterface';
import {
  applyDynamicRuleSet, applyStaticRuleSet, IRuleSetInstance, IRuleSetLike,
  IStaticRuleSet
} from './rule/index';
import InnerNode from './tree/InnerNode';
import {fromArray} from './tree/utils';
import RuleButtonSwitcher from './rule/RuleButtonSwitcher';
import {notSpacefillingNotProportional} from './rule/TaggleRuleSet';

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
  ruleChanged(rule: IRuleSetLike): void;
}

export default class App {
  private readonly renderer: ITaggleRenderer;
  private readonly switcher: RuleButtonSwitcher;
  private readonly debug: DebugInterface;

  private ruleSet: IRuleSetLike = notSpacefillingNotProportional;
  private isDynamicLeafHeight: boolean;
  private readonly tree: InnerNode;

  constructor(parent: HTMLElement, clazz: ITaggleRendererClass) {

    const callbacks = {
      update: () => this.update(),
      selectionChanged: () => {
        if (this.isDynamicLeafHeight) {
          this.update();
        }
      },
      ruleChanged: (rule: IRuleSetLike) => {
        this.ruleSet = rule;
        this.renderer.initTree(this.tree, this.ruleSet);
        const instance = applyStaticRuleSet(rule, this.tree, this.renderer.availableHeight);
        this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';
        this.update();
      }
    };

    {
      const aside = parent.ownerDocument.createElement('aside');
      aside.classList.add('panel');
      this.switcher = new RuleButtonSwitcher((rule) => callbacks.ruleChanged(rule));
      aside.appendChild(this.switcher.node);
      parent.parentElement!.appendChild(aside);
    }

    this.renderer = new clazz(parent, columns, callbacks);

    this.tree = fromArray(data, 20);
    this.renderer.initTree(this.tree, this.ruleSet);
    const instance = applyStaticRuleSet(this.ruleSet, this.tree, this.renderer.availableHeight);
    this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';

    this.debug = new DebugInterface(parent, callbacks);

    window.addEventListener('resize', () => this.update());
  }

  update() {
    const instance = applyDynamicRuleSet(this.ruleSet, this.tree, this.renderer.availableHeight);
    this.renderer.rebuild(this.tree, this.ruleSet, instance);
    this.debug.update(this.tree);

    this.switcher.setViolations(instance.violations || {});
  }
}
