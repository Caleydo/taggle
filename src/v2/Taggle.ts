/**
 * Created by Samuel Gratzl on 18.10.2017.
 */
import {AEventDispatcher, merge} from 'lineupjs/src/utils';
import {RENDERER_EVENT_HOVER_CHANGED} from 'lineupjs/src/ui/interfaces';
import DataProvider from 'lineupjs/src/provider/ADataProvider';
import EngineRenderer, {IEngineRendererOptions} from 'lineupjs/src/ui/engine/EngineRenderer';
import {defaultConfig} from 'lineupjs/src/config';
import {IGroupData, IGroupItem, isGroup} from 'lineupjs/src/ui/engine/interfaces';
import {IRule, regular, spacefilling} from './LineUpRuleSet';
import {GROUP_SPACING} from '../rule/lod';
import TaggleSidePanel from './TaggleSidePanel';
import {IStratification, matrixSplicer} from './splicer';

export interface ITaggleOptions {
  stratifications: IStratification[];
}

export default class Taggle extends AEventDispatcher {
  /**
   * triggered when the mouse is over a specific row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_HOVER_CHANGED = RENDERER_EVENT_HOVER_CHANGED;

  /**
   * triggered when the user click on a row
   * @argument data_index:number the selected data index or <0 if no row
   */
  static readonly EVENT_SELECTION_CHANGED = DataProvider.EVENT_SELECTION_CHANGED;

  private isDynamicLeafHeight: boolean = true;

  private rule: IRule = regular;
  private readonly spaceFilling: HTMLElement;
  private readonly resizeListener = () => this.update();
  private readonly renderer: EngineRenderer;
  private readonly panel: TaggleSidePanel;

  private readonly options: Readonly<ITaggleOptions> = {
    stratifications: []
  };

  constructor(public readonly node: HTMLElement, public data: DataProvider, options: Partial<ITaggleOptions & IEngineRendererOptions> =  {}) {
    super();
    Object.assign(this.options, options);

    this.node.classList.add('taggle-lib');
    this.node.innerHTML= `<aside class="panel">
        <div class="rule-button-chooser">
            <div><span>Overview</span>
              <code></code>
            </div>
        </div>
    </aside>`;

    {
      this.spaceFilling = <HTMLElement>this.node.querySelector('.rule-button-chooser :first-child')!;
      this.spaceFilling.addEventListener('click', () => {
        const selected = this.spaceFilling.classList.toggle('chosen');
        this.switchRule(selected ? spacefilling: regular);
      });
    }

    const config = this.createConfig(options);

    this.renderer = new EngineRenderer(data, this.node, config);
    this.panel = new TaggleSidePanel(this.renderer.ctx, this.node.ownerDocument);
    this.renderer.pushUpdateAble((ctx) => this.panel.update(ctx));
    this.node.firstElementChild!.appendChild(this.panel.node);

    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    this.forward(this.renderer, `${RENDERER_EVENT_HOVER_CHANGED}.main`);

    window.addEventListener('resize', this.resizeListener);
  }

  private createConfig(options: Partial<IEngineRendererOptions>): IEngineRendererOptions {
    return merge(defaultConfig(), options, {
      header: {
        summary: true,
        summaries: {
          'numbers': matrixSplicer(this.options.stratifications)
        }
      },
      body: {
        rowPadding: 0, //since padding is used
        groupPadding: GROUP_SPACING,
        dynamicHeight: this.dynamicHeight.bind(this)
      }
    });
  }

  private dynamicHeight(data: (IGroupData|IGroupItem)[]) {
    const availableHeight = this.node.querySelector('main')!.clientHeight;
    const instance = this.rule.apply(data, availableHeight, new Set(this.data.getSelection()));
    this.isDynamicLeafHeight = typeof instance.item === 'function';
    this.setViolation(instance.violation);

    return {
      defaultHeight: typeof instance.item === 'number' ? instance.item : NaN,
      height: (item: IGroupItem|IGroupData) => {
        if (isGroup(item)) {
          return typeof instance.group === 'number' ? instance.group : instance.group(item);
        }
        return typeof instance.item === 'number' ? instance.item : instance.item(item);
      }
    }
  }

  protected createEventList() {
    return super.createEventList().concat([Taggle.EVENT_HOVER_CHANGED, Taggle.EVENT_SELECTION_CHANGED]);
  }

  private switchRule(rule: IRule) {
    this.rule = rule;
    this.update();
  }

  private setViolation(violation?: string) {
    violation = violation || '';
    this.spaceFilling.classList.toggle('violated', Boolean(violation));
    this.spaceFilling.lastElementChild!.textContent = violation.replace(/\n/g,'<br>');
  }

  destroy() {
    this.renderer.destroy();
    this.node.remove();
    window.removeEventListener('resize', this.resizeListener);
  }

  dump() {
    return this.data.dump();
  }

  update() {
    this.renderer.update();
  }

  changeDataStorage(data: DataProvider, dump?: any) {
    if (this.data) {
      this.unforward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    }
    this.data = data;
    if (dump) {
      this.data.restore(dump);
    }
    this.forward(this.data, `${DataProvider.EVENT_SELECTION_CHANGED}.main`);
    this.renderer.changeDataStorage(data);
    this.update();
    this.panel.update(this.renderer.ctx);
  }
}
