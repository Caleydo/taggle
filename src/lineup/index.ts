/**
 * Created by Samuel Gratzl on 10.08.2017.
 */
import LineUpRenderer from './LineUpRenderer';
import {columns, data, IColumn} from '../data/index';

function toDesc(col: IColumn): any {
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

export function create(parent: HTMLElement) {
  const r = new LineUpRenderer(parent, data, {});

  columns.map(toDesc).forEach((desc: any) => {
    const col = r.create(desc);
    if (col) {
      r.ranking.push(col);
    }
  });

  setTimeout(() => r.update(), 100);
}
