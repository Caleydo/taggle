/**
 * Created by Samuel Gratzl on 08.08.2017.
 */
import {IRuleSetLike, ruleSets} from './';


export default function createRuleSetChooser(callback: (ruleSet: IRuleSetLike)=>void) {
  const node = document.createElement('div');
  node.innerHTML=`Switch Ruleset: <select>${ruleSets.map((d) => `<option>${d.name}</option>`)}</select>`;
  node.lastElementChild!.addEventListener('change', function (this: HTMLSelectElement) {
    const index = Math.max(this.selectedIndex, 0);
    const rule = ruleSets[index]!;
    callback(rule);
  });
  return node;
}
