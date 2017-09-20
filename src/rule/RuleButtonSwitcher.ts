/**
 * Created by Samuel Gratzl on 08.08.2017.
 */
import {IRuleSetLike, IRuleViolations} from './';
import {notSpacefillingNotProportional, spacefillingNotProportional, notSpacefillingProportional, spacefillingProportional} from './TaggleRuleSet';


export default class RuleButtonSwitcher {
  readonly node = document.createElement('div');

  private readonly spaceFilling: HTMLElement;

  constructor(private readonly callback: (ruleSet: IRuleSetLike)=>void) {

    this.node.classList.add('rule-button-chooser');
    this.node.innerHTML = `
      <div><span>Overview</span>
        <code></code>
      </div>
    `;

    this.spaceFilling = <HTMLElement>this.node.firstElementChild!;

    const update = (evt: MouseEvent) => {
      (<HTMLElement>evt.currentTarget).classList.toggle('chosen');
      this.callback(this.choose());
    };
    this.spaceFilling.addEventListener('click', update);
  }

  setViolations(violations: IRuleViolations) {
    this.spaceFilling.classList.toggle('violated', Boolean(violations.spaceFilling));
    this.spaceFilling.lastElementChild!.textContent = (violations.spaceFilling || '').replace(/\n/g,'<br>');
  }

  private choose() {
    return this.spaceFilling.classList.contains('chosen') ? spacefillingNotProportional : notSpacefillingNotProportional;
  }
}
