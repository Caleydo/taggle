/**
 * Created by Samuel Gratzl on 18.10.2017.
 */
import LineUpRenderer, {ILineUpRendererOptions} from 'taggle/src/lineup/LineUpRenderer';
import RuleButtonSwitcher from 'taggle/src/rule/RuleButtonSwitcher';
import {applyDynamicRuleSet, applyStaticRuleSet, IRuleSetLike} from 'taggle/src/rule';
import {notSpacefillingNotProportional} from 'taggle/src/rule/TaggleRuleSet';
import {toArray} from 'taggle/src/tree/utils';
import {exportRanking} from 'lineupjs/src/provider/utils';
import {IExportOptions} from 'lineupjs/src/provider';

export interface ITaggleOptions {
}

export default class Taggle<T> {

  private readonly renderer: LineUpRenderer<T>;
  private readonly switcher: RuleButtonSwitcher;

  private ruleSet: IRuleSetLike = notSpacefillingNotProportional;
  private isDynamicLeafHeight: boolean;

  private readonly resizeListener = () => this.update();

  private readonly options: Readonly<ITaggleOptions> = {
    doc: document
  };

  constructor(public readonly node: HTMLElement, public readonly data: TaggleData, options: Partial<ITaggleOptions & ILineUpRendererOptions> =  {}) {
    Object.assign(this.options, options);

    this.node.classList.add('taggle-lib');
    this.node.innerHTML= `<main></main><aside class="panel"></aside>`;
    const callbacks = {
      update: () => this.update(),
      selectionChanged: () => {
        if (this.isDynamicLeafHeight) {
          this.update();
        }
      },
      ruleChanged: (rule: IRuleSetLike) => {
        this.ruleSet = rule;
        this.renderer.initTree(this.data.tree, this.ruleSet);
        const instance = applyStaticRuleSet(rule, this.data.tree, this.renderer.availableHeight);
        this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';
        this.update();
      }
    };

    {
      this.switcher = new RuleButtonSwitcher((rule) => callbacks.ruleChanged(rule));
      this.node.lastElementChild!.appendChild(this.switcher.node);
    }

    this.renderer = new LineUpRenderer<T>(this.node.firstElementChild!, data.columns, callbacks, options);

    this.renderer.initTree(this.data.tree, this.ruleSet);
    const instance = applyStaticRuleSet(this.ruleSet, this.data.tree, this.renderer.availableHeight);
    this.isDynamicLeafHeight = typeof instance.leaf.height === 'function';

    window.addEventListener('resize', this.resizeListener);
  }

  update() {
    const instance = applyDynamicRuleSet(this.ruleSet, this.data.tree, this.renderer.availableHeight);
    this.renderer.rebuild(this.data.tree, this.ruleSet);
    this.switcher.setViolations(instance.violations || {});
  }

  exportTable(options: Partial<IExportOptions> = {}) {
    const data = toArray(this.data.tree).filter((f) => !f.filtered);
    return Promise.resolve(exportRanking(this.renderer.ranking, data, options));
  }

  destroy() {
    this.node.remove();
    window.removeEventListener('resize', this.resizeListener);
  }

  dump() {
    this.renderer.ranking.dump(this.renderer.toDescRef);
  }
}
