/**
 * Created by Samuel Gratzl on 08.08.2017.
 */
import {IRuleSetLike, IRuleViolations} from './';
import {notSpacefillingNotProportional, spacefillingNotProportional, notSpacefillingProportional, spacefillingProportional} from './TaggleRuleSet';


export default class RuleButtonSwitcher {
  readonly node = document.createElement('div');

  private readonly proportional: HTMLElement;
  private readonly spaceFilling: HTMLElement;

  constructor(private readonly callback: (ruleSet: IRuleSetLike)=>void) {

    this.node.classList.add('rule-button-chooser');
    this.node.innerHTML = `
      <!--<div><span>Proportional</span>
        <code></code>
      </div>-->
      <div><span>Overview</span>
        <code></code>
      </div>
    `;

    this.proportional = <HTMLElement>this.node.firstElementChild!;
    this.spaceFilling = <HTMLElement>this.node.lastElementChild!;

    const update = (evt: MouseEvent) => {
      (<HTMLElement>evt.currentTarget).classList.toggle('chosen');
      this.callback(this.choose());
    };
    this.proportional.addEventListener('click', update);
    this.spaceFilling.addEventListener('click', update);
  }

  setViolations(violations: IRuleViolations) {
    this.proportional.classList.toggle('violated', Boolean(violations.proportionalRatios));
    this.proportional.lastElementChild!.textContent = (violations.proportionalRatios || '').replace(/\n/g,'<br>');

    this.spaceFilling.classList.toggle('violated', Boolean(violations.spaceFilling));
    this.spaceFilling.lastElementChild!.textContent = (violations.spaceFilling || '').replace(/\n/g,'<br>');
  }

  private choose() {
    const spaceFilling = this.spaceFilling.classList.contains('chosen');
    const proportional = this.proportional.classList.contains('chosen');
    if (spaceFilling) {
      return proportional ? spacefillingProportional : spacefillingNotProportional;
    }
    return proportional ? notSpacefillingProportional: notSpacefillingNotProportional;
  }
}
